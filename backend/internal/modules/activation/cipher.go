package activation

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"os"
	"strings"
)

// ErrReprintDisabled means no ACTIVATION_CODE_KEY is set, so codes were not kept and cannot be shown again.
var ErrReprintDisabled = errors.New("reprinting codes is turned off: set ACTIVATION_CODE_KEY on the server, then generate new codes")

// codeCipher encrypts codes for reprinting. The code's hash is the associated data, so a
// ciphertext only decrypts on the row it was written for.
type codeCipher struct{ aead cipher.AEAD }

// cipherFromEnv returns nil when ACTIVATION_CODE_KEY is unset; codes are then stored as hashes only.
func cipherFromEnv() (*codeCipher, error) {
	raw := strings.TrimSpace(os.Getenv("ACTIVATION_CODE_KEY"))
	if raw == "" {
		return nil, nil
	}
	key, err := base64.StdEncoding.DecodeString(raw)
	if err != nil || len(key) != 32 {
		return nil, fmt.Errorf("ACTIVATION_CODE_KEY must be 32 random bytes in base64 (openssl rand -base64 32)")
	}
	return newCodeCipher(key)
}

func newCodeCipher(key []byte) (*codeCipher, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	return &codeCipher{aead: aead}, nil
}

func (c *codeCipher) encrypt(code, hash string) ([]byte, error) {
	nonce := make([]byte, c.aead.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return nil, err
	}
	return c.aead.Seal(nonce, nonce, []byte(code), []byte(hash)), nil
}

// decrypt also checks the result still matches the stored hash.
func (c *codeCipher) decrypt(sealed []byte, hash string) (string, error) {
	n := c.aead.NonceSize()
	if len(sealed) < n {
		return "", errors.New("stored code is too short")
	}
	plain, err := c.aead.Open(nil, sealed[:n], sealed[n:], []byte(hash))
	if err != nil {
		return "", err
	}
	code := string(plain)
	if hashSecret(normalizeCode(code)) != hash {
		return "", errors.New("stored code does not match its hash")
	}
	return code, nil
}
