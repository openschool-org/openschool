package models

type SearchResultItem struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Subtitle string `json:"subtitle"`
}

// GlobalSearchResponse is the admin header search's bounded, categorized
// result set (top 5 matches per entity) — not a paginated list endpoint.
type GlobalSearchResponse struct {
	Students         []SearchResultItem `json:"students"`
	Teachers         []SearchResultItem `json:"teachers"`
	Guardians        []SearchResultItem `json:"guardians"`
	NonAcademicStaff []SearchResultItem `json:"non_academic_staff"`
}
