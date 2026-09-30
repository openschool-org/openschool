package mailer

import (
	"fmt"
	"net/mail"
	"os"
	"strings"
)

const (
	ProviderResend  = "resend"
	ProviderSMTP    = "smtp"
	ProviderConsole = "console"
)

// defaultFromName is shown in the inbox when the sender address has no display name.
const defaultFromName = "OpenSchool"

// Config is the mail setup read once at startup.
type Config struct {
	Provider string
	From     mail.Address
	// ReplyTo overrides the school's own email as the reply address.
	ReplyTo string
	// RedirectTo sends every email to this one inbox, for testing without a verified domain.
	RedirectTo string

	resendKey                                  string
	smtpHost, smtpPort, smtpUser, smtpPassword string
}

// ConfigFromEnv reads MAIL_* and SMTP_* settings. MAIL_PROVIDER picks the provider;
// without it, RESEND_API_KEY means resend, SMTP_HOST means smtp, and nothing means console.
func ConfigFromEnv() (Config, error) {
	cfg := Config{
		resendKey:    strings.TrimSpace(os.Getenv("RESEND_API_KEY")),
		smtpHost:     strings.TrimSpace(os.Getenv("SMTP_HOST")),
		smtpPort:     envOr("SMTP_PORT", "587"),
		smtpUser:     os.Getenv("SMTP_USERNAME"),
		smtpPassword: os.Getenv("SMTP_PASSWORD"),
	}

	cfg.Provider = strings.ToLower(strings.TrimSpace(os.Getenv("MAIL_PROVIDER")))
	if cfg.Provider == "" {
		switch {
		case cfg.resendKey != "":
			cfg.Provider = ProviderResend
		case cfg.smtpHost != "":
			cfg.Provider = ProviderSMTP
		default:
			cfg.Provider = ProviderConsole
		}
	}
	switch cfg.Provider {
	case ProviderResend:
		if cfg.resendKey == "" {
			return Config{}, fmt.Errorf("MAIL_PROVIDER=resend needs RESEND_API_KEY")
		}
	case ProviderSMTP:
		if cfg.smtpHost == "" {
			return Config{}, fmt.Errorf("MAIL_PROVIDER=smtp needs SMTP_HOST")
		}
	case ProviderConsole:
	default:
		return Config{}, fmt.Errorf("MAIL_PROVIDER must be resend, smtp or console, not %q", cfg.Provider)
	}

	// MAIL_FROM may carry a display name ("OpenSchool <no-reply@school.lk>"); SMTP_FROM is the older setting.
	from, err := mail.ParseAddress(envOr("MAIL_FROM", envOr("SMTP_FROM", "no-reply@openschool.local")))
	if err != nil {
		return Config{}, fmt.Errorf("MAIL_FROM is not a valid address: %w", err)
	}
	if from.Name == "" {
		from.Name = defaultFromName
	}
	cfg.From = *from

	if cfg.ReplyTo, err = optionalAddress("MAIL_REPLY_TO"); err != nil {
		return Config{}, err
	}
	if cfg.RedirectTo, err = optionalAddress("MAIL_REDIRECT_TO"); err != nil {
		return Config{}, err
	}
	return cfg, nil
}

// CheckProduction refuses settings that are only safe on a developer machine.
func (c Config) CheckProduction() error {
	if c.Provider == ProviderConsole {
		return fmt.Errorf("an email provider is required in production: set RESEND_API_KEY or SMTP_HOST, or reset links would only reach the server log")
	}
	if c.RedirectTo != "" {
		return fmt.Errorf("MAIL_REDIRECT_TO is for testing only and must be empty in production")
	}
	return nil
}

func optionalAddress(key string) (string, error) {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return "", nil
	}
	addr, err := mail.ParseAddress(v)
	if err != nil {
		return "", fmt.Errorf("%s is not a valid address: %w", key, err)
	}
	return addr.Address, nil
}

func envOr(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}
