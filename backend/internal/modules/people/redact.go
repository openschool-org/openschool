package people

import (
	"github.com/gin-gonic/gin"
	"github.com/openschool-org/openschool/internal/authz"
	"github.com/openschool-org/openschool/internal/middleware"
)

// hideNIC blanks NIC numbers for everyone but admins: a new teacher or guardian login starts with the NIC as its password.
func hideNIC(c *gin.Context, value any) any {
	if middleware.HasRole(c, authz.RoleAdmin) {
		return value
	}
	return withoutNIC(value)
}
