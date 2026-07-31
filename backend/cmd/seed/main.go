// Dev tool: populates 5 students per existing class in the current
// academic year, with realistic Sri Lankan names and a shared temporary
// password, via the real StudentService (so each gets a proper ThunderID
// login + local user row + class enrollment, exactly like the admin UI
// would create them).
//
// Usage: go run ./cmd/seed
package main

import (
	"context"
	"fmt"
	"log"
	"strings"

	"github.com/openschool-org/openschool/internal/asgardeo"
	"github.com/openschool-org/openschool/internal/config"
	"github.com/openschool-org/openschool/internal/database"
	"github.com/openschool-org/openschool/internal/identity"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
	"github.com/openschool-org/openschool/internal/thunderid"
)

const studentsPerClass = 5
const sharedPassword = "Login@123456"

var sinhalaGivenMale = []string{
	"Kasun", "Nuwan", "Chamara", "Dinesh", "Roshan", "Sanjaya", "Prasanna", "Ruwan",
	"Tharindu", "Chathura", "Isuru", "Lahiru", "Kavindu", "Malith", "Dilshan", "Nadun",
	"Sachintha", "Yohan", "Chanaka", "Buddhika",
}
var sinhalaGivenFemale = []string{
	"Nimasha", "Dilrukshi", "Chathurika", "Kavindi", "Sachini", "Nilmini", "Ishara",
	"Tharushi", "Anjali", "Piumi", "Hansika", "Dulmini", "Sewwandi", "Sanduni", "Chamodi",
	"Nethmi", "Sithara", "Vindya", "Kaveesha", "Menaka",
}
var sinhalaSurnames = []string{
	"Perera", "Fernando", "Silva", "Jayawardena", "Gunasekara", "Rathnayake",
	"Wickramasinghe", "Bandara", "Dissanayake", "Kumara", "Herath", "Ranasinghe",
	"Amarasinghe", "Wijesinghe", "Karunaratne", "Weerasinghe", "Senanayake",
	"Abeysekara", "Gunathilaka", "Peiris",
}

var tamilGivenMale = []string{
	"Kavin", "Aravind", "Karthik", "Sanjay", "Prasath", "Vijay", "Kumaran", "Sathish",
	"Yogeswaran", "Mathan",
}
var tamilGivenFemale = []string{
	"Priya", "Nila", "Kavya", "Divya", "Meena", "Sangeetha", "Kalaivani", "Thanuja",
	"Vani", "Roshini",
}
var tamilSurnames = []string{
	"Kumar", "Rajendran", "Selvam", "Sivakumar", "Murugan", "Balasubramaniam",
	"Chandran", "Ganeshan", "Rajaratnam", "Thevar",
}

func newIdentityProvider() identity.Provider {
	if identity.Selected() == "thunderid" {
		return thunderid.NewClient()
	}
	return asgardeo.NewClient()
}

// name deterministically picks a given/family/gender combo for the nth
// student overall, alternating Sinhala/Tamil name pools for variety.
func name(n int) (given, family, gender string) {
	useTamil := n%4 == 3 // ~1 in 4 students from the Tamil name pools
	male := n%2 == 0

	if useTamil {
		family = tamilSurnames[n%len(tamilSurnames)]
		if male {
			return tamilGivenMale[n%len(tamilGivenMale)], family, "male"
		}
		return tamilGivenFemale[n%len(tamilGivenFemale)], family, "female"
	}

	family = sinhalaSurnames[n%len(sinhalaSurnames)]
	if male {
		return sinhalaGivenMale[n%len(sinhalaGivenMale)], family, "male"
	}
	return sinhalaGivenFemale[n%len(sinhalaGivenFemale)], family, "female"
}

func main() {
	config.LoadEnv()

	dsn := database.BuildDSN()
	pool, err := database.Connect(dsn)
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}
	defer pool.Close()

	studentRepo := repositories.NewStudentRepository(pool)
	classRepo := repositories.NewClassRepository(pool)
	studentService := services.NewStudentService(studentRepo, newIdentityProvider())

	ctx := context.Background()

	classes, err := classRepo.ListCurrent(ctx)
	if err != nil {
		log.Fatalf("failed to list current classes: %v", err)
	}
	if len(classes) == 0 {
		log.Fatal("no classes found for the current academic year — set up classes first")
	}
	log.Printf("seeding %d students into %d classes (%d per class)...", len(classes)*studentsPerClass, len(classes), studentsPerClass)

	created, failed := 0, 0
	n := 0

	for _, cls := range classes {
		classLabel := strings.ReplaceAll(strings.ToLower(cls.Name), " ", "")

		for i := 0; i < studentsPerClass; i++ {
			given, family, gender := name(n)
			indexNumber := fmt.Sprintf("2026%04d", n+1)
			email := fmt.Sprintf("%s.%s%d@student.openschool.test", strings.ToLower(given), strings.ToLower(family), n+1)

			student, err := studentService.CreateStudent(ctx, models.CreateStudentRequest{
				Email:       email,
				GivenName:   given,
				FamilyName:  family,
				Password:    sharedPassword,
				IndexNumber: indexNumber,
				Gender:      gender,
			})
			if err != nil {
				log.Printf("  ✗ failed to create student for %s (%s %s): %v", cls.Name, given, family, err)
				failed++
				n++
				continue
			}

			if err := classRepo.EnrollStudent(ctx, cls.ID, student.ID); err != nil {
				log.Printf("  ✗ created %s %s but failed to enroll into %s: %v", given, family, cls.Name, err)
				failed++
				n++
				continue
			}

			created++
			n++
		}
		log.Printf("  ✓ %s (%s): %d students", cls.Name, classLabel, studentsPerClass)
	}

	log.Printf("done: %d created, %d failed. Shared password for all: %s", created, failed, sharedPassword)
}
