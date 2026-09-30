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

	"github.com/openschool-org/openschool/internal/idp"
)

// requestTimeout bounds token and management API calls when the caller does
// not already provide a shorter context deadline.
const requestTimeout = 15 * time.Second

// idpError logs the raw ThunderID response server-side and returns a sanitized error safe to surface to an HTTP caller (the raw body can leak internals; see audit.md M-6).
func idpError(op string, statusCode int, body []byte) error {
	log.Printf("thunderid: %s failed (status %d): %s", op, statusCode, string(body))
	return fmt.Errorf("identity provider request failed (status %d)", statusCode)
}

// Client is a ThunderID API client implementing idp.Provider, backed by one cached client-credentials token.
type Client struct {
	baseUrl     string
	ouID        string
	httpClient  *http.Client
	tokenMu     sync.Mutex
	cachedToken string
	tokenExpiry time.Time
}

// NewClient builds a ThunderID API client from THUNDERID_* environment variables.
func NewClient() *Client {
	transport := http.DefaultTransport
	if os.Getenv("APP_ENV") == "development" {
		transport = &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
		}
	}

	return &Client{
		baseUrl:    os.Getenv("THUNDERID_BASE_URL"),
		ouID:       os.Getenv("THUNDERID_OU_ID"),
		httpClient: &http.Client{Transport: transport, Timeout: requestTimeout},
	}
}

// createUserRequest is the POST /users request body.
type createUserRequest struct {
	OuID       string         `json:"ouId"`
	Type       string         `json:"type"`
	Attributes map[string]any `json:"attributes"`
}

// updateUserRequest is the PUT /users/{id} request body.
type updateUserRequest struct {
	OuID       string         `json:"ouId"`
	Type       string         `json:"type"`
	Attributes map[string]any `json:"attributes"`
}

// roleAssignment identifies one principal to add to a role in an assignments request.
type roleAssignment struct {
	Type string `json:"type"`
	ID   string `json:"id"`
}

// assignRoleRequest is the POST /roles/{id}/assignments/add request body.
type assignRoleRequest struct {
	Assignments []roleAssignment `json:"assignments"`
}

// thunderIDUser is the subset of ThunderID's user object every write endpoint returns.
type ThunderIDUser struct {
	ID string `json:"id"`
}

// getAccessToken returns the cached client-credentials token, fetching and caching a new one if it's missing or about to expire.
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
		return "", idpError("GetAccessToken", resp.StatusCode, bodyBytes)
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

// doRequest is the shared authenticated-call path every Client method funnels through: it attaches a bearer token
// (wrapping a token-fetch failure the same way for every caller), JSON-encodes body when non-nil, and returns the raw
// response status and bytes so each caller applies its own success-status check and error handling.
func (c *Client) doRequest(ctx context.Context, method, path string, body any) (int, []byte, error) {
	token, err := c.getAccessToken(ctx)
	if err != nil {
		return 0, nil, fmt.Errorf("failed to get ThunderID token: %w", err)
	}

	var reqBody io.Reader
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			return 0, nil, err
		}
		reqBody = bytes.NewReader(data)
	}

	req, err := http.NewRequestWithContext(ctx, method, c.baseUrl+path, reqBody)
	if err != nil {
		return 0, nil, err
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, nil, err
	}
	return resp.StatusCode, respBody, nil
}

// CreateUser provisions a new ThunderID account and returns its identity-provider ID.
func (c *Client) CreateUser(ctx context.Context, userType string, attrs map[string]any) (*idp.User, error) {
	status, body, err := c.doRequest(ctx, http.MethodPost, "/users", createUserRequest{
		OuID: c.ouID, Type: userType, Attributes: attrs,
	})
	if err != nil {
		return nil, err
	}
	if status != http.StatusCreated {
		if thunderErrorCode(body) == "USR-1014" {
			return nil, idp.ErrDuplicateUser
		}
		return nil, idpError("CreateUser", status, body)
	}

	var user ThunderIDUser
	if err := json.Unmarshal(body, &user); err != nil {
		return nil, err
	}
	return &idp.User{ID: user.ID}, nil
}

