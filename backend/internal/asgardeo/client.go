package asgardeo

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
)

type Client struct {
	baseUrl    string
	httpClient *http.Client
}

func NewClient() *Client {
	return &Client{
		baseUrl:    os.Getenv("ASGARDEO_BASE_URL"),
		httpClient: &http.Client{},
	}
}

type User struct {
	ID       string `json:"id"`
	UserName string `json:"userName"`
}

const scimScopes = "internal_user_mgt_create internal_user_mgt_update internal_user_mgt_delete internal_user_mgt_list internal_user_mgt_view internal_org_role_mgt_view internal_org_role_mgt_users_update"

func (c *Client) getAccessToken(ctx context.Context) (string, error) {
	data := url.Values{}
	data.Set("grant_type", "client_credentials")
	data.Set("scope", scimScopes)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		os.Getenv("ASGARDEO_TOKEN_URL"),
		strings.NewReader(data.Encode()),
	)
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.SetBasicAuth(os.Getenv("ASGARDEO_CLIENT_ID"), os.Getenv("ASGARDEO_CLIENT_SECRET"))

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var result struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", err
	}

	if result.AccessToken == "" {
		return "", fmt.Errorf("empty access token from Asgardeo: %s", string(body))
	}

	return result.AccessToken, nil
}

// buildUserPayload maps the same attrs shape used by the ThunderID client
// (username, email, given_name, family_name, phone_number, password, ...)
// into a SCIM2 User resource.
func buildUserPayload(attrs map[string]interface{}) map[string]interface{} {
	username, _ := attrs["username"].(string)
	// Asgardeo's SCIM2 API resolves the wrong (read-only) user store
	// resolver when "userName" has no domain prefix, so the primary
	// resident user store must be specified explicitly.
	if username != "" && !strings.Contains(username, "/") {
		username = "DEFAULT/" + username
	}

	body := map[string]interface{}{
		"schemas":  []string{"urn:ietf:params:scim:schemas:core:2.0:User"},
		"userName": username,
		"name": map[string]interface{}{
			"givenName":  attrs["given_name"],
			"familyName": attrs["family_name"],
		},
		"emails": []map[string]interface{}{
			{"value": attrs["email"], "primary": true},
		},
	}

	if phone, ok := attrs["phone_number"]; ok && phone != "" {
		body["phoneNumbers"] = []map[string]interface{}{
			{"value": phone, "type": "mobile"},
		}
	}

	if pw, ok := attrs["password"]; ok && pw != "" {
		body["password"] = pw
	}

	return body
}

func (c *Client) CreateUser(ctx context.Context, userType string, attrs map[string]interface{}) (*User, error) {
	token, err := c.getAccessToken(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get Asgardeo token: %w", err)
	}

	data, err := json.Marshal(buildUserPayload(attrs))
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseUrl+"/scim2/Users", bytes.NewBuffer(data))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/scim+json")
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
		return nil, fmt.Errorf("asgardeo error: %s", string(respBody))
	}

	var user User
	if err := json.Unmarshal(respBody, &user); err != nil {
		return nil, err
	}

	return &user, nil
}

func (c *Client) UpdateUser(ctx context.Context, userID string, userType string, attrs map[string]interface{}) error {
	token, err := c.getAccessToken(ctx)
	if err != nil {
		return fmt.Errorf("failed to get Asgardeo token: %w", err)
	}

	data, err := json.Marshal(buildUserPayload(attrs))
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPut,
		c.baseUrl+"/scim2/Users/"+userID, bytes.NewBuffer(data))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/scim+json")
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("asgardeo error: %s", string(respBody))
	}

	return nil
}

func (c *Client) DeleteUser(ctx context.Context, userID string) error {
	token, err := c.getAccessToken(ctx)
	if err != nil {
		return fmt.Errorf("failed to get Asgardeo token: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodDelete,
		c.baseUrl+"/scim2/Users/"+userID, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNoContent {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("asgardeo error: %s", string(body))
	}

	return nil
}

// AssignRole adds userID to the given role's member list via the
// organization-scoped SCIM2 Roles V2 API ("/o/scim2/v2/Roles"). This is
// deliberate, not a typo:
//   - "/scim2/v3/Roles" (tenant-scoped v3) is blocked by Asgardeo's edge WAF
//     for direct API/script clients (returns an HTML "security rules" page).
//   - "/scim2/Roles" (tenant-scoped v1/v2) returns 500 for
//     application-audience roles — it only understands organization-audience
//     roles.
//   - "/o/scim2/v2/Roles" (organization-scoped v2) is the one that actually
//     works for application-audience roles like the ones this app uses.
func (c *Client) AssignRole(ctx context.Context, roleID string, userID string) error {
	token, err := c.getAccessToken(ctx)
	if err != nil {
		return fmt.Errorf("failed to get Asgardeo token: %w", err)
	}

	body := map[string]interface{}{
		"schemas": []string{"urn:ietf:params:scim:api:messages:2.0:PatchOp"},
		"Operations": []map[string]interface{}{
			{
				"op":   "add",
				"path": "users",
				"value": []map[string]interface{}{
					{"value": userID},
				},
			},
		},
	}

	data, err := json.Marshal(body)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPatch,
		c.baseUrl+"/o/scim2/v2/Roles/"+roleID, bytes.NewBuffer(data))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/scim+json")
	req.Header.Set("Accept", "application/scim+json")
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("asgardeo error: %s", string(respBody))
	}

	return nil
}
