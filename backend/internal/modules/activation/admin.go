package activation

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
)

// maxBatchSize keeps one generation run, and its printable sheet, a sensible size.
const maxBatchSize = 5000

func (s *Service) Settings(ctx context.Context) (Settings, error) {
	return s.store.settings(ctx)
}

func (s *Service) UpdateSettings(ctx context.Context, next Settings, actor uuid.UUID) (Settings, error) {
	if next.CodeTTLDays < 1 || next.CodeTTLDays > 90 {
		return Settings{}, ErrInvalidSettings
	}
	if next.OpensAt != nil && next.ClosesAt != nil && !next.ClosesAt.After(*next.OpensAt) {
		return Settings{}, ErrInvalidSettings
	}
	before, err := s.store.settings(ctx)
	if err != nil {
		return Settings{}, err
	}
	saved, err := s.store.updateSettings(ctx, next)
	if err != nil {
		return Settings{}, err
	}
	if s.audit != nil {
		_ = s.audit.Record(ctx, "activation_settings", uuid.Nil, "settings_updated", actor, before, saved, "")
	}
	return saved, nil
}

// Generate issues a fresh code to every matching record without a login, revoking any code it had.
func (s *Service) Generate(ctx context.Context, req GenerateRequest, actor uuid.UUID) (GenerateResponse, error) {
	settings, err := s.store.settings(ctx)
	if err != nil {
		return GenerateResponse{}, err
	}
	if !supportedRoles[req.Role] || !settings.enabled(req.Role) {
		return GenerateResponse{}, ErrRoleDisabled
	}
	targets, err := s.store.targets(ctx, req.Role, req.ClassID, req.RecordID)
	if err != nil {
		return GenerateResponse{}, err
	}
	if len(targets) > maxBatchSize {
		return GenerateResponse{}, ErrBatchTooLarge
	}

	batchID := uuid.New()
	expiresAt := s.now().Add(time.Duration(settings.CodeTTLDays) * 24 * time.Hour)
	resp := GenerateResponse{BatchID: batchID, Role: req.Role, ExpiresAt: expiresAt, Codes: make([]IssuedCode, 0, len(targets))}
	if len(targets) == 0 {
		return resp, nil
	}
	codes := make([]newCode, 0, len(targets))
	for _, t := range targets {
		code, err := newActivationCode(s.random)
		if err != nil {
			return GenerateResponse{}, err
		}
		hash := hashSecret(normalizeCode(code))
		var sealed []byte
		if s.cipher != nil {
			if sealed, err = s.cipher.encrypt(code, hash); err != nil {
				return GenerateResponse{}, fmt.Errorf("encrypt activation code: %w", err)
			}
		}
		codes = append(codes, newCode{RecordID: t.ID, Hash: hash, Encrypted: sealed})
		resp.Codes = append(resp.Codes, IssuedCode{
			Name: t.Name, Detail: t.Detail, Code: code, Index: t.Index,
			ClassName: t.ClassName, GradeName: t.GradeName, GradeOrder: t.GradeOrder, FormTeacher: t.FormTeacher,
		})
	}
	if err := s.store.issueCodes(ctx, batchID, req.Role, codes, expiresAt, actor); err != nil {
		return GenerateResponse{}, err
	}
	if s.audit != nil {
		_ = s.audit.Record(ctx, "activation_batch", batchID, "codes_generated", actor, nil, struct {
			Role    string     `json:"role"`
			Count   int        `json:"count"`
			ClassID *uuid.UUID `json:"class_id,omitempty"`
		}{req.Role, len(codes), req.ClassID}, "")
	}
	return resp, nil
}

func (s *Service) Batches(ctx context.Context) ([]Batch, error) {
	return s.store.batches(ctx)
}

// BatchCodes reopens a batch's unused codes for printing again. Every view is audited.
func (s *Service) BatchCodes(ctx context.Context, batchID, actor uuid.UUID) (GenerateResponse, error) {
	if s.cipher == nil {
		return GenerateResponse{}, ErrReprintDisabled
	}
	role, expires, stored, err := s.store.batchCodes(ctx, batchID)
	if err != nil {
		return GenerateResponse{}, err
	}
	resp := GenerateResponse{BatchID: batchID, Role: role, ExpiresAt: expires, Codes: make([]IssuedCode, 0, len(stored))}
	for _, st := range stored {
		code, err := s.cipher.decrypt(st.Encrypted, st.Hash)
		if err != nil {
			// A code sealed under an older key cannot be shown; skip it rather than fail the batch.
			slog.Warn("activation: stored code could not be decrypted", "batch_id", batchID, "error", err)
			continue
		}
		issued := st.IssuedCode
		issued.Code = code
		resp.Codes = append(resp.Codes, issued)
	}
	if s.audit != nil {
		_ = s.audit.Record(ctx, "activation_batch", batchID, "codes_viewed", actor, nil, struct {
			Shown int `json:"shown"`
		}{len(resp.Codes)}, "")
	}
	return resp, nil
}

// RevokeBatch cancels every unused code in a batch, for example when a printed sheet goes missing.
func (s *Service) RevokeBatch(ctx context.Context, batchID, actor uuid.UUID) (int64, error) {
	n, err := s.store.revokeBatch(ctx, batchID)
	if err != nil {
		return 0, err
	}
	if s.audit != nil {
		_ = s.audit.Record(ctx, "activation_batch", batchID, "codes_revoked", actor, nil, struct {
			Revoked int64 `json:"revoked"`
		}{n}, "")
	}
	return n, nil
}
