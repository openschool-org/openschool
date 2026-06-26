package thunderid

import (
	"bytes"
	"context"
	"crypto/tls"
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
	ouID       string
	httpClient *http.Client
}

func NewClient() *Client {
	return &Client{
		baseUrl: os.Getenv("THUNDERID_BASE_URL"),
		ouID:    os.Getenv("THUNDERID_OU_ID"),
		httpClient: &http.Client{
			Transport: &http.Transport{
				TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
			},
		},
	}
}

type CreateUserRequest struct {
	OuID       string                 `json:"ouId"`
	Type       string                 `json:"type"`
	Attributes map[string]interface{} `json:"attributes"`
}

type ThunderIDUser struct {
	ID         string                 `json:"id"`
	OuID       string                 `json:"ouId"`
	Type       string                 `json:"type"`
	Attributes map[string]interface{} `json:"attributes"`
}

func (c *Client) getAccessToken(ctx context.Context) (string, error) {
	data := url.Values{}
	data.Set("grant_type", "client_credentials")
	data.Set("client_id", os.Getenv("THUNDERID_CLIENT_ID"))
	data.Set("client_secret", os.Getenv("THUNDERID_CLIENT_SECRET"))
	data.Set("scope", "system")

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

	var result struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	if result.AccessToken == "" {
		return "", fmt.Errorf("empty access token from ThunderID")
	}

	return result.AccessToken, nil
}

func (c *Client) CreateUser(ctx context.Context, userType string, attrs map[string]interface{}) (*ThunderIDUser, error) {
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
		return nil, fmt.Errorf("thunderid error: %s", string(respBody))
	}

	var user ThunderIDUser
	if err := json.Unmarshal(respBody, &user); err != nil {
		return nil, err
	}

	return &user, nil
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
		return fmt.Errorf("thunderid error: %s", string(respBody))
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

	if resp.StatusCode != http.StatusNoContent {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("thunderid error: %s", string(body))
	}

	return nil
}
