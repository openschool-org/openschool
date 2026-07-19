package middleware

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type StringOrSlice []string

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

var jwks keyfunc.Keyfunc

type stripX5CTransport struct {
	base http.RoundTripper
}

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
		Keys []map[string]interface{} `json:"keys"`
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

func InitJWKS(jwksURL string) error {
	// Strips x5c from the JWKS response (keyfunc chokes on Asgardeo's x5c
	// certificate chains) but otherwise uses a normal, TLS-verifying
	// transport — this endpoint is what establishes trust for every JWT
	// signature check in the app, so it must not skip certificate validation.
	client := &http.Client{
		Transport: &stripX5CTransport{
			base: http.DefaultTransport,
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

		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, jwks.Keyfunc,
			jwt.WithValidMethods([]string{"RS256"}),
			jwt.WithIssuer(os.Getenv("ASGARDEO_ISSUER")),
		)
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
