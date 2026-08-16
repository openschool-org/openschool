package services

import (
	"context"

	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/repositories"
)

type SearchService struct {
	repo *repositories.SearchRepository
}

func NewSearchService(repo *repositories.SearchRepository) *SearchService {
	return &SearchService{repo: repo}
}

func (s *SearchService) Global(ctx context.Context, term string) (models.GlobalSearchResponse, error) {
	resp := models.GlobalSearchResponse{
		Students:         []models.SearchResultItem{},
		Teachers:         []models.SearchResultItem{},
		Guardians:        []models.SearchResultItem{},
		NonAcademicStaff: []models.SearchResultItem{},
	}
	if term == "" {
		return resp, nil
	}

	students, err := s.repo.Students(ctx, term)
	if err != nil {
		return resp, err
	}
	for _, st := range students {
		resp.Students = append(resp.Students, models.SearchResultItem{ID: st.ID.String(), Name: st.FullName, Subtitle: st.IndexNumber})
	}

	teachers, err := s.repo.Teachers(ctx, term)
	if err != nil {
		return resp, err
	}
	for _, t := range teachers {
		resp.Teachers = append(resp.Teachers, models.SearchResultItem{ID: t.ID.String(), Name: t.FullName, Subtitle: t.EmployeeNumber})
	}

	guardians, err := s.repo.Guardians(ctx, term)
	if err != nil {
		return resp, err
	}
	for _, g := range guardians {
		resp.Guardians = append(resp.Guardians, models.SearchResultItem{ID: g.ID.String(), Name: g.FullName, Subtitle: g.Phone})
	}

	staff, err := s.repo.NonAcademicStaff(ctx, term)
	if err != nil {
		return resp, err
	}
	for _, s2 := range staff {
		resp.NonAcademicStaff = append(resp.NonAcademicStaff, models.SearchResultItem{ID: s2.ID.String(), Name: s2.FullName, Subtitle: s2.EmployeeNumber})
	}

	return resp, nil
}
