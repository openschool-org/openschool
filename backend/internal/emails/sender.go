package emails

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/mailer"
)

// ErrUnknownTemplate is returned by Preview and SendTest for a key not in Templates.
var ErrUnknownTemplate = errors.New("unknown email template")

// BrandingSource supplies the school name and contact details, read at send time so edits apply at once.
type BrandingSource interface {
	Branding(ctx context.Context) (Branding, error)
}

// Sender renders and sends every account email.
type Sender struct {
	mail     mailer.Mailer
	cfg      mailer.Config
	brand    BrandingSource
	now      func() time.Time
	frontend func() string
}

func NewSender(mail mailer.Mailer, cfg mailer.Config, brand BrandingSource) *Sender {
	return &Sender{mail: mail, cfg: cfg, brand: brand, now: time.Now, frontend: mailer.FrontendURL}
}

func (s *Sender) branding(ctx context.Context) Branding {
	b, err := s.brand.Branding(ctx)
	if err != nil {
		slog.Warn("emails: school details unavailable, using defaults", "error", err)
	}
	if b.SchoolName == "" {
		b.SchoolName = "OpenSchool"
	}
	return b
}

func (s *Sender) signInURL() string { return s.frontend() + "/signin" }

// send applies test-mode redirection and the reply-to address, then delivers.
func (s *Sender) send(ctx context.Context, to string, build func(Branding) email) error {
	brand := s.branding(ctx)
	testRecipient := ""
	if s.cfg.RedirectTo != "" {
		testRecipient, to = to, s.cfg.RedirectTo
	}
	msg, err := render(build(brand), brand, testRecipient, true)
	if err != nil {
		return err
	}
	msg.To = to
	msg.ReplyTo = s.cfg.ReplyTo
	if msg.ReplyTo == "" {
		msg.ReplyTo = brand.Email
	}
	msg.IdempotencyKey = uuid.NewString()
	return s.mail.Send(ctx, msg)
}

func (s *Sender) ActivationLink(ctx context.Context, to, nameWithInitials, link string, ttl time.Duration) error {
	return s.send(ctx, to, func(b Branding) email { return activationLinkEmail(b.SchoolName, nameWithInitials, link, ttl) })
}

func (s *Sender) EmailInUse(ctx context.Context, to string) error {
	return s.send(ctx, to, func(b Branding) email { return emailInUseEmail(b.SchoolName, s.signInURL()) })
}

func (s *Sender) AccountActivated(ctx context.Context, to, nameWithInitials, username string) error {
	return s.send(ctx, to, func(b Branding) email {
		return accountActivatedEmail(b.SchoolName, nameWithInitials, username, s.signInURL(), s.now())
	})
}

func (s *Sender) PasswordReset(ctx context.Context, to, link string, ttl time.Duration) error {
	return s.send(ctx, to, func(b Branding) email { return passwordResetEmail(b.SchoolName, link, ttl) })
}

func (s *Sender) PasswordChanged(ctx context.Context, to string) error {
	return s.send(ctx, to, func(b Branding) email { return passwordChangedEmail(b.SchoolName, s.signInURL(), s.now()) })
}

// Template is one previewable email.
type Template struct {
	Key  string `json:"key"`
	Name string `json:"name"`
}

// Preview is a rendered sample, with the logo embedded so a browser can show it.
type Preview struct {
	Subject string `json:"subject"`
	HTML    string `json:"html"`
	Text    string `json:"text"`
}

// Status describes the active mail settings for the admin screen; it never includes secrets.
type Status struct {
	Provider   string `json:"provider"`
	From       string `json:"from"`
	ReplyTo    string `json:"reply_to"`
	RedirectTo string `json:"redirect_to"`
}

type sample struct {
	name  string
	build func(s *Sender, b Branding) email
}

// samples use made-up people and links so previews and test sends never touch real accounts.
var samples = []struct {
	key string
	sample
}{
	{"activation_link", sample{"Activation link", func(s *Sender, b Branding) email {
		return activationLinkEmail(b.SchoolName, "H.A.N. Perera", s.frontend()+"/activate#token=example", 30*time.Minute)
	}}},
	{"email_in_use", sample{"Email already in use", func(s *Sender, b Branding) email {
		return emailInUseEmail(b.SchoolName, s.signInURL())
	}}},
	{"account_activated", sample{"Account activated", func(s *Sender, b Branding) email {
		return accountActivatedEmail(b.SchoolName, "H.A.N. Perera", "2026/0001", s.signInURL(), s.now())
	}}},
	{"password_reset", sample{"Password reset", func(s *Sender, b Branding) email {
		return passwordResetEmail(b.SchoolName, s.frontend()+"/reset-password#token=example", 15*time.Minute)
	}}},
	{"password_changed", sample{"Password changed", func(s *Sender, b Branding) email {
		return passwordChangedEmail(b.SchoolName, s.signInURL(), s.now())
	}}},
	{"test", sample{"Test email", func(s *Sender, _ Branding) email {
		return testEmail(s.cfg.Provider, s.cfg.From.String(), s.now())
	}}},
}

func findSample(key string) (sample, bool) {
	for _, entry := range samples {
		if entry.key == key {
			return entry.sample, true
		}
	}
	return sample{}, false
}

func (s *Sender) Templates() []Template {
	out := make([]Template, len(samples))
	for i, entry := range samples {
		out[i] = Template{Key: entry.key, Name: entry.name}
	}
	return out
}

func (s *Sender) Preview(ctx context.Context, key string) (Preview, error) {
	smp, ok := findSample(key)
	if !ok {
		return Preview{}, ErrUnknownTemplate
	}
	brand := s.branding(ctx)
	// In test mode the preview shows the banner a redirected email would carry.
	testRecipient := ""
	if s.cfg.RedirectTo != "" {
		testRecipient = "nimali@example.com"
	}
	msg, err := render(smp.build(s, brand), brand, testRecipient, false)
	if err != nil {
		return Preview{}, err
	}
	return Preview{Subject: msg.Subject, HTML: msg.HTML, Text: msg.Text}, nil
}

// SendTest sends a sample to the given address (or the test-mode inbox).
func (s *Sender) SendTest(ctx context.Context, key, to string) error {
	smp, ok := findSample(key)
	if !ok {
		return ErrUnknownTemplate
	}
	return s.send(ctx, to, func(b Branding) email { return smp.build(s, b) })
}

func (s *Sender) Status() Status {
	return Status{Provider: s.cfg.Provider, From: s.cfg.From.String(), ReplyTo: s.cfg.ReplyTo, RedirectTo: s.cfg.RedirectTo}
}
