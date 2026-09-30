package apierror

import (
	"context"
	"errors"
	"net"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// Respond maps database errors to safe messages and treats any other error as a hand-written 400 message.
func Respond(c *gin.Context, err error) {
	var pgErr *pgconn.PgError
	var connErr *pgconn.ConnectError
	var netErr net.Error
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
	case errors.As(err, &pgErr) && pgErr.Code == "23505":
		c.JSON(http.StatusConflict, gin.H{"error": "a record with these details already exists"})
	case errors.As(err, &pgErr) && pgErr.Code == "23503":
		c.JSON(http.StatusConflict, gin.H{"error": "this is still linked to other records, or refers to one that does not exist"})
	case errors.As(err, &pgErr) && (pgErr.Code == "23514" || strings.HasPrefix(pgErr.Code, "22")):
		c.JSON(http.StatusBadRequest, gin.H{"error": "one of the values is not allowed"})
	case errors.As(err, &pgErr), errors.As(err, &connErr), errors.As(err, &netErr),
		errors.Is(err, context.Canceled), errors.Is(err, context.DeadlineExceeded):
		RespondInternal(c, err)
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	}
}
