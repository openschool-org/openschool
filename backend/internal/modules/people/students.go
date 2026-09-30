package people

import (
	"context"
	"errors"
	"fmt"
	"log"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/openschool-org/openschool/internal/authz"
	"github.com/openschool-org/openschool/internal/idp"
	"github.com/openschool-org/openschool/internal/ports"
	"github.com/openschool-org/openschool/internal/validation"
)

var ErrGenderMismatchSchoolType = errors.New("student gender does not match the school's single-sex type")

// ErrStudentNotFound lets the erase route distinguish "no such student" (404)
// from a wrapped database error, which must go through apierror.RespondInternal
// instead of being echoed to the client (S4).
var ErrStudentNotFound = errors.New("student not found")

type studentRecord struct {
	ID            uuid.UUID
	UserID        uuid.UUID
	IndexNumber   string
	Email         string
	FullName      string
	Phone         pgtype.Text
	Whatsapp      pgtype.Text
	Address       pgtype.Text
	SpecialRemark pgtype.Text
	Gender        pgtype.Text
}

type studentStore interface {
	Create(context.Context, studentCreate) (any, error)
	GetStudentRecord(context.Context, uuid.UUID) (studentRecord, error)
	GetUser(context.Context, uuid.UUID) (studentUser, error)
	FindByIndex(context.Context, string) error
	Update(context.Context, uuid.UUID, studentUpdate) (any, error)
	UpdateStatus(context.Context, uuid.UUID, string) (any, error)
	Delete(context.Context, uuid.UUID) error
	CreateStudentUser(context.Context, studentUserCreate) error
	DeleteUser(context.Context, uuid.UUID) error
	// AnonymizeProfile and EraseUser back Erase (S11's "erase person" flow):
	// the profile row survives (historical marks/attendance stay
	// attributable) but its personal data doesn't.
	AnonymizeProfile(context.Context, uuid.UUID) error
	EraseUser(context.Context, uuid.UUID) error
}

type schoolTypeReader interface {
	SchoolType(context.Context) (string, error)
}

type studentUser struct{ Email string }
type studentUserCreate struct {
	ID                 uuid.UUID
	Email              string
	FullName           string
	MustChangePassword bool
}
type studentCreate struct {
	UserID, HouseID   uuid.UUID
	FullName, Index   string
	Address, Phone    string
	WhatsApp, Remarks string
	Gender            string
}
type studentUpdate struct {
	FullName, Address, Phone, WhatsApp, Remarks, Gender string
}

// PendingEraser persists a retry record when a post-anonymisation identity
// cleanup step (local scrub or identity-provider deletion) fails, so
// automation.IdentityErasureRetryAgent can pick it back up instead of the
// failure being silently logged and forgotten (S11).
type PendingEraser interface {
	RecordPendingErasure(ctx context.Context, userID uuid.UUID, localDone, idpDone bool, lastErr string) error
}

type StudentService struct {
	store   studentStore
	idp     idp.Provider
	houses  ports.HouseAssignments
	audit   ports.AuditRecorder
	school  schoolTypeReader
	pending PendingEraser
}

func NewStudentService(store studentStore, idp idp.Provider, houses ports.HouseAssignments, audit ports.AuditRecorder, school schoolTypeReader, pending PendingEraser) *StudentService {
	return &StudentService{store: store, idp: idp, houses: houses, audit: audit, school: school, pending: pending}
}

func (s *StudentService) validateGender(ctx context.Context, gender string) error {
	if s.school == nil {
		return nil
	}
	t, err := s.school.SchoolType(ctx)
	if err != nil {
		return nil
	}
	if (t == "boys" && gender != "male") || (t == "girls" && gender != "female") {
		return ErrGenderMismatchSchoolType
	}
	return nil
}

