package people

import (
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	db "github.com/openschool-org/openschool/db/sqlc"
	"github.com/openschool-org/openschool/internal/platform/httpx"
)

func contextWithRoles(roles ...string) *gin.Context {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Set("roles", roles)
	return c
}

func TestHideNICBlanksForTeachersOnly(t *testing.T) {
	page := httpx.Page[db.ListGuardiansRow]{Items: []db.ListGuardiansRow{{NicNumber: "200012345678"}}}

	got := hideNIC(contextWithRoles("teacher"), page).(httpx.Page[db.ListGuardiansRow])
	if got.Items[0].NicNumber != "" {
		t.Fatalf("teacher saw NIC %q", got.Items[0].NicNumber)
	}
	if hideNIC(contextWithRoles("teacher"), db.GetTeacherByIDRow{NicNumber: "x"}).(db.GetTeacherByIDRow).NicNumber != "" {
		t.Fatal("teacher saw another teacher's NIC")
	}

	page.Items[0].NicNumber = "200012345678"
	admin := hideNIC(contextWithRoles("admin"), page).(httpx.Page[db.ListGuardiansRow])
	if admin.Items[0].NicNumber != "200012345678" {
		t.Fatal("admin must still see the NIC")
	}
}
