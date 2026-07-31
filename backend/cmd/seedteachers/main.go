// Dev tool: creates a batch of teachers with realistic Sri Lankan names and
// a shared temporary password, via the real TeacherService (proper
// ThunderID login + local user row + teacher profile, exactly like the
// admin UI would create them).
//
// Usage: go run ./cmd/seedteachers [count]   (defaults to 80)
package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/openschool-org/openschool/internal/config"
	"github.com/openschool-org/openschool/internal/database"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/repositories"
	"github.com/openschool-org/openschool/internal/services"
	"github.com/openschool-org/openschool/internal/thunderid"
)

const defaultCount = 80
const sharedPassword = "Login@123456"

var sinhalaGivenMale = []string{
	"Kasun", "Nuwan", "Chamara", "Dinesh", "Roshan", "Sanjaya", "Prasanna", "Ruwan",
	"Tharindu", "Chathura", "Isuru", "Lahiru", "Kavindu", "Malith", "Dilshan", "Nadun",
	"Sachintha", "Yohan", "Chanaka", "Buddhika", "Ajith", "Sunil", "Priyantha", "Mahesh",
}
var sinhalaGivenFemale = []string{
	"Nimasha", "Dilrukshi", "Chathurika", "Kavindi", "Sachini", "Nilmini", "Ishara",
	"Tharushi", "Anjali", "Piumi", "Hansika", "Dulmini", "Sewwandi", "Sanduni", "Chamodi",
	"Nethmi", "Sithara", "Vindya", "Kaveesha", "Menaka", "Kumari", "Shirani", "Priyanka",
}
var sinhalaSurnames = []string{
	"Perera", "Fernando", "Silva", "Jayawardena", "Gunasekara", "Rathnayake",
	"Wickramasinghe", "Bandara", "Dissanayake", "Kumara", "Herath", "Ranasinghe",
	"Amarasinghe", "Wijesinghe", "Karunaratne", "Weerasinghe", "Senanayake",
	"Abeysekara", "Gunathilaka", "Peiris", "Jayasuriya", "Mendis",
}

var tamilGivenMale = []string{
	"Kavin", "Aravind", "Karthik", "Sanjay", "Prasath", "Vijay", "Kumaran", "Sathish",
	"Yogeswaran", "Mathan", "Ganesh", "Suresh",
}
var tamilGivenFemale = []string{
	"Priya", "Nila", "Kavya", "Divya", "Meena", "Sangeetha", "Kalaivani", "Thanuja",
	"Vani", "Roshini", "Malar", "Suganthi",
}
var tamilSurnames = []string{
	"Kumar", "Rajendran", "Selvam", "Sivakumar", "Murugan", "Balasubramaniam",
	"Chandran", "Ganeshan", "Rajaratnam", "Thevar", "Nadarajah", "Subramaniam",
}

var titlesMale = []string{"Mr", "Dr", "Prof"}
var titlesFemale = []string{"Mrs", "Ms", "Miss", "Dr"}

func name(n int) (given, family, gender, title string) {
	useTamil := n%4 == 3
	male := n%2 == 0

	if useTamil {
		family = tamilSurnames[n%len(tamilSurnames)]
		if male {
			given = tamilGivenMale[n%len(tamilGivenMale)]
		} else {
			given = tamilGivenFemale[n%len(tamilGivenFemale)]
		}
	} else {
		family = sinhalaSurnames[n%len(sinhalaSurnames)]
		if male {
			given = sinhalaGivenMale[n%len(sinhalaGivenMale)]
		} else {
			given = sinhalaGivenFemale[n%len(sinhalaGivenFemale)]
		}
	}

	if male {
		gender = "male"
		title = titlesMale[n%len(titlesMale)]
	} else {
		gender = "female"
		title = titlesFemale[n%len(titlesFemale)]
	}
	return given, family, gender, title
}

func main() {
	count := defaultCount
	if len(os.Args) > 1 {
		if n, err := strconv.Atoi(os.Args[1]); err == nil && n > 0 {
			count = n
		}
	}

	config.LoadEnv()

	dsn := database.BuildDSN()
	pool, err := database.Connect(dsn)
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}
	defer pool.Close()

	teacherRepo := repositories.NewTeacherRepository(pool)
	teacherService := services.NewTeacherService(teacherRepo, thunderid.NewClient())

	ctx := context.Background()
	log.Printf("seeding %d teachers...", count)

	created, failed := 0, 0
	baseJoinYear := time.Now().Year() - 10

	for n := 0; n < count; n++ {
		given, family, gender, title := name(n)
		employeeNumber := fmt.Sprintf("T2026%03d", n+1)
		email := fmt.Sprintf("%s.%s%d@teacher.openschool.test", strings.ToLower(given), strings.ToLower(family), n+1)
		joinedDate := time.Date(baseJoinYear+(n%10), time.Month((n%12)+1), (n%28)+1, 0, 0, 0, 0, time.UTC)

		_, err := teacherService.CreateTeacher(ctx, models.CreateTeacherRequest{
			Email:          email,
			GivenName:      given,
			FamilyName:     family,
			Password:       sharedPassword,
			EmployeeNumber: employeeNumber,
			JoinedDate:     joinedDate,
			Title:          title,
			Gender:         gender,
		})
		if err != nil {
			log.Printf("  ✗ failed to create teacher %s %s (%s): %v", given, family, employeeNumber, err)
			failed++
			continue
		}

		created++
		if created%10 == 0 {
			log.Printf("  ✓ %d/%d created...", created, count)
		}
	}

	log.Printf("done: %d created, %d failed. Shared password for all: %s", created, failed, sharedPassword)
}
