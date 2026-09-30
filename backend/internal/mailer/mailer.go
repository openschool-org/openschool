// Package mailer delivers transactional email (reset and activation links) through SMTP, the Resend API,
// or the server log in development. Only this package knows which provider is in use.
package mailer

import (
	"context"
	"errors"
	"log"
	"os"
	"strings"
)

// Message is one fully rendered email.
type Message struct {
	To      string
	Subject string
	Text    string
	HTML    string
	ReplyTo string
	// Inline images are referenced from the HTML as cid:<ContentID>.
	Inline []Inline
	// IdempotencyKey stops a retried send from delivering twice where the provider supports it.
	IdempotencyKey string
}

// Inline is an image shipped inside the email, so it shows without loading anything from the web.
type Inline struct {
	ContentID   string
	Filename    string
	ContentType string
	Data        []byte
}

// Mailer sends one message; an error means only "could not deliver right now".
type Mailer interface {
	Send(ctx context.Context, msg Message) error
}

var errHeaderInjection = errors.New("mailer: line breaks are not allowed in email headers")

// validateHeaders blocks header injection through a recipient, subject or reply-to value.
func validateHeaders(msg Message) error {
	for _, v := range []string{msg.To, msg.Subject, msg.ReplyTo} {
		if strings.ContainsAny(v, "\r\n") {
			return errHeaderInjection
		}
	}
	return nil
}

// FrontendURL returns the base URL of the frontend app, used to build links in emails.
func FrontendURL() string {
	if v := os.Getenv("FRONTEND_URL"); v != "" {
		return strings.TrimRight(v, "/")
	}
	return "http://localhost:5173"
}

// New builds the Mailer for a validated Config.
func New(cfg Config) Mailer {
	switch cfg.Provider {
	case ProviderResend:
		return newResendMailer(cfg.resendKey, cfg.From.String())
	case ProviderSMTP:
		return &smtpMailer{host: cfg.smtpHost, port: cfg.smtpPort, username: cfg.smtpUser, password: cfg.smtpPassword, from: cfg.From}
	default:
		log.Println("mailer: no email provider configured, emails will be written to the server log")
		return consoleMailer{}
	}
}

// consoleMailer writes the text version to the log instead of sending it; refused in production.
type consoleMailer struct{}

func (consoleMailer) Send(_ context.Context, msg Message) error {
	if err := validateHeaders(msg); err != nil {
		return err
	}
	log.Printf("mailer: not sending (console provider) to=%s subject=%q\n%s", msg.To, msg.Subject, msg.Text)
	return nil
}
