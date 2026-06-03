package bindings

import (
	"context"
	"encoding/json"
	"whaledesk-desktop/internal/domain"
	"whaledesk-desktop/internal/usecase"
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

func (b *APIBinding) ExecuteRequest(method, url, payload, headersJSON string) (*domain.APIRequest, error) {
	var headers map[string]string
	if headersJSON != "" {
		_ = json.Unmarshal([]byte(headersJSON), &headers)
	}
	return b.uc.ExecuteAndSaveRequest(b.ctx, method, url, payload, headers)
}
