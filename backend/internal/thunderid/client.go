package thunderid

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/openschool-org/openschool/internal/identity"
)

// idpError logs the raw ThunderID response server-side and returns a
// sanitized error safe to surface to an HTTP caller. Several handlers
// return err.Error() straight to the client (see audit.md M-6); the upstream
// body can contain internal details (stack traces, field names, config
// hints) that shouldn't cross that boundary, so the sanitizing has to happen
// here — the one place every ThunderID call funnels through — rather than
// being re-applied at each of those call sites.
func idpError(op string, statusCode int, body []byte) error {
	log.Printf("thunderid: %s failed (status %d): %s", op, statusCode, string(body))
	return fmt.Errorf("identity provider request failed (status %d)", statusCode)
}

type Client struct {
	baseUrl    string
	ouID       string
	httpClient *http.Client

	// Every CreateUser/UpdateUser/DeleteUser/AssignRole call fetched a fresh
	// client-credentials token before this cache existed — at least doubling
	// outbound requests to the IDP on every identity-touching write under
	// real load (bulk imports, a school day's worth of writes). Guarded by a
	// mutex since Client is shared across concurrent Gin request handlers.
	tokenMu     sync.Mutex
	cachedToken string
	tokenExpiry time.Time
}

func NewClient() *Client {
	// Skipping cert verification is only ever acceptable against ThunderID's
	// self-signed local-dev certificate. Doing this unconditionally would
	// silently disable TLS verification in production too, exposing the
	// channel that creates users and assigns roles to a MITM.
	transport := http.DefaultTransport
	if os.Getenv("APP_ENV") == "development" {
		transport = &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
		}
	}

	return &Client{
		baseUrl:    os.Getenv("THUNDERID_BASE_URL"),
		ouID:       os.Getenv("THUNDERID_OU_ID"),
		httpClient: &http.Client{Transport: transport},
	}
}

type CreateUserRequest struct {
	OuID       string                 `json:"ouId"`
	Type       string                 `json:"type"`
	Attributes map[string]interface{} `json:"attributes"`
}

type ThunderIDUser struct {
	ID string `json:"id"`
}

func (c *Client) getAccessToken(ctx context.Context) (string, error) {
	c.tokenMu.Lock()
	defer c.tokenMu.Unlock()

	if c.cachedToken != "" && time.Now().Before(c.tokenExpiry) {
		return c.cachedToken, nil
	}

	data := url.Values{}
	data.Set("grant_type", "client_credentials")
	data.Set("client_id", os.Getenv("THUNDERID_CLIENT_ID"))
	data.Set("client_secret", os.Getenv("THUNDERID_CLIENT_SECRET"))
	data.Set("scope", "system")
	data.Set("resource", os.Getenv("THUNDERID_RESOURCE"))

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		os.Getenv("THUNDERID_TOKEN_URL"),
		strings.NewReader(data.Encode()),
	)
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("thunderid token error (%d): %s", resp.StatusCode, string(bodyBytes))
	}

	var result struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
	}
	if err := json.Unmarshal(bodyBytes, &result); err != nil {
		return "", err
	}

	if result.AccessToken == "" {
		return "", fmt.Errorf("empty access token from ThunderID")
	}

	c.cachedToken = result.AccessToken
	// Refreshed 10s before actual expiry so an in-flight request never gets
	// handed a token that expires mid-call; ExpiresIn == 0 (field missing)
	// falls back to an already-elapsed expiry, i.e. effectively uncached.
	c.tokenExpiry = time.Now().Add(time.Duration(result.ExpiresIn)*time.Second - 10*time.Second)

	return result.AccessToken, nil
}

func (c *Client) CreateUser(ctx context.Context, userType string, attrs map[string]any) (*identity.User, error) {
	token, err := c.getAccessToken(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get ThunderID token: %w", err)
	}

	body := CreateUserRequest{
		OuID:       c.ouID,
		Type:       userType,
		Attributes: attrs,
	}

	data, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseUrl+"/users", bytes.NewBuffer(data))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusCreated {
		if thunderErrorCode(respBody) == "USR-1014" {
			return nil, identity.ErrDuplicateUser
		}
		return nil, idpError("CreateUser", resp.StatusCode, respBody)
	}

	var user ThunderIDUser
	if err := json.Unmarshal(respBody, &user); err != nil {
		return nil, err
	}

	return &identity.User{ID: user.ID}, nil
}

func (c *Client) UpdateUser(ctx context.Context, userID string, userType string, attrs map[string]interface{}) error {
	token, err := c.getAccessToken(ctx)
	if err != nil {
		return fmt.Errorf("failed to get ThunderID token: %w", err)
	}

	body := map[string]interface{}{
		"ouId":       c.ouID,
		"type":       userType,
		"attributes": attrs,
	}

	data, err := json.Marshal(body)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPut,
		c.baseUrl+"/users/"+userID, bytes.NewBuffer(data))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return idpError("UpdateUser", resp.StatusCode, respBody)
	}

	return nil
}

func (c *Client) DeleteUser(ctx context.Context, userID string) error {
	token, err := c.getAccessToken(ctx)
	if err != nil {
		return fmt.Errorf("failed to get ThunderID token: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodDelete,
		c.baseUrl+"/users/"+userID, nil)
	if err != nil {
		return err
	}

	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNoContent && resp.StatusCode != http.StatusNotFound {
		body, _ := io.ReadAll(resp.Body)
		return idpError("DeleteUser", resp.StatusCode, body)
	}

	return nil
}

func (c *Client) AssignRole(ctx context.Context, roleID string, userID string) error {
	token, err := c.getAccessToken(ctx)
	if err != nil {
		return fmt.Errorf("failed to get ThunderID token: %w", err)
	}

	body := map[string]interface{}{
		"assignments": []map[string]interface{}{
			{
				"type": "user",
				"id":   userID,
			},
		},
	}

	data, err := json.Marshal(body)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		c.baseUrl+"/roles/"+roleID+"/assignments/add", bytes.NewBuffer(data))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNoContent {
		respBody, _ := io.ReadAll(resp.Body)
		return idpError("AssignRole", resp.StatusCode, respBody)
	}

	return nil
}

// thunderErrorCode extracts ThunderID's machine-readable error code (e.g.
// "USR-1014") from an error response body, or "" if it can't be parsed.
func thunderErrorCode(body []byte) string {
	var parsed struct {
		Code string `json:"code"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return ""
	}
	return parsed.Code
}
