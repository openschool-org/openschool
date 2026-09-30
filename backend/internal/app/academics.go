package app

import (
	"github.com/jackc/pgx/v5/pgxpool"
	academicsmodule "github.com/openschool-org/openschool/internal/modules/academics"
	"github.com/openschool-org/openschool/internal/ports"
)

func registerAcademics(groups HTTPGroups, pool *pgxpool.Pool, access ports.ClassAccess, audit ports.AuditRecorder) {
	academicsmodule.RegisterSubjectRoutes(groups.Admin, groups.TeacherOrAdmin, pool)
	academicsmodule.RegisterStreamRoutes(groups.Admin, groups.TeacherOrAdmin, pool)
	academicsmodule.RegisterClassRoutes(groups.Admin, groups.TeacherOrAdmin, pool, access, audit)
	academicsmodule.RegisterEnrollmentRoutes(groups.Admin, groups.TeacherOrAdmin, groups.StudentAccess, groups.Protected, academicsmodule.NewEnrollmentRepository(pool))
	academicsmodule.RegisterPromotionRoutes(groups.Admin, academicsmodule.NewPromotionService(academicsmodule.NewPromotionRepository(pool)))
	academicsmodule.RegisterTermMarkRoutes(groups.TeacherOrAdmin, academicsmodule.NewTermMarkService(academicsmodule.NewTermMarkRepository(pool)))
}