func (s *StudentService) Create(ctx context.Context, req CreateStudentRequest, actor uuid.UUID) (any, error) {
	if !validation.NormalizePhoneField(&req.PhoneNumber) || !validation.NormalizePhoneField(&req.WhatsApp) {
		return nil, validation.ErrInvalidPhone
	}
	if err := s.validateGender(ctx, req.Gender); err != nil {
		return nil, err
	}
	if err := s.store.FindByIndex(ctx, req.IndexNumber); err == nil {
		return nil, fmt.Errorf("index number already exists")
	}
	idpUser, err := s.idp.CreateUser(ctx, authz.RoleStudent, map[string]any{"username": req.IndexNumber, "email": req.Email, "given_name": req.GivenName, "family_name": req.FamilyName, "phone": req.PhoneNumber, "password": req.IndexNumber})
	if err != nil {
		return nil, fmt.Errorf("failed to create identity provider user: %w", err)
	}
	uid, err := uuid.Parse(idpUser.ID)
	if err != nil {
		return nil, fmt.Errorf("invalid identity provider user ID: %w", err)
	}
	rollback := func() { _ = s.idp.DeleteUser(ctx, idpUser.ID); _ = s.store.DeleteUser(ctx, uid) }
	fullName := req.GivenName + " " + req.FamilyName
	if err = s.store.CreateStudentUser(ctx, studentUserCreate{ID: uid, Email: req.Email, FullName: fullName, MustChangePassword: true}); err != nil {
		_ = s.idp.DeleteUser(ctx, idpUser.ID)
		return nil, fmt.Errorf("failed to create user record: %w", err)
	}
	if err = s.idp.AssignRole(ctx, idp.RoleID(authz.RoleStudent), idpUser.ID); err != nil {
		rollback()
		return nil, fmt.Errorf("failed to assign student role: %w", err)
	}
	var house uuid.UUID
	if s.houses != nil {
		house, _ = s.houses.PickForStudent(ctx)
	}
	profile, err := s.store.Create(ctx, studentCreate{UserID: uid, HouseID: house, FullName: fullName, Index: req.IndexNumber, Address: req.Address, Phone: req.PhoneNumber, WhatsApp: req.WhatsApp, Remarks: req.SpecialRemarks, Gender: req.Gender})
	if err != nil {
		rollback()
		return nil, fmt.Errorf("failed to create student profile: %w", err)
	}
	if s.audit != nil {
		_ = s.audit.Record(ctx, "student_account", uid, "account_created", actor, nil, profile, "")
	}
	return profile, nil
}

func (s *StudentService) Update(ctx context.Context, id uuid.UUID, req UpdateStudentRequest) (any, error) {
	if !validation.NormalizePhoneField(&req.PhoneNumber) || !validation.NormalizePhoneField(&req.WhatsApp) {
		return nil, validation.ErrInvalidPhone
	}
	if err := s.validateGender(ctx, req.Gender); err != nil {
		return nil, err
	}
	student, err := s.store.GetStudentRecord(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("student not found")
	}
	user, err := s.store.GetUser(ctx, student.UserID)
	if err != nil {
		return nil, fmt.Errorf("user not found")
	}
	if err := s.idp.UpdateUser(ctx, student.UserID.String(), authz.RoleStudent, map[string]any{"username": student.IndexNumber, "email": user.Email, "given_name": req.GivenName, "family_name": req.FamilyName, "phone": req.PhoneNumber}); err != nil {
		log.Printf("UpdateStudent: failed to update identity provider user: %v", err)
	}
	return s.store.Update(ctx, id, studentUpdate{FullName: req.GivenName + " " + req.FamilyName, Address: req.Address, Phone: req.PhoneNumber, WhatsApp: req.WhatsApp, Remarks: req.SpecialRemarks, Gender: req.Gender})
}

