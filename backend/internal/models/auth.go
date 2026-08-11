package models

// ForgotPasswordRequest identifies the caller by their login identifier
// (email — every role that can self-serve a reset has one on file) plus a
// secondary secret that matches whatever was set as their initial default
// password (Phase 8.2): NIC number for teacher/parent, index number for
// student. Admin is intentionally not accepted here — there's no secondary
// secret on file for an admin account, so admins fall back to the
// authenticated change-password flow instead.
type ForgotPasswordRequest struct {
	Role       string `json:"role" binding:"required,oneof=teacher student parent"`
	Identifier string `json:"identifier" binding:"required"`
	Secret     string `json:"secret" binding:"required"`
}

// ForgotPasswordResponse deliberately carries no token or other secret — the
// reset link is delivered out-of-band by email. See docs audit C-1.
type ForgotPasswordResponse struct {
	Message string `json:"message"`
}

// ResetPasswordRequest sets a new password using the one-time token minted
// by ForgotPassword — the unauthenticated counterpart to ChangePassword.
type ResetPasswordRequest struct {
	Token       string `json:"token" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=8"`
}

// ChangePasswordRequest is used both by the signed-in "Change password"
// profile action and by the first-login "Set a new password" choice (Phase
// 8.3) — both already have an authenticated session, so neither needs a
// reset token.
type ChangePasswordRequest struct {
	NewPassword string `json:"new_password" binding:"required,min=8"`
}
