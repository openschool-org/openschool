package emails

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/openschool-org/openschool/internal/mailer"
)

type captureMailer struct{ msgs []mailer.Message }

func (c *captureMailer) Send(_ context.Context, msg mailer.Message) error {
	c.msgs = append(c.msgs, msg)
	return nil
}

type staticBrand struct {
	b   Branding
	err error
}

func (s staticBrand) Branding(context.Context) (Branding, error) { return s.b, s.err }

func newTestSender(cfg mailer.Config, brand BrandingSource) (*Sender, *captureMailer) {
	capture := &captureMailer{}
	s := NewSender(capture, cfg, brand)
	s.frontend = func() string { return "https://school.example" }
	s.now = func() time.Time { return time.Date(2026, 9, 30, 10, 0, 0, 0, time.UTC) }
	return s, capture
}

var royal = Branding{SchoolName: "Royal College", Phone: "011 234 5678", Email: "office@royal.example"}

func TestActivationLinkIsBrandedWithInlineLogo(t *testing.T) {
	s, capture := newTestSender(mailer.Config{}, staticBrand{b: royal})
	if err := s.ActivationLink(context.Background(), "nimali@example.com", "H.A.N. Perera", "https://school.example/activate#token=abc", 30*time.Minute); err != nil {
		t.Fatal(err)
	}
	msg := capture.msgs[0]
	for _, want := range []string{"Royal College", "Dear H.A.N. Perera,", "Choose your password", "https://school.example/activate#token=abc", "30 minutes", "cid:openschool-logo", "011 234 5678"} {
		if !strings.Contains(msg.HTML, want) {
			t.Errorf("HTML missing %q", want)
		}
	}
	if !strings.Contains(msg.Text, "Choose your password: https://school.example/activate#token=abc") {
		t.Errorf("text version missing the link:\n%s", msg.Text)
	}
	if msg.To != "nimali@example.com" || msg.ReplyTo != "office@royal.example" || msg.IdempotencyKey == "" {
		t.Fatalf("to %q reply-to %q key %q", msg.To, msg.ReplyTo, msg.IdempotencyKey)
	}
	if len(msg.Inline) != 1 || msg.Inline[0].ContentType != "image/png" || len(msg.Inline[0].Data) == 0 {
		t.Fatal("logo not attached inline")
	}
	if strings.Contains(msg.HTML, "Test mode") {
		t.Fatal("test banner shown outside test mode")
	}
}

func TestRedirectSendsToTestInboxWithBanner(t *testing.T) {
	s, capture := newTestSender(mailer.Config{RedirectTo: "me@example.com", ReplyTo: "help@example.com"}, staticBrand{b: royal})
	if err := s.PasswordChanged(context.Background(), "teacher@example.com"); err != nil {
		t.Fatal(err)
	}
	msg := capture.msgs[0]
	if msg.To != "me@example.com" || msg.ReplyTo != "help@example.com" {
		t.Fatalf("to %q reply-to %q", msg.To, msg.ReplyTo)
	}
	if !strings.Contains(msg.HTML, "this email was meant for teacher@example.com") || !strings.Contains(msg.Text, "meant for teacher@example.com") {
		t.Fatal("test banner missing")
	}
}

func TestUserTextIsEscaped(t *testing.T) {
	s, capture := newTestSender(mailer.Config{}, staticBrand{b: Branding{SchoolName: `<script>alert(1)</script>`}})
	if err := s.AccountActivated(context.Background(), "a@example.com", `<b>Eve</b>`, "2026/0001"); err != nil {
		t.Fatal(err)
	}
	if html := capture.msgs[0].HTML; strings.Contains(html, "<script>") || strings.Contains(html, "<b>Eve") {
		t.Fatal("school or person name was not escaped")
	}
}

func TestMissingSchoolFallsBackToOpenSchool(t *testing.T) {
	s, capture := newTestSender(mailer.Config{}, staticBrand{err: errors.New("db down")})
	if err := s.EmailInUse(context.Background(), "a@example.com"); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(capture.msgs[0].HTML, "OpenSchool") || capture.msgs[0].ReplyTo != "" {
		t.Fatal("fallback branding not applied")
	}
}

func TestEveryTemplatePreviewsWithEmbeddedLogo(t *testing.T) {
	s, _ := newTestSender(mailer.Config{Provider: "smtp"}, staticBrand{b: royal})
	for _, tpl := range s.Templates() {
		p, err := s.Preview(context.Background(), tpl.Key)
		if err != nil {
			t.Fatalf("%s: %v", tpl.Key, err)
		}
		if p.Subject == "" || !strings.Contains(p.HTML, "data:image/png;base64,") || !strings.Contains(p.Text, "Royal College") {
			t.Fatalf("%s preview incomplete", tpl.Key)
		}
	}
	if _, err := s.Preview(context.Background(), "nope"); !errors.Is(err, ErrUnknownTemplate) {
		t.Fatalf("unknown key: err = %v", err)
	}
}

func TestGreetingFallsBackToAFormalSalutation(t *testing.T) {
	s, capture := newTestSender(mailer.Config{}, staticBrand{b: royal})
	if err := s.AccountActivated(context.Background(), "a@example.com", "", "2026/0001"); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(capture.msgs[0].HTML, "Dear student or guardian,") {
		t.Fatal("without a name the greeting must stay formal")
	}
}
