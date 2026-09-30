package activation

import (
	"bytes"
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
)

func testCipher(t *testing.T) *codeCipher {
	t.Helper()
	c, err := newCodeCipher(bytes.Repeat([]byte{7}, 32))
	if err != nil {
		t.Fatal(err)
	}
	return c
}

func TestCodeCipherRoundTripAndTamper(t *testing.T) {
	c := testCipher(t)
	code := "ABCDE-FGHJK"
	hash := hashSecret(normalizeCode(code))
	sealed, err := c.encrypt(code, hash)
	if err != nil || bytes.Contains(sealed, []byte(code)) {
		t.Fatalf("encrypt: %v (plain text must not appear)", err)
	}
	if got, err := c.decrypt(sealed, hash); err != nil || got != code {
		t.Fatalf("decrypt = %q, %v", got, err)
	}
	if _, err := c.decrypt(sealed, hashSecret("OTHER")); err == nil {
		t.Fatal("a ciphertext must only open on its own row")
	}
	sealed[len(sealed)-1] ^= 1
	if _, err := c.decrypt(sealed, hash); err == nil {
		t.Fatal("a changed ciphertext must be rejected")
	}
}

func TestCipherFromEnv(t *testing.T) {
	t.Setenv("ACTIVATION_CODE_KEY", "")
	if c, err := cipherFromEnv(); c != nil || err != nil {
		t.Fatal("no key should mean reprinting is off, not an error")
	}
	t.Setenv("ACTIVATION_CODE_KEY", "too-short")
	if _, err := cipherFromEnv(); err == nil {
		t.Fatal("a malformed key must be refused")
	}
}

func TestGenerateStoresEncryptedCodesOnlyWithAKey(t *testing.T) {
	svc, store, _, _ := newFixture()
	store.targetList = []target{{ID: uuid.New(), Name: "A"}}
	if _, err := svc.Generate(context.Background(), GenerateRequest{Role: "student"}, uuid.New()); err != nil {
		t.Fatal(err)
	}
	if store.issued[0].Encrypted != nil {
		t.Fatal("without a key, only the hash may be stored")
	}
	if _, err := svc.BatchCodes(context.Background(), uuid.New(), uuid.New()); !errors.Is(err, ErrReprintDisabled) {
		t.Fatalf("err = %v, want ErrReprintDisabled", err)
	}
	svc.cipher = testCipher(t)
	resp, err := svc.Generate(context.Background(), GenerateRequest{Role: "student"}, uuid.New())
	if err != nil {
		t.Fatal(err)
	}
	if got, err := svc.cipher.decrypt(store.issued[0].Encrypted, store.issued[0].Hash); err != nil || got != resp.Codes[0].Code {
		t.Fatalf("stored code %q, %v; want %q", got, err, resp.Codes[0].Code)
	}
}
