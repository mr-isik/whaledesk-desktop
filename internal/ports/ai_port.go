package ports

import (
	"context"
	"dockit-desktop/internal/domain"
)

type AIGenerateRequest struct {
	DocInput string `json:"doc_input"`
}

type AIGenerateResponse struct {
	Name        string            `json:"name"`
	Description string            `json:"description"`
	Method      string            `json:"method"`
	URL         string            `json:"url"`
	Headers     map[string]string `json:"headers"`
	Body        string            `json:"body"`
}

type AIGenerateBatchResponse struct {
	Endpoints []AIGenerateResponse `json:"endpoints"`
}

type AIPort interface {
	GenerateRequest(ctx context.Context, apiKey string, req *AIGenerateRequest, activeEnvVars map[string]string) (*AIGenerateResponse, error)
	GenerateBatchRequests(ctx context.Context, apiKey string, docInput string, activeEnvVars map[string]string) (*AIGenerateBatchResponse, error)
}

type AICollectionPort interface {
	CreateCollection(ctx context.Context, collection *domain.AICollection) error
	ListCollections(ctx context.Context) ([]domain.AICollection, error)
	DeleteCollection(ctx context.Context, id int) error
	AddCollectionItems(ctx context.Context, collectionID int, items []domain.AICollectionItem) error
	GetCollectionItems(ctx context.Context, collectionID int) ([]domain.AICollectionItem, error)
	GetCollectionItemPage(ctx context.Context, collectionID int, page int, pageSize int) ([]domain.AICollectionItem, int, error)
}
