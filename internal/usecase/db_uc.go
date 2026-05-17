package usecase

import (
	"context"
	"dockit-desktop/internal/domain"
	"dockit-desktop/internal/ports"
)

// DatabaseUsecase, geçmiş API isteklerine ait iş mantığını yönetir.
type DatabaseUsecase struct {
	dbPort ports.DatabasePort
}

func NewDatabaseUsecase(db ports.DatabasePort) *DatabaseUsecase {
	return &DatabaseUsecase{dbPort: db}
}

// GetRequestHistory, en son 200 API isteğini döndürür.
func (uc *DatabaseUsecase) GetRequestHistory(ctx context.Context) ([]domain.APIRequest, error) {
	return uc.dbPort.GetAPIRequests(ctx)
}

// DeleteRequest, belirtilen ID'ye sahip kaydı siler.
func (uc *DatabaseUsecase) DeleteRequest(ctx context.Context, id int) error {
	return uc.dbPort.DeleteAPIRequest(ctx, id)
}

// ClearHistory, tüm API isteği geçmişini temizler.
func (uc *DatabaseUsecase) ClearHistory(ctx context.Context) error {
	return uc.dbPort.ClearAPIRequests(ctx)
}
