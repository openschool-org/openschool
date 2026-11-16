package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestCacheReferenceSetsCacheControlAndETag(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/grades", CacheReference(300), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"grades": []string{"Grade 1"}})
	})

	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/grades", nil))

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d", response.Code)
	}
	if response.Header().Get("Cache-Control") != "private, max-age=300" {
		t.Fatalf("Cache-Control = %q", response.Header().Get("Cache-Control"))
	}
	etag := response.Header().Get("ETag")
	if etag == "" {
		t.Fatal("ETag header not set")
	}
	if response.Body.Len() == 0 {
		t.Fatal("response body was not written")
	}
}

func TestCacheReferenceReturns304WhenETagMatches(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/grades", CacheReference(300), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"grades": []string{"Grade 1"}})
	})

	first := httptest.NewRecorder()
	router.ServeHTTP(first, httptest.NewRequest(http.MethodGet, "/grades", nil))
	etag := first.Header().Get("ETag")

	request := httptest.NewRequest(http.MethodGet, "/grades", nil)
	request.Header.Set("If-None-Match", etag)
	second := httptest.NewRecorder()
	router.ServeHTTP(second, request)

	if second.Code != http.StatusNotModified {
		t.Fatalf("status = %d, want 304", second.Code)
	}
	if second.Body.Len() != 0 {
		t.Fatalf("304 response carried a body: %q", second.Body.String())
	}
}

func TestCacheReferenceSkipsCachingOnNonOKStatus(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/grades", CacheReference(300), func(c *gin.Context) {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "boom"})
	})

	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/grades", nil))

	if response.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want 500", response.Code)
	}
	if response.Header().Get("ETag") != "" {
		t.Fatal("ETag should not be set on a non-200 response")
	}
}

func TestCacheReferenceZeroMeansRevalidate(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/grades", CacheReference(0), func(c *gin.Context) { c.JSON(http.StatusOK, []string{"Grade 6"}) })
	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/grades", nil))
	if got := response.Header().Get("Cache-Control"); got != "private, no-cache" {
		t.Fatalf("Cache-Control = %q, want private, no-cache", got)
	}
	if response.Header().Get("ETag") == "" {
		t.Fatal("no ETag, so revalidation could not return 304")
	}
}
