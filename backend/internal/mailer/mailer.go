// Package mailer provides out-of-band delivery of secrets (e.g. password
// reset links) that must not be handed back to the requesting HTTP client.
package mailer

import (
	"context"
	"fmt"
	"log"
	"net"
	"net/smtp"
	"os"
)

// Mailer sends a plain-text email. Send must not leak transport details to
// the caller — callers should treat a returned error as "email could not be
// delivered right now" and log it themselves if they need specifics.
type Mailer interface {
	Send(ctx context.Context, to, subject, body string) error
}

// FrontendURL returns the base URL of the frontend app, used to build links
// (e.g. a password-reset link) that get emailed to users.
func FrontendURL() string {
	if v := os.Getenv("FRONTEND_URL"); v != "" {
		return v
	}
	return "http://localhost:5173"
}

// NewFromEnv builds a Mailer from SMTP_* env vars. If SMTP_HOST isn't set —
// e.g. a fresh dev checkout that hasn't configured outbound mail yet — it
// falls back to logging the message instead of failing every password-reset
// request outright, mirroring how other optional config in this codebase
// (CORS_ORIGINS, API_RATE_LIMIT_*) degrades to a sane default rather than
// erroring.
func NewFromEnv() Mailer {
	host := os.Getenv("SMTP_HOST")
	if host == "" {
		log.Println("mailer: SMTP_HOST not set — emails will be logged instead of sent")
		return &consoleMailer{}
	}

	port := os.Getenv("SMTP_PORT")
	if port == "" {
		port = "587"
	}

	from := os.Getenv("SMTP_FROM")
	if from == "" {
		from = "no-reply@openschool.local"
	}

	return &smtpMailer{
		host:     host,
		port:     port,
		username: os.Getenv("SMTP_USERNAME"),
		password: os.Getenv("SMTP_PASSWORD"),
		from:     from,
	}
}

type smtpMailer struct {
	host, port, username, password, from string
}

func (m *smtpMailer) Send(_ context.Context, to, subject, body string) error {
	addr := net.JoinHostPort(m.host, m.port)

	var auth smtp.Auth
	if m.username != "" {
		auth = smtp.PlainAuth("", m.username, m.password, m.host)
	}

	msg := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nContent-Type: text/plain; charset=\"UTF-8\"\r\n\r\n%s\r\n",
		m.from, to, subject, body)

	if err := smtp.SendMail(addr, auth, m.from, []string{to}, []byte(msg)); err != nil {
		return fmt.Errorf("mailer: send via %s failed: %w", addr, err)
	}
	return nil
}

// consoleMailer is the no-SMTP-configured fallback: it logs the email body
// instead of delivering it, so local dev / early setup doesn't require a
// mail server just to exercise the password-reset flow.
type consoleMailer struct{}

func (consoleMailer) Send(_ context.Context, to, subject, body string) error {
	log.Printf("mailer: SMTP not configured, not sending email — to=%s subject=%q\n%s", to, subject, body)
	return nil
}
