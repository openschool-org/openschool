package middleware

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/openschool-org/openschool/internal/idp"
)

// StringOrSlice unmarshals a JSON value that may be either a single string or an array of strings.
type StringOrSlice []string

// UnmarshalJSON accepts the "roles" claim as either a bare string or a string array.
func (s *StringOrSlice) UnmarshalJSON(data []byte) error {
	var single string
	if err := json.Unmarshal(data, &single); err == nil {
		*s = []string{single}
		return nil
	}

	var multiple []string
	if err := json.Unmarshal(data, &multiple); err != nil {
		return err
	}
	*s = multiple
	return nil
}

// Claims is the subset of a ThunderID access token's JWT claims AuthMiddleware reads.
type Claims struct {
	Sub         string        `json:"sub"`
	Email       string        `json:"email"`
	Username    string        `json:"username"`
	GivenName   string        `json:"given_name"`
	FamilyName  string        `json:"family_name"`
	PhoneNumber string        `json:"phone_number"`
	Roles       StringOrSlice `json:"roles"`
	jwt.RegisteredClaims
}

// jwks holds the cached, auto-refreshing JWKS key set InitJWKS builds; AuthMiddleware validates every token's signature against it.
var jwks keyfunc.Keyfunc

const jwksFetchTimeout = 10 * time.Second

// stripX5CTransport strips the x5c certificate chain from a JWKS response before keyfunc parses it.
type stripX5CTransport struct {
	base http.RoundTripper
}

// RoundTrip runs the wrapped transport, then removes each key's x5c field from a successful JWKS response.
func (t *stripX5CTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	resp, err := t.base.RoundTrip(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		return resp, err
	}

	body, err := io.ReadAll(resp.Body)
	resp.Body.Close()
	if err != nil {
		return nil, err
	}

	var jwks struct {
		Keys []map[string]any `json:"keys"`
	}
	if err := json.Unmarshal(body, &jwks); err != nil {
		resp.Body = io.NopCloser(bytes.NewReader(body))
		return resp, nil
	}

	for _, key := range jwks.Keys {
		delete(key, "x5c")
	}

	cleaned, err := json.Marshal(jwks)
	if err != nil {
		resp.Body = io.NopCloser(bytes.NewReader(body))
		return resp, nil
	}

	resp.Body = io.NopCloser(bytes.NewReader(cleaned))
	resp.ContentLength = int64(len(cleaned))
	resp.Header.Set("Content-Length", strconv.Itoa(len(cleaned)))
	return resp, nil
}

// InitJWKS fetches and caches the JWKS key set at jwksURL, with a transport that skips TLS verification in development and strips x5c from every response.
func InitJWKS(jwksURL string) error {
	if strings.TrimSpace(jwksURL) == "" {
		return errors.New("THUNDERID_JWKS_URL is required")
	}
	if strings.TrimSpace(idp.Issuer()) == "" {
		return errors.New("THUNDERID_ISSUER is required")
	}
	baseTransport := http.DefaultTransport
	if os.Getenv("APP_ENV") == "development" {
		baseTransport = &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
		}
	}

	// Bounded so a slow identity provider cannot hang startup or the background key refresh.
	client := &http.Client{
		Timeout: jwksFetchTimeout,
		Transport: &stripX5CTransport{
			base: baseTransport,
		},
	}

	k, err := keyfunc.NewDefaultOverrideCtx(context.Background(), []string{jwksURL},
		keyfunc.Override{
			Client: client,
		},
	)
	if err != nil {
		return err
	}
	jwks = k
	return nil
}

// AuthMiddleware validates the request's Bearer JWT against the cached JWKS and sets the caller's identity on the context.
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "missing authorization header",
			})
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "invalid authorization header format",
			})
			return
		}

		tokenStr := parts[1]

		parserOpts := []jwt.ParserOption{
			jwt.WithValidMethods([]string{"RS256"}),
			jwt.WithIssuer(idp.Issuer()),
			jwt.WithLeeway(30 * time.Second),
		}

		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, jwks.Keyfunc, parserOpts...)
		if err != nil || !token.Valid {
			log.Printf("auth: token validation failed: %v", err)
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "invalid or expired token",
			})
			return
		}

		c.Set("userID", claims.Sub)
		c.Set("email", claims.Email)
		c.Set("username", claims.Username)
		c.Set("given_name", claims.GivenName)
		c.Set("family_name", claims.FamilyName)
		c.Set("phone_number", claims.PhoneNumber)
		c.Set("roles", []string(claims.Roles))

		c.Next()
	}
}
