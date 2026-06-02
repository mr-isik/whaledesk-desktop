package ports

import (
	"context"
	"dockit-desktop/internal/domain"
)

type AIGenerateRequest struct {
	DocInput  string `json:"doc_input"`
}

type AIGenerateResponse struct {
	Method  string            `json:"method"`
	URL     string            `json:"url"`
	Headers map[string]string `json:"headers"`
	Body    string            `json:"body"`
}

type AIPort interface {
	GenerateRequest(ctx context.Context, apiKey string, req *AIGenerateRequest, activeEnvVars map[string]string) (*AIGenerateResponse, error)
}

type AIHistoryPort interface {
	SaveHistory(ctx context.Context, history *domain.AIHistory) error
	GetHistory(ctx context.Context) ([]domain.AIHistory, error)
}
