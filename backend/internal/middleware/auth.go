package middleware

import (
	"context"
	"crypto/tls"
	"net/http"
	"strings"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	Sub         string   `json:"sub"`
	Email       string   `json:"email"`
	Username    string   `json:"username"`
	GivenName   string   `json:"given_name"`
	FamilyName  string   `json:"family_name"`
	PhoneNumber string   `json:"phone_number"`
	Roles       []string `json:"roles"`
	jwt.RegisteredClaims
}

var jwks keyfunc.Keyfunc

func InitJWKS(jwksURL string) error {
	insecureClient := &http.Client{
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
		},
	}

	k, err := keyfunc.NewDefaultOverrideCtx(context.Background(), []string{jwksURL},
		keyfunc.Override{
			Client: insecureClient,
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
		token, err := jwt.ParseWithClaims(tokenStr, claims, jwks.Keyfunc)
		if err != nil || !token.Valid {
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
		c.Set("roles", claims.Roles)

		c.Next()
	}
}
