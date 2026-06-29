package services

import (
	"context"
	"errors"

	"github.com/google/uuid"
	db "github.com/openschool-org/openschool/db/sqlc"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/repositories"
)

var (
	ErrStreamNotFound      = errors.New("stream not found")
	ErrStreamInUse         = errors.New("stream is assigned to classes and cannot be deleted")
	ErrStreamGroupNotFound = errors.New("stream group not found")
	ErrStreamGroupInUse    = errors.New("stream group is assigned to classes and cannot be deleted")
)

type StreamService struct {
	repo *repositories.StreamRepository
}

func NewStreamService(repo *repositories.StreamRepository) *StreamService {
	return &StreamService{repo: repo}
}

func (s *StreamService) CreateStream(ctx context.Context, req models.CreateStreamRequest) (db.Stream, error) {
	return s.repo.Create(ctx, req.Name)
}

func (s *StreamService) GetStream(ctx context.Context, id uuid.UUID) (db.Stream, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *StreamService) ListStreams(ctx context.Context) ([]db.Stream, error) {
	return s.repo.List(ctx)
}

func (s *StreamService) UpdateStream(ctx context.Context, id uuid.UUID, req models.UpdateStreamRequest) (db.Stream, error) {
	return s.repo.Update(ctx, db.UpdateStreamParams{
		ID:   id,
		Name: req.Name,
	})
}

func (s *StreamService) DeleteStream(ctx context.Context, id uuid.UUID) error {
	rows, err := s.repo.Delete(ctx, id)
	if err != nil {
		return err
	}
	if rows == 0 {
		if _, err := s.repo.GetByID(ctx, id); err != nil {
			return ErrStreamNotFound
		}
		return ErrStreamInUse
	}
	return nil
}

func (s *StreamService) CreateGroup(ctx context.Context, streamID uuid.UUID, req models.CreateStreamGroupRequest) (db.StreamGroup, error) {
	return s.repo.CreateGroup(ctx, db.CreateStreamGroupParams{
		StreamID: streamID,
		Name:     req.Name,
	})
}

func (s *StreamService) GetGroup(ctx context.Context, id uuid.UUID) (db.StreamGroup, error) {
	return s.repo.GetGroupByID(ctx, id)
}

func (s *StreamService) ListGroups(ctx context.Context, streamID uuid.UUID) ([]db.StreamGroup, error) {
	return s.repo.ListGroupsByStream(ctx, streamID)
}

func (s *StreamService) UpdateGroup(ctx context.Context, id uuid.UUID, req models.UpdateStreamGroupRequest) (db.StreamGroup, error) {
	return s.repo.UpdateGroup(ctx, db.UpdateStreamGroupParams{
		ID:   id,
		Name: req.Name,
	})
}

func (s *StreamService) DeleteGroup(ctx context.Context, id uuid.UUID) error {
	rows, err := s.repo.DeleteGroup(ctx, id)
	if err != nil {
		return err
	}
	if rows == 0 {
		if _, err := s.repo.GetGroupByID(ctx, id); err != nil {
			return ErrStreamGroupNotFound
		}
		return ErrStreamGroupInUse
	}
	return nil
}
