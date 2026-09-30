package mailer

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/tls"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"mime"
	"mime/multipart"
	"mime/quotedprintable"
	"net"
	"net/mail"
	"net/smtp"
	"net/textproto"
	"time"
)

// sendTimeout bounds a single Send end-to-end so a slow or unreachable mail host can't hang the caller.
const sendTimeout = 15 * time.Second

// smtpMailer delivers through any SMTP server, including smtp.resend.com.
type smtpMailer struct {
	host, port, username, password string
	from                           mail.Address
}

// Send dials with a bounded deadline, uses implicit TLS on port 465 or opportunistic STARTTLS otherwise, and delivers one message.
func (m *smtpMailer) Send(ctx context.Context, msg Message) error {
	if err := validateHeaders(msg); err != nil {
		return err
	}
	to, err := mail.ParseAddress(msg.To)
	if err != nil {
		return fmt.Errorf("mailer: invalid recipient: %w", err)
	}
	body, err := buildMessage(m.from, *to, msg)
	if err != nil {
		return err
	}

	deadline := time.Now().Add(sendTimeout)
	if d, ok := ctx.Deadline(); ok && d.Before(deadline) {
		deadline = d
	}
	addr := net.JoinHostPort(m.host, m.port)

	var dialer net.Dialer
	conn, err := dialer.DialContext(ctx, "tcp", addr)
	if err != nil {
		return fmt.Errorf("mailer: dial %s failed: %w", addr, err)
	}
	// One deadline on the connection bounds the whole conversation, since net/smtp has no context parameter of its own.
	if err := conn.SetDeadline(deadline); err != nil {
		conn.Close()
		return fmt.Errorf("mailer: setting deadline for %s failed: %w", addr, err)
	}
	if m.port == "465" {
		conn = tls.Client(conn, &tls.Config{ServerName: m.host, MinVersion: tls.VersionTLS12})
	}

	client, err := smtp.NewClient(conn, m.host)
	if err != nil {
		conn.Close()
		return fmt.Errorf("mailer: SMTP handshake with %s failed: %w", addr, err)
	}
	defer client.Close()

	if m.port != "465" {
		if ok, _ := client.Extension("STARTTLS"); ok {
			if err := client.StartTLS(&tls.Config{ServerName: m.host, MinVersion: tls.VersionTLS12}); err != nil {
				return fmt.Errorf("mailer: STARTTLS with %s failed: %w", addr, err)
			}
		}
	}
	if m.username != "" {
		if err := client.Auth(smtp.PlainAuth("", m.username, m.password, m.host)); err != nil {
			return fmt.Errorf("mailer: authentication with %s failed: %w", addr, err)
		}
	}
	// The envelope takes the bare address; the display name only belongs in the From header.
	if err := client.Mail(m.from.Address); err != nil {
		return fmt.Errorf("mailer: MAIL FROM rejected by %s: %w", addr, err)
	}
	if err := client.Rcpt(to.Address); err != nil {
		return fmt.Errorf("mailer: RCPT TO rejected by %s: %w", addr, err)
	}
	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("mailer: DATA rejected by %s: %w", addr, err)
	}
	if _, err := w.Write(body); err != nil {
		return fmt.Errorf("mailer: writing message to %s failed: %w", addr, err)
	}
	if err := w.Close(); err != nil {
		return fmt.Errorf("mailer: finalizing message to %s failed: %w", addr, err)
	}
	return client.Quit()
}

// buildMessage assembles a MIME message: text and HTML alternatives, with inline images next to the HTML.
func buildMessage(from, to mail.Address, msg Message) ([]byte, error) {
	var idBytes [16]byte
	_, _ = rand.Read(idBytes[:])

	var b bytes.Buffer
	outer := multipart.NewWriter(&b)
	header := func(k, v string) { fmt.Fprintf(&b, "%s: %s\r\n", k, v) }
	header("From", from.String())
	header("To", to.String())
	if msg.ReplyTo != "" {
		header("Reply-To", msg.ReplyTo)
	}
	header("Subject", mime.QEncoding.Encode("utf-8", msg.Subject))
	header("Date", time.Now().UTC().Format(time.RFC1123Z))
	// Date and Message-Id are set because several mail servers spam-filter messages missing them.
	header("Message-Id", fmt.Sprintf("<%s@openschool>", hex.EncodeToString(idBytes[:])))
	header("MIME-Version", "1.0")
	header("Content-Type", fmt.Sprintf("multipart/alternative; boundary=%q", outer.Boundary()))
	b.WriteString("\r\n")

	if err := writeQuotedPart(outer, "text/plain; charset=UTF-8", msg.Text); err != nil {
		return nil, err
	}
	if msg.HTML != "" {
		// The related part's header needs its boundary before the part's writer exists.
		boundary := multipart.NewWriter(nil).Boundary()
		part, err := outer.CreatePart(textproto.MIMEHeader{"Content-Type": {fmt.Sprintf("multipart/related; boundary=%q", boundary)}})
		if err != nil {
			return nil, err
		}
		inner := multipart.NewWriter(part)
		if err := inner.SetBoundary(boundary); err != nil {
			return nil, err
		}
		if err := writeQuotedPart(inner, "text/html; charset=UTF-8", msg.HTML); err != nil {
			return nil, err
		}
		for _, img := range msg.Inline {
			if err := writeInlinePart(inner, img); err != nil {
				return nil, err
			}
		}
		if err := inner.Close(); err != nil {
			return nil, err
		}
	}
	if err := outer.Close(); err != nil {
		return nil, err
	}
	return b.Bytes(), nil
}

func writeQuotedPart(w *multipart.Writer, contentType, content string) error {
	part, err := w.CreatePart(textproto.MIMEHeader{
		"Content-Type":              {contentType},
		"Content-Transfer-Encoding": {"quoted-printable"},
	})
	if err != nil {
		return err
	}
	qp := quotedprintable.NewWriter(part)
	if _, err := qp.Write([]byte(content)); err != nil {
		return err
	}
	return qp.Close()
}

func writeInlinePart(w *multipart.Writer, img Inline) error {
	part, err := w.CreatePart(textproto.MIMEHeader{
		"Content-Type":              {img.ContentType},
		"Content-Transfer-Encoding": {"base64"},
		"Content-Id":                {"<" + img.ContentID + ">"},
		"Content-Disposition":       {fmt.Sprintf("inline; filename=%q", img.Filename)},
	})
	if err != nil {
		return err
	}
	encoded := base64.StdEncoding.EncodeToString(img.Data)
	// RFC 2045 limits encoded lines to 76 characters.
	for len(encoded) > 76 {
		if _, err := fmt.Fprintf(part, "%s\r\n", encoded[:76]); err != nil {
			return err
		}
		encoded = encoded[76:]
	}
	_, err = fmt.Fprintf(part, "%s\r\n", encoded)
	return err
}
