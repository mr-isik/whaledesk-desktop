package bindings

import (
	"context"
	"dockit-desktop/internal/domain"
	"dockit-desktop/internal/usecase"
)

type DatabaseBinding struct {
	ctx context.Context
	uc  *usecase.DatabaseUsecase
}

func NewDatabaseBinding(uc *usecase.DatabaseUsecase) *DatabaseBinding {
	return &DatabaseBinding{uc: uc}
}

func (b *DatabaseBinding) Startup(ctx context.Context) {
	b.ctx = ctx
}

func (b *DatabaseBinding) GetRequestHistory() ([]domain.APIRequest, error) {
	return b.uc.GetRequestHistory(b.ctx)
}

func (b *DatabaseBinding) DeleteRequest(id int) error {
	return b.uc.DeleteRequest(b.ctx, id)
}

func (b *DatabaseBinding) ClearHistory() error {
	return b.uc.ClearHistory(b.ctx)
}
