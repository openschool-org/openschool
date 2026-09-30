package mailer

import (
	"context"
	"encoding/json"
	"io"
	"mime"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/mail"
	"strings"
	"testing"
)

func sampleMessage() Message {
	return Message{
		To: "nimali@example.com", Subject: "Activate your account ✓", Text: "Plain body", HTML: `<p>Hi</p><img src="cid:logo">`,
		ReplyTo: "office@school.example", Inline: []Inline{{ContentID: "logo", Filename: "logo.png", ContentType: "image/png", Data: []byte("png-bytes")}},
	}
}

func TestBuildMessageHasTextHTMLAndInlineLogo(t *testing.T) {
	from := mail.Address{Name: "OpenSchool", Address: "onboarding@resend.dev"}
	raw, err := buildMessage(from, mail.Address{Address: "nimali@example.com"}, sampleMessage())
	if err != nil {
		t.Fatal(err)
	}
	parsed, err := mail.ReadMessage(strings.NewReader(string(raw)))
	if err != nil {
		t.Fatalf("not a valid message: %v", err)
	}
	if got := parsed.Header.Get("From"); got != `"OpenSchool" <onboarding@resend.dev>` {
		t.Fatalf("From = %q", got)
	}
	if subject, _ := new(mime.WordDecoder).DecodeHeader(parsed.Header.Get("Subject")); subject != "Activate your account ✓" {
		t.Fatalf("Subject = %q", subject)
	}
	if parsed.Header.Get("Reply-To") != "office@school.example" {
		t.Fatal("Reply-To missing")
	}
	_, params, _ := mime.ParseMediaType(parsed.Header.Get("Content-Type"))
	outer := multipart.NewReader(parsed.Body, params["boundary"])
	first, _ := outer.NextPart()
	if !strings.HasPrefix(first.Header.Get("Content-Type"), "text/plain") {
		t.Fatalf("first part = %s", first.Header.Get("Content-Type"))
	}
	second, _ := outer.NextPart()
	mediaType, relParams, _ := mime.ParseMediaType(second.Header.Get("Content-Type"))
	if mediaType != "multipart/related" {
		t.Fatalf("second part = %s", mediaType)
	}
	related := multipart.NewReader(second, relParams["boundary"])
	html, _ := related.NextPart()
	body, _ := io.ReadAll(html)
	if !strings.Contains(string(body), `cid:logo`) {
		t.Fatalf("html part = %q", body)
	}
	img, err := related.NextPart()
	if err != nil || img.Header.Get("Content-Id") != "<logo>" {
		t.Fatalf("inline image part missing: %v", err)
	}
}

func TestSendersRejectHeaderInjection(t *testing.T) {
	msg := sampleMessage()
	msg.Subject = "Hi\r\nBcc: victim@example.com"
	for _, m := range []Mailer{consoleMailer{}, &smtpMailer{}, newResendMailer("key", "a@b.c")} {
		if err := m.Send(context.Background(), msg); err != errHeaderInjection {
			t.Fatalf("%T: err = %v, want header injection error", m, err)
		}
	}
}

func TestResendRetriesRateLimitWithSameIdempotencyKey(t *testing.T) {
	var calls int
	var keys []string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		keys = append(keys, r.Header.Get("Idempotency-Key"))
		if r.Header.Get("Authorization") != "Bearer re_test" {
			t.Errorf("missing bearer key")
		}
		var body resendRequest
		_ = json.NewDecoder(r.Body).Decode(&body)
		if len(body.Attachments) != 1 || body.Attachments[0].ContentID != "logo" || body.ReplyTo != "office@school.example" {
			t.Errorf("unexpected body: %+v", body)
		}
		if calls == 1 {
			w.WriteHeader(http.StatusTooManyRequests)
			return
		}
		_, _ = w.Write([]byte(`{"id":"email-1"}`))
	}))
	defer server.Close()

	m := newResendMailer("re_test", "OpenSchool <onboarding@resend.dev>")
	m.endpoint, m.backoff = server.URL, 0
	msg := sampleMessage()
	msg.IdempotencyKey = "key-1"
	if err := m.Send(context.Background(), msg); err != nil {
		t.Fatalf("Send() error = %v", err)
	}
	if calls != 2 || keys[0] != "key-1" || keys[1] != "key-1" {
		t.Fatalf("calls = %d, keys = %v", calls, keys)
	}
}

func TestResendDoesNotRetryRejectedRequest(t *testing.T) {
	calls := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		calls++
		w.WriteHeader(http.StatusUnprocessableEntity)
		_, _ = w.Write([]byte(`{"message":"secret detail"}`))
	}))
	defer server.Close()
	m := newResendMailer("re_test", "a@b.c")
	m.endpoint, m.backoff = server.URL, 0
	err := m.Send(context.Background(), sampleMessage())
	if err == nil || calls != 1 || strings.Contains(err.Error(), "secret detail") {
		t.Fatalf("err = %v, calls = %d", err, calls)
	}
}

func TestConfigFromEnv(t *testing.T) {
	t.Setenv("SMTP_HOST", "smtp.resend.com")
	t.Setenv("SMTP_FROM", "onboarding@resend.dev")
	t.Setenv("MAIL_REDIRECT_TO", "Tester <me@example.com>")
	cfg, err := ConfigFromEnv()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Provider != ProviderSMTP || cfg.From.String() != `"OpenSchool" <onboarding@resend.dev>` || cfg.RedirectTo != "me@example.com" {
		t.Fatalf("cfg = %+v", cfg)
	}
	if cfg.CheckProduction() == nil {
		t.Fatal("a test redirect must be refused in production")
	}

	t.Setenv("MAIL_PROVIDER", "resend")
	if _, err := ConfigFromEnv(); err == nil {
		t.Fatal("resend without RESEND_API_KEY must fail")
	}
	t.Setenv("MAIL_PROVIDER", "")
	t.Setenv("SMTP_HOST", "")
	t.Setenv("MAIL_REDIRECT_TO", "")
	cfg, _ = ConfigFromEnv()
	if cfg.Provider != ProviderConsole || cfg.CheckProduction() == nil {
		t.Fatal("console provider must be refused in production")
	}
}
