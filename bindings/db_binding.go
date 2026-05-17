package bindings

import (
	"context"
	"dockit-desktop/internal/domain"
	"dockit-desktop/internal/usecase"
)

// DatabaseBinding, frontend'in veritabanı işlemleri için çağırabileceği metodları sunar.
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

// GetRequestHistory, geçmişte yapılan API isteklerini döndürür.
func (b *DatabaseBinding) GetRequestHistory() ([]domain.APIRequest, error) {
	return b.uc.GetRequestHistory(b.ctx)
}

// DeleteRequest, belirtilen ID'ye sahip kaydı siler.
func (b *DatabaseBinding) DeleteRequest(id int) error {
	return b.uc.DeleteRequest(b.ctx, id)
}

// ClearHistory, tüm geçmişi temizler.
func (b *DatabaseBinding) ClearHistory() error {
	return b.uc.ClearHistory(b.ctx)
}
