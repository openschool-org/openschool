package mailer

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"
)

const resendEndpoint = "https://api.resend.com/emails"

// resendMaxAttempts covers a brief rate limit or outage; the idempotency key makes retries safe.
const resendMaxAttempts = 3

// resendMailer sends through Resend's HTTP API.
type resendMailer struct {
	apiKey   string
	from     string
	endpoint string
	client   *http.Client
	backoff  time.Duration
}

func newResendMailer(apiKey, from string) *resendMailer {
	return &resendMailer{apiKey: apiKey, from: from, endpoint: resendEndpoint, client: &http.Client{Timeout: sendTimeout}, backoff: time.Second}
}

type resendAttachment struct {
	Content     string `json:"content"`
	Filename    string `json:"filename"`
	ContentType string `json:"content_type,omitempty"`
	ContentID   string `json:"content_id,omitempty"`
}

type resendRequest struct {
	From        string             `json:"from"`
	To          []string           `json:"to"`
	Subject     string             `json:"subject"`
	HTML        string             `json:"html,omitempty"`
	Text        string             `json:"text,omitempty"`
	ReplyTo     string             `json:"reply_to,omitempty"`
	Attachments []resendAttachment `json:"attachments,omitempty"`
}

func (m *resendMailer) Send(ctx context.Context, msg Message) error {
	if err := validateHeaders(msg); err != nil {
		return err
	}
	req := resendRequest{From: m.from, To: []string{msg.To}, Subject: msg.Subject, HTML: msg.HTML, Text: msg.Text, ReplyTo: msg.ReplyTo}
	for _, img := range msg.Inline {
		req.Attachments = append(req.Attachments, resendAttachment{
			Content: base64.StdEncoding.EncodeToString(img.Data), Filename: img.Filename,
			ContentType: img.ContentType, ContentID: img.ContentID,
		})
	}
	payload, err := json.Marshal(req)
	if err != nil {
		return err
	}

	var lastErr error
	for attempt := 0; attempt < resendMaxAttempts; attempt++ {
		if attempt > 0 {
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(m.backoff * time.Duration(attempt)):
			}
		}
		retry, err := m.post(ctx, payload, msg.IdempotencyKey)
		if err == nil {
			return nil
		}
		lastErr = err
		if !retry {
			break
		}
	}
	return lastErr
}

// post returns whether a failure is worth retrying (rate limit, server error or network error).
func (m *resendMailer) post(ctx context.Context, payload []byte, idempotencyKey string) (bool, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, m.endpoint, bytes.NewReader(payload))
	if err != nil {
		return false, err
	}
	req.Header.Set("Authorization", "Bearer "+m.apiKey)
	req.Header.Set("Content-Type", "application/json")
	if idempotencyKey != "" {
		req.Header.Set("Idempotency-Key", idempotencyKey)
	}
	resp, err := m.client.Do(req)
	if err != nil {
		return true, fmt.Errorf("mailer: resend request failed: %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return false, nil
	}
	// The body is logged here, not returned, so provider details never reach an HTTP caller.
	log.Printf("mailer: resend rejected the email (status %d): %s", resp.StatusCode, body)
	retry := resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode >= 500
	return retry, fmt.Errorf("mailer: resend rejected the email (status %d)", resp.StatusCode)
}
