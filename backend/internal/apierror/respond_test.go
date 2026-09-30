package apierror

import (
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

func TestRespondHidesDatabaseDetail(t *testing.T) {
	gin.SetMode(gin.TestMode)
	cases := []struct {
		err      error
		code     int
		mustHide string
	}{
		{fmt.Errorf("load: %w", pgx.ErrNoRows), http.StatusNotFound, "no rows"},
		{&pgconn.PgError{Code: "23505", ConstraintName: "classes_grade_id_key"}, http.StatusConflict, "classes_grade_id_key"},
		{&pgconn.PgError{Code: "23503", TableName: "class_students"}, http.StatusConflict, "class_students"},
		{&pgconn.PgError{Code: "42P01", Message: "relation \"secret_table\" does not exist"}, http.StatusInternalServerError, "secret_table"},
		{errors.New("cannot delete class with 3 enrolled students"), http.StatusBadRequest, ""},
	}
	for _, tc := range cases {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(http.MethodGet, "/", nil)
		Respond(c, tc.err)
		if w.Code != tc.code || (tc.mustHide != "" && strings.Contains(w.Body.String(), tc.mustHide)) {
			t.Errorf("%v: code=%d body=%s", tc.err, w.Code, w.Body.String())
		}
	}
}
