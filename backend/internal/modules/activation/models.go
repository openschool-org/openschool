// Package activation lets students and parents claim a login for a record the school already holds.
package activation

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/authz"
)

var (
	// ErrClosed means self-activation is switched off or outside its window for that role.
	ErrClosed = errors.New("account activation is not open for this account type right now")
	// ErrLinkInvalid covers unknown, used and expired email links, and codes that stopped being usable.
	ErrLinkInvalid = errors.New("this activation link is invalid, already used, or has expired - start again from the activation page")
	// ErrAlreadyActivated means the record got a login by another route since the code was issued.
	ErrAlreadyActivated = errors.New("this account is already active - sign in or use Forgot password")
	// ErrEmailTaken means another account already uses the email.
	ErrEmailTaken = errors.New("that email is already used by another account - start again with a different email")
	// ErrPasswordMatchesID blocks reusing the index or NIC number, which other people can see.
	ErrPasswordMatchesID = errors.New("your password must not be your index or NIC number")
	// ErrRoleDisabled blocks issuing codes for a role that is switched off in settings.
	ErrRoleDisabled = errors.New("turn on self-activation for this account type before generating codes")
	// ErrBatchTooLarge asks the admin to narrow the selection, for example to one class.
	ErrBatchTooLarge = errors.New("too many records in one batch - generate codes class by class")
	// ErrInvalidSettings covers a bad window or code lifetime.
	ErrInvalidSettings = errors.New("the closing date must be after the opening date, and codes must last 1 to 90 days")
)

// supportedRoles are the roles that can self-activate; teacher records always carry a login today.
var supportedRoles = map[string]bool{authz.RoleStudent: true, authz.RoleParent: true}

// Settings is the single activation_settings row.
type Settings struct {
	StudentEnabled bool       `json:"student_enabled"`
	ParentEnabled  bool       `json:"parent_enabled"`
	OpensAt        *time.Time `json:"opens_at"`
	ClosesAt       *time.Time `json:"closes_at"`
	CodeTTLDays    int        `json:"code_ttl_days" binding:"required,min=1,max=90"`
}

// enabled reports whether the role is switched on, ignoring the window.
func (s Settings) enabled(role string) bool {
	switch role {
	case authz.RoleStudent:
		return s.StudentEnabled
	case authz.RoleParent:
		return s.ParentEnabled
	}
	return false
}

// openFor reports whether the role is switched on and now is inside the window.
func (s Settings) openFor(role string, now time.Time) bool {
	if !s.enabled(role) {
		return false
	}
	if s.OpensAt != nil && now.Before(*s.OpensAt) {
		return false
	}
	return s.ClosesAt == nil || now.Before(*s.ClosesAt)
}

// Status is the public view of which roles can activate now.
type Status struct {
	Student bool `json:"student"`
	Parent  bool `json:"parent"`
}

// StartRequest is step one: the printed code, the person's own identifier and the email they want to use.
type StartRequest struct {
	Role       string `json:"role" binding:"required,oneof=student parent"`
	Code       string `json:"code" binding:"required,max=32"`
	Identifier string `json:"identifier" binding:"required,max=50"`
	Email      string `json:"email" binding:"required,email,max=255"`
}

// CompleteRequest is step two: the emailed token and the chosen password.
type CompleteRequest struct {
	Token       string `json:"token" binding:"required,max=128"`
	NewPassword string `json:"new_password" binding:"required,min=10,max=128"`
}

// GenerateRequest picks which records get new codes; with no filter it covers every record without a login.
type GenerateRequest struct {
	Role     string     `json:"role" binding:"required,oneof=student parent"`
	ClassID  *uuid.UUID `json:"class_id"`
	RecordID *uuid.UUID `json:"record_id"`
}

// IssuedCode is one row of the printable sheet; the plain code is only ever returned here.
type IssuedCode struct {
	Name string `json:"name"`
	// Detail is the children's names for a parent code, empty for a student.
	Detail string `json:"detail"`
	Code   string `json:"code"`
	// Index is the student's index number, for the class teacher's hand-out list; never printed on a slip.
	Index      string `json:"index_number,omitempty"`
	ClassName  string `json:"class_name"`
	GradeName  string `json:"grade_name"`
	GradeOrder int    `json:"grade_order"`
	// FormTeacher heads the class hand-out list, so the sheet reaches the right person.
	FormTeacher string `json:"form_teacher"`
}

// GenerateResponse carries the new batch; codes cannot be shown again later.
type GenerateResponse struct {
	BatchID   uuid.UUID    `json:"batch_id"`
	Role      string       `json:"role"`
	ExpiresAt time.Time    `json:"expires_at"`
	Codes     []IssuedCode `json:"codes"`
}

// Batch summarises one generation run.
type Batch struct {
	BatchID   uuid.UUID `json:"batch_id"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
	ExpiresAt time.Time `json:"expires_at"`
	Total     int64     `json:"total"`
	Used      int64     `json:"used"`
	Revoked   int64     `json:"revoked"`
	Expired   int64     `json:"expired"`
	// Reprintable counts unused codes that can be shown again as PDF or CSV.
	Reprintable int64 `json:"reprintable"`
}

// codeRecord is a usable code joined to the record it activates.
type codeRecord struct {
	ID          uuid.UUID
	Role        string
	RecordID    uuid.UUID
	Identifier  string
	HasLogin    bool
	LockedUntil *time.Time
}

// target is a record that can receive a code, with the class its sheet is filed under.
type target struct {
	ID          uuid.UUID
	Name        string
	Detail      string
	Index       string
	ClassName   string
	GradeName   string
	GradeOrder  int
	FormTeacher string
}

// personName holds the three forms of a Sri Lankan name kept on a record.
type personName struct {
	Full, WithInitials, Calling string
}

// newCode is one hashed code ready to insert; Encrypted is empty when reprinting is off.
type newCode struct {
	RecordID  uuid.UUID
	Hash      string
	Encrypted []byte
}

// storedCode is an unused code read back for reprinting, still encrypted.
type storedCode struct {
	Hash      string
	Encrypted []byte
	IssuedCode
}
