//go:build integration

package academics

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/testutil/testdb"
)

func TestCreateClassLinksHomeroom(t *testing.T) {
	pool := testdb.Open(t)
	ctx := context.Background()
	repo := newClassRepository(pool)

	var year, grade, lab uuid.UUID
	if err := pool.QueryRow(ctx, "INSERT INTO academic_years (label, start_date, end_date) VALUES ('2027', '2027-01-01', '2027-12-31') RETURNING id").Scan(&year); err != nil {
		t.Fatal(err)
	}
	if err := pool.QueryRow(ctx, "INSERT INTO grades (name, sort_order) VALUES ('Grade 10', 10) RETURNING id").Scan(&grade); err != nil {
		t.Fatal(err)
	}
	if err := pool.QueryRow(ctx, "INSERT INTO classrooms (name, room_type) VALUES ('Science Lab', 'eca') RETURNING id").Scan(&lab); err != nil {
		t.Fatal(err)
	}

	created, err := repo.create(ctx, createClassRequest{GradeID: grade, AcademicYearID: year, Name: "10-A"})
	if err != nil {
		t.Fatal(err)
	}
	if created.HomeClassroomID == nil {
		t.Fatal("a class created without a room should get a homeroom")
	}

	// A second year's 10-A reuses the same room instead of failing on the unique name.
	var nextYear uuid.UUID
	if err := pool.QueryRow(ctx, "INSERT INTO academic_years (label, start_date, end_date) VALUES ('2028', '2028-01-01', '2028-12-31') RETURNING id").Scan(&nextYear); err != nil {
		t.Fatal(err)
	}
	again, err := repo.create(ctx, createClassRequest{GradeID: grade, AcademicYearID: nextYear, Name: "10-a"})
	if err != nil {
		t.Fatal(err)
	}
	if again.HomeClassroomID == nil || *again.HomeClassroomID != *created.HomeClassroomID {
		t.Fatalf("expected the existing 10-A room to be reused, got %v", again.HomeClassroomID)
	}

	// A non-regular room with the class's name is never used as a homeroom.
	clash, err := repo.create(ctx, createClassRequest{GradeID: grade, AcademicYearID: year, Name: "Science Lab"})
	if err != nil {
		t.Fatal(err)
	}
	if clash.HomeClassroomID != nil {
		t.Fatalf("an ECA room must not become a homeroom, got %v", clash.HomeClassroomID)
	}

	// Backfill fills classes created before homerooms were automatic.
	if _, err := pool.Exec(ctx, "INSERT INTO classes (grade_id, academic_year_id, name) VALUES ($1, $2, '10-B')", grade, year); err != nil {
		t.Fatal(err)
	}
	linked, err := repo.backfillHomerooms(ctx, year)
	if err != nil {
		t.Fatal(err)
	}
	if linked != 1 {
		t.Fatalf("backfill linked %d classes, want 1 (10-B only; Science Lab has no regular room)", linked)
	}
}
