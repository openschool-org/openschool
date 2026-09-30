package thunderid

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(request *http.Request) (*http.Response, error) {
	return f(request)
}

func TestGetAccessTokenCachesUsableToken(t *testing.T) {
	t.Setenv("THUNDERID_TOKEN_URL", "https://identity.example/oauth2/token")
	calls := 0
	client := &Client{httpClient: &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		calls++
		if request.Header.Get("Content-Type") != "application/x-www-form-urlencoded" {
			t.Fatalf("unexpected content type: %s", request.Header.Get("Content-Type"))
		}
		return response(http.StatusOK, `{"access_token":"management-token","expires_in":60}`), nil
	})}}

	for range 2 {
		token, err := client.getAccessToken(context.Background())
		if err != nil || token != "management-token" {
			t.Fatalf("getAccessToken() = %q, %v", token, err)
		}
	}
	if calls != 1 {
		t.Fatalf("token endpoint called %d times, want 1", calls)
	}
}

func TestGetAccessTokenDoesNotExposeProviderResponse(t *testing.T) {
	t.Setenv("THUNDERID_TOKEN_URL", "https://identity.example/oauth2/token")
	const sensitiveBody = `{"error":"invalid_client","client_secret":"must-not-leak"}`
	client := &Client{httpClient: &http.Client{Transport: roundTripFunc(func(*http.Request) (*http.Response, error) {
		return response(http.StatusUnauthorized, sensitiveBody), nil
	})}}

	_, err := client.getAccessToken(context.Background())
	if err == nil {
		t.Fatal("expected token endpoint failure")
	}
	if strings.Contains(err.Error(), "must-not-leak") || strings.Contains(err.Error(), "invalid_client") {
		t.Fatalf("provider response leaked through returned error: %v", err)
	}
}

func TestNewClientBoundsProviderCalls(t *testing.T) {
	if timeout := NewClient().httpClient.Timeout; timeout != requestTimeout {
		t.Fatalf("HTTP timeout = %s, want %s", timeout, requestTimeout)
	}
}

func TestUpdatePasswordUsesCredentialsEndpoint(t *testing.T) {
	var method, path string
	var sent map[string]map[string]string
	client := &Client{
		baseUrl:     "https://identity.example",
		cachedToken: "management-token",
		tokenExpiry: time.Now().Add(time.Minute),
		httpClient: &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
			method, path = request.Method, request.URL.Path
			if err := json.NewDecoder(request.Body).Decode(&sent); err != nil {
				t.Fatalf("decode body: %v", err)
			}
			return response(http.StatusNoContent, ""), nil
		})},
	}

	if err := client.UpdatePassword(context.Background(), "user-1", "n3w-Password!"); err != nil {
		t.Fatalf("UpdatePassword() error = %v", err)
	}
	if method != http.MethodPost || path != "/users/user-1/update-credentials" {
		t.Fatalf("request = %s %s", method, path)
	}
	if len(sent) != 1 || len(sent["credentials"]) != 1 || sent["credentials"]["password"] != "n3w-Password!" {
		t.Fatalf("unexpected body: %v", sent)
	}
}

func TestUpdatePasswordReportsProviderRejection(t *testing.T) {
	client := &Client{
		baseUrl:     "https://identity.example",
		cachedToken: "management-token",
		tokenExpiry: time.Now().Add(time.Minute),
		httpClient: &http.Client{Transport: roundTripFunc(func(*http.Request) (*http.Response, error) {
			return response(http.StatusBadRequest, `{"code":"USR-1019"}`), nil
		})},
	}

	if err := client.UpdatePassword(context.Background(), "user-1", "n3w-Password!"); err == nil {
		t.Fatal("expected a 400 from the provider to be returned as an error")
	}
}

func response(status int, body string) *http.Response {
	return &http.Response{
		StatusCode: status,
		Header:     make(http.Header),
		Body:       io.NopCloser(strings.NewReader(body)),
	}
}
