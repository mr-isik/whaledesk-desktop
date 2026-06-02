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

func (b *AIBinding) GenerateRequest(docInput string) (*ports.AIGenerateResponse, error) {
	return b.uc.GenerateRequest(b.ctx, docInput)
}

func (b *AIBinding) GetHistory() ([]domain.AIHistory, error) {
	return b.uc.GetHistory(b.ctx)
}
