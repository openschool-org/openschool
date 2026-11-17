package architecture

import (
	"go/parser"
	"go/token"
	"io/fs"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"testing"
)

const modulePath = "github.com/openschool-org/openschool/"

func TestDependencyBoundaries(t *testing.T) {
	root := internalRoot(t)
	err := filepath.WalkDir(root, func(path string, entry fs.DirEntry, walkErr error) error {
		if walkErr != nil || entry.IsDir() || !strings.HasSuffix(path, ".go") || strings.HasSuffix(path, "_test.go") {
			return walkErr
		}
		rel, err := filepath.Rel(root, path)
		if err != nil {
			return err
		}
		rel = filepath.ToSlash(rel)
		imports := fileImports(t, path)
		if strings.HasPrefix(rel, "repositories/") {
			t.Errorf("%s adds a horizontal repository; add persistence to its owning module", rel)
		}
		if strings.HasPrefix(rel, "models/") {
			t.Errorf("%s adds a global model; add the contract to its owning module", rel)
		}
		if strings.HasPrefix(rel, "routes/") {
			t.Errorf("%s adds a route bridge; register the owning module from internal/app", rel)
		}

		if strings.HasPrefix(rel, "handlers/") {
			t.Errorf("%s adds a horizontal handler; add HTTP behavior to its owning module", rel)
		}
		if strings.HasPrefix(rel, "services/") {
			t.Errorf("%s adds a horizontal service; add the use case to its owning module", rel)
		}
		if strings.HasPrefix(rel, "identity/") {
			t.Errorf("%s adds an ambiguous shared identity package; use internal/idp, internal/authz, or internal/modules/identity", rel)
		}
		if imports[modulePath+"db/sqlc"] && !isRepositoryAdapter(rel) {
			t.Errorf("%s imports sqlc outside a module repository adapter", rel)
		}

		if strings.HasPrefix(rel, "modules/") {
			for _, legacy := range []string{"internal/handlers", "internal/services", "internal/repositories"} {
				if imports[modulePath+legacy] {
					t.Errorf("%s imports legacy package %s", rel, legacy)
				}
			}
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

// isRepositoryAdapter reports whether a file is a module's persistence adapter: repository.go,
// or repository_<area>.go when one module's repository is split by area.
func isRepositoryAdapter(rel string) bool {
	if !strings.HasPrefix(rel, "modules/") {
		return false
	}
	base := filepath.Base(rel)
	return base == "repository.go" || (strings.HasPrefix(base, "repository_") && strings.HasSuffix(base, ".go"))
}

func TestIsRepositoryAdapter(t *testing.T) {
	for rel, want := range map[string]bool{
		"modules/timetable/repository.go":       true,
		"modules/timetable/repository_setup.go": true,
		"modules/timetable/service.go":          false,
		"modules/timetable/repo_setup.go":       false,
		"platform/httpx/repository.go":          false,
		"app/repository_setup.go":               false,
	} {
		if got := isRepositoryAdapter(rel); got != want {
			t.Errorf("isRepositoryAdapter(%q) = %v, want %v", rel, got, want)
		}
	}
}

func internalRoot(t *testing.T) string {
	t.Helper()
	_, current, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("cannot locate architecture test")
	}
	return filepath.Clean(filepath.Join(filepath.Dir(current), ".."))
}

func fileImports(t *testing.T, path string) map[string]bool {
	t.Helper()
	file, err := parser.ParseFile(token.NewFileSet(), path, nil, parser.ImportsOnly)
	if err != nil {
		t.Fatalf("parse %s: %v", path, err)
	}
	imports := make(map[string]bool, len(file.Imports))
	for _, spec := range file.Imports {
		value, err := strconv.Unquote(spec.Path.Value)
		if err != nil {
			t.Fatalf("parse import in %s: %v", path, err)
		}
		imports[value] = true
	}
	return imports
}