// UpdateUser replaces the given ThunderID account's type and attributes.
func (c *Client) UpdateUser(ctx context.Context, userID string, userType string, attrs map[string]any) error {
	status, body, err := c.doRequest(ctx, http.MethodPut, "/users/"+userID, updateUserRequest{
		OuID: c.ouID, Type: userType, Attributes: attrs,
	})
	if err != nil {
		return err
	}
	if status != http.StatusOK {
		return idpError("UpdateUser", status, body)
	}
	return nil
}

// updateCredentialsRequest is the POST /users/{id}/update-credentials request body.
type updateCredentialsRequest struct {
	Credentials map[string]string `json:"credentials"`
}

// UpdatePassword sets a user's password through the credentials endpoint; PUT /users/{id} cannot change credentials.
func (c *Client) UpdatePassword(ctx context.Context, userID string, password string) error {
	status, body, err := c.doRequest(ctx, http.MethodPost, "/users/"+userID+"/update-credentials", updateCredentialsRequest{
		Credentials: map[string]string{"password": password},
	})
	if err != nil {
		return err
	}
	if status != http.StatusNoContent && status != http.StatusOK {
		return idpError("UpdatePassword", status, body)
	}
	return nil
}

// DeleteUser deletes a ThunderID account, treating an already-deleted account (404) as success.
func (c *Client) DeleteUser(ctx context.Context, userID string) error {
	status, body, err := c.doRequest(ctx, http.MethodDelete, "/users/"+userID, nil)
	if err != nil {
		return err
	}
	if status != http.StatusNoContent && status != http.StatusNotFound {
		return idpError("DeleteUser", status, body)
	}
	return nil
}

// AssignRole grants the given ThunderID role to a user.
func (c *Client) AssignRole(ctx context.Context, roleID string, userID string) error {
	status, body, err := c.doRequest(ctx, http.MethodPost, "/roles/"+roleID+"/assignments/add", assignRoleRequest{
		Assignments: []roleAssignment{{Type: "user", ID: userID}},
	})
	if err != nil {
		return err
	}
	if status != http.StatusNoContent {
		return idpError("AssignRole", status, body)
	}
	return nil
}

// thunderIDListPageSize is the page size requested per GET /users call; ThunderID's own default (30) would take an impractical number of round trips for a school-sized user base.
const thunderIDListPageSize = 100

// thunderIDListMaxPages is a safety valve against an unexpected pagination-metadata bug looping forever; 500 pages at 100/page covers 50,000 users, far beyond any real deployment.
const thunderIDListMaxPages = 500

// thunderIDUserListResponse is the GET /users response envelope.
type thunderIDUserListResponse struct {
	TotalResults int                   `json:"totalResults"`
	Count        int                   `json:"count"`
	Users        []thunderIDListedUser `json:"users"`
}

// thunderIDListedUser is one entry in a GET /users page.
type thunderIDListedUser struct {
	ID         string          `json:"id"`
	Attributes json.RawMessage `json:"attributes"`
}

// ListUsers pages through GET /users and returns every account, best-effort extracting username/email from each user's attributes for display purposes only.
func (c *Client) ListUsers(ctx context.Context) ([]idp.User, error) {
	var out []idp.User
	offset := 0
	for pageNum := 0; pageNum < thunderIDListMaxPages; pageNum++ {
		path := fmt.Sprintf("/users?limit=%d&offset=%d", thunderIDListPageSize, offset)
		status, body, err := c.doRequest(ctx, http.MethodGet, path, nil)
		if err != nil {
			return nil, err
		}
		if status != http.StatusOK {
			return nil, idpError("ListUsers", status, body)
		}

		var parsed thunderIDUserListResponse
		if err := json.Unmarshal(body, &parsed); err != nil {
			return nil, err
		}

		for _, u := range parsed.Users {
			var attrs struct {
				Username string `json:"username"`
				Email    string `json:"email"`
			}
			_ = json.Unmarshal(u.Attributes, &attrs)
			out = append(out, idp.User{ID: u.ID, Username: attrs.Username, Email: attrs.Email})
		}

		offset += parsed.Count
		if parsed.Count == 0 || offset >= parsed.TotalResults {
			break
		}
	}

	return out, nil
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
