package bindings

import (
	"context"
	"dockit-desktop/internal/domain"
	"dockit-desktop/internal/ports"
	"dockit-desktop/internal/usecase"
)

type AIBinding struct {
	ctx context.Context
	uc  *usecase.AIUsecase
}

func NewAIBinding(uc *usecase.AIUsecase) *AIBinding {
	return &AIBinding{uc: uc}
}

func (b *AIBinding) Startup(ctx context.Context) {
	b.ctx = ctx
}

// GenerateRequest for backward compatibility single generation
func (b *AIBinding) GenerateRequest(docInput string) (*ports.AIGenerateResponse, error) {
	return b.uc.GenerateRequest(b.ctx, docInput)
}

func (b *AIBinding) GenerateCollection(name string, docInput string) (*domain.AICollection, error) {
	return b.uc.GenerateCollection(b.ctx, name, docInput)
}

func (b *AIBinding) ListCollections() ([]domain.AICollection, error) {
	return b.uc.ListCollections(b.ctx)
}

func (b *AIBinding) DeleteCollection(id int) error {
	return b.uc.DeleteCollection(b.ctx, id)
}

func (b *AIBinding) GetCollectionItems(collectionID int) ([]domain.AICollectionItem, error) {
	return b.uc.GetCollectionItems(b.ctx, collectionID)
}

type CollectionPageResult struct {
	Items    []domain.AICollectionItem `json:"items"`
	Total    int                       `json:"total"`
	Page     int                       `json:"page"`
	PageSize int                       `json:"page_size"`
}

func (b *AIBinding) GetCollectionItemPage(collectionID int, page int, pageSize int) (*CollectionPageResult, error) {
	items, total, err := b.uc.GetCollectionItemPage(b.ctx, collectionID, page, pageSize)
	if err != nil {
		return nil, err
	}
	return &CollectionPageResult{
		Items:    items,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}
