package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/models"
	"github.com/openschool-org/openschool/internal/services"
)

type GradeSubjectHandler struct {
	service *services.GradeSubjectService
}

func NewGradeSubjectHandler(service *services.GradeSubjectService) *GradeSubjectHandler {
	return &GradeSubjectHandler{service: service}
}

// AssignSubjectToGrade godoc
// @Summary      Assign subject to grade
// @Description  Assign a subject to be offered at a specific grade
// @Tags         grade-subjects
// @Accept       json
// @Produce      json
// @Param        id      path      string                              true  "Grade UUID"
// @Param        request body      models.AssignSubjectToGradeRequest  true  "Subject details"
// @Success      200     {object}  map[string]string
// @Failure      400     {object}  map[string]string
// @Security     BearerAuth
// @Router       /grades/{id}/subjects [post]
func (h *GradeSubjectHandler) AssignSubjectToGrade(c *gin.Context) {
	gradeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid grade id"})
		return
	}

	var req models.AssignSubjectToGradeRequest
	if err := bindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.AssignSubject(c.Request.Context(), gradeID, req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "subject assigned to grade"})
}

// RemoveSubjectFromGrade godoc
// @Summary      Remove subject from grade
// @Description  Remove a subject assignment from a specific grade
// @Tags         grade-subjects
// @Produce      json
// @Param        id         path      string  true  "Grade UUID"
// @Param        subject_id path      string  true  "Subject UUID"
// @Success      200        {object}  map[string]string
// @Failure      400        {object}  map[string]string
// @Security     BearerAuth
// @Router       /grades/{id}/subjects/{subject_id} [delete]
func (h *GradeSubjectHandler) RemoveSubjectFromGrade(c *gin.Context) {
	gradeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid grade id"})
		return
	}

	subjectID, err := uuid.Parse(c.Param("subject_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid subject id"})
		return
	}

	if err := h.service.RemoveSubject(c.Request.Context(), gradeID, subjectID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "subject removed from grade"})
}

// ListSubjectsByGrade godoc
// @Summary      List subjects for grade
// @Description  Retrieve all subjects assigned to a specific grade
// @Tags         grade-subjects
// @Produce      json
// @Param        id  path      string  true  "Grade UUID"
// @Success      200 {array}   models.SubjectResponse
// @Failure      400 {object}  map[string]string
// @Failure      500 {object}  map[string]string
// @Security     BearerAuth
// @Router       /grades/{id}/subjects [get]
func (h *GradeSubjectHandler) ListSubjectsByGrade(c *gin.Context) {
	gradeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid grade id"})
		return
	}

	subjects, err := h.service.ListSubjectsByGrade(c.Request.Context(), gradeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	resp := make([]models.SubjectResponse, len(subjects))
	for i, s := range subjects {
		resp[i] = models.SubjectResponse{
			ID:        s.ID.String(),
			Name:      s.Name,
			Code:      s.Code,
			CreatedAt: s.CreatedAt.Time.String(),
		}
	}

	c.JSON(http.StatusOK, resp)
}

// CreateSubjectBucket godoc
// @Summary      Create subject bucket
// @Description  Create an elective subject bucket for a grade
// @Tags         grade-subjects
// @Accept       json
// @Produce      json
// @Param        id      path      string                          true  "Grade UUID"
// @Param        request body      models.CreateSubjectBucketRequest  true  "Bucket details"
// @Success      201     {object}  models.SubjectBucketResponse
// @Failure      400     {object}  map[string]string
// @Security     BearerAuth
// @Router       /grades/{id}/buckets [post]
func (h *GradeSubjectHandler) CreateSubjectBucket(c *gin.Context) {
	gradeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid grade id"})
		return
	}

	var req models.CreateSubjectBucketRequest
	if err := bindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	bucket, err := h.service.CreateBucket(c.Request.Context(), gradeID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, models.SubjectBucketResponse{
		ID:        bucket.ID.String(),
		GradeID:   bucket.GradeID.String(),
		Name:      bucket.Name,
		CreatedAt: bucket.CreatedAt.Time.String(),
	})
}

// ListSubjectBuckets godoc
// @Summary      List subject buckets
// @Description  Retrieve all elective subject buckets for a grade
// @Tags         grade-subjects
// @Produce      json
// @Param        id  path      string  true  "Grade UUID"
// @Success      200 {array}   models.SubjectBucketResponse
// @Failure      400 {object}  map[string]string
// @Failure      500 {object}  map[string]string
// @Security     BearerAuth
// @Router       /grades/{id}/buckets [get]
func (h *GradeSubjectHandler) ListSubjectBuckets(c *gin.Context) {
	gradeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid grade id"})
		return
	}

	buckets, err := h.service.ListBucketsByGrade(c.Request.Context(), gradeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	resp := make([]models.SubjectBucketResponse, len(buckets))
	for i, b := range buckets {
		resp[i] = models.SubjectBucketResponse{
			ID:        b.ID.String(),
			GradeID:   b.GradeID.String(),
			Name:      b.Name,
			CreatedAt: b.CreatedAt.Time.String(),
		}
	}

	c.JSON(http.StatusOK, resp)
}

// AddSubjectToBucket godoc
// @Summary      Add subject to bucket
// @Description  Add a subject as an option in an elective bucket
// @Tags         grade-subjects
// @Accept       json
// @Produce      json
// @Param        id        path      string                        true  "Grade UUID"
// @Param        bucket_id path      string                        true  "Bucket UUID"
// @Param        request   body      models.AddSubjectToBucketRequest  true  "Subject details"
// @Success      200       {object}  map[string]string
// @Failure      400       {object}  map[string]string
// @Security     BearerAuth
// @Router       /grades/{id}/buckets/{bucket_id}/subjects [post]
func (h *GradeSubjectHandler) AddSubjectToBucket(c *gin.Context) {
	if _, err := uuid.Parse(c.Param("id")); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid grade id"})
		return
	}

	bucketID, err := uuid.Parse(c.Param("bucket_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid bucket id"})
		return
	}

	var req models.AddSubjectToBucketRequest
	if err := bindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.AddSubjectToBucket(c.Request.Context(), bucketID, req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "subject added to bucket"})
}

// ListBucketOptions godoc
// @Summary      List bucket options
// @Description  Retrieve all subjects available in an elective bucket
// @Tags         grade-subjects
// @Produce      json
// @Param        id        path      string  true  "Grade UUID"
// @Param        bucket_id path      string  true  "Bucket UUID"
// @Success      200       {array}   models.SubjectResponse
// @Failure      400       {object}  map[string]string
// @Failure      500       {object}  map[string]string
// @Security     BearerAuth
// @Router       /grades/{id}/buckets/{bucket_id}/subjects [get]
func (h *GradeSubjectHandler) ListBucketOptions(c *gin.Context) {
	if _, err := uuid.Parse(c.Param("id")); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid grade id"})
		return
	}

	bucketID, err := uuid.Parse(c.Param("bucket_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid bucket id"})
		return
	}

	subjects, err := h.service.ListBucketOptions(c.Request.Context(), bucketID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	resp := make([]models.SubjectResponse, len(subjects))
	for i, s := range subjects {
		resp[i] = models.SubjectResponse{
			ID:        s.ID.String(),
			Name:      s.Name,
			Code:      s.Code,
			CreatedAt: s.CreatedAt.Time.String(),
		}
	}

	c.JSON(http.StatusOK, resp)
}