func (s *StudentService) UpdateHouse(ctx context.Context, id uuid.UUID, req UpdateStudentHouseRequest, actor uuid.UUID) (any, error) {
	return s.houses.ChangeStudentHouse(ctx, id, req.HouseID, actor)
}
func (s *StudentService) UpdateStatus(ctx context.Context, id uuid.UUID, status string) (any, error) {
	if status != "active" && status != "left" {
		return nil, fmt.Errorf("invalid status %q — must be active or left", status)
	}
	return s.store.UpdateStatus(ctx, id, status)
}
func (s *StudentService) Delete(ctx context.Context, id, actor uuid.UUID) error {
	student, err := s.store.GetStudentRecord(ctx, id)
	if err != nil {
		return fmt.Errorf("student not found")
	}
	if err = s.store.Delete(ctx, id); err != nil {
		return fmt.Errorf("failed to delete student profile: %w", err)
	}
	if s.audit != nil {
		_ = s.audit.Record(ctx, "student_account", id, "account_deleted", actor, student, nil, "")
	}
	if student.UserID == uuid.Nil {
		return nil
	}
	if err = s.store.DeleteUser(ctx, student.UserID); err != nil {
		return fmt.Errorf("student profile deleted but failed to delete local user record — the account (id %s) can still sign in with no profile and must be removed manually or by retrying this delete: %w", student.UserID, err)
	}
	if err = s.idp.DeleteUser(ctx, student.UserID.String()); err != nil {
		return fmt.Errorf("student profile deleted locally but failed to delete identity provider user (account is now orphaned and must be removed manually): %w", err)
	}
	return nil
}

// Erase anonymises a student's personal data in place (S11's "erase person"
// flow) — unlike Delete, the profile row survives so historical
// marks/attendance stay attributable in aggregate, but the identity
// provider account is removed entirely rather than merely locked. A
// logging or IDP failure here is reported but doesn't roll back the
// anonymisation already committed, since leaving PII in place because a
// secondary step failed would defeat the point of calling this at all.
func (s *StudentService) Erase(ctx context.Context, id, actor uuid.UUID, reason string) error {
	student, err := s.store.GetStudentRecord(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrStudentNotFound
		}
		return fmt.Errorf("failed to get student record: %w", err)
	}

	if err := s.store.AnonymizeProfile(ctx, id); err != nil {
		return fmt.Errorf("failed to anonymise student profile: %w", err)
	}

	if student.UserID != uuid.Nil {
		localErr := s.store.EraseUser(ctx, student.UserID)
		if localErr != nil {
			log.Printf("Erase: profile %s anonymised but failed to scrub local user record %s: %v", id, student.UserID, localErr)
		}
		idpErr := s.idp.DeleteUser(ctx, student.UserID.String())
		if idpErr != nil {
			log.Printf("Erase: profile %s anonymised but failed to delete identity provider user %s: %v", id, student.UserID, idpErr)
		}
		// A local/IDP failure here must not be forgotten: without a retry
		// record, the only trace of it is this log line, and the account's
		// PII can remain indefinitely (S11).
		if (localErr != nil || idpErr != nil) && s.pending != nil {
			lastErr := ""
			if localErr != nil {
				lastErr = localErr.Error()
			} else if idpErr != nil {
				lastErr = idpErr.Error()
			}
			if err := s.pending.RecordPendingErasure(ctx, student.UserID, localErr == nil, idpErr == nil, lastErr); err != nil {
				log.Printf("Erase: profile %s anonymised but failed to record pending erasure for retry, user %s: %v", id, student.UserID, err)
			}
		}
	}

	// A redacted, non-identifying "before" snapshot: the point of erasure is
	// that the student's name, index number, contact details and remarks
	// stop being retrievable, so the audit trail must not become the one
	// place they still are.
	auditBefore := struct{ ID uuid.UUID }{ID: student.ID}
	if s.audit != nil {
		if err := s.audit.Record(ctx, "student_profile", id, "erased", actor, auditBefore, nil, reason); err != nil {
			// The anonymisation already committed and isn't rolled back for
			// this — but the caller must know the erasure has no audit
			// record, rather than being told it fully succeeded (S4).
			return fmt.Errorf("student profile erased but failed to record audit trail: %w", err)
		}
	}
	return nil
}
