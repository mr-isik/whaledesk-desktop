package bindings

import (
	"context"
	"dockit-desktop/internal/domain"
	"dockit-desktop/internal/usecase"
)

type APIBinding struct {
	ctx context.Context
	uc  *usecase.APIUsecase
}

func NewAPIBinding(uc *usecase.APIUsecase) *APIBinding {
	return &APIBinding{
		uc: uc,
	}
}

func (b *APIBinding) Startup(ctx context.Context) {
	b.ctx = ctx
}

func (b *APIBinding) ExecuteRequest(method, url, payload string) (*domain.APIRequest, error) {
	return b.uc.ExecuteAndSaveRequest(b.ctx, method, url, payload)
}
