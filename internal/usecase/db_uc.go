package usecase

import (
	"context"
	"whaledesk-desktop/internal/domain"
	"whaledesk-desktop/internal/ports"
)

type DatabaseUsecase struct {
	dbPort ports.DatabasePort
}

func NewDatabaseUsecase(db ports.DatabasePort) *DatabaseUsecase {
	return &DatabaseUsecase{dbPort: db}
}

func (uc *DatabaseUsecase) GetRequestHistory(ctx context.Context) ([]domain.APIRequest, error) {
	return uc.dbPort.GetAPIRequests(ctx)
}

func (uc *DatabaseUsecase) DeleteRequest(ctx context.Context, id int) error {
	return uc.dbPort.DeleteAPIRequest(ctx, id)
}

func (uc *DatabaseUsecase) ClearHistory(ctx context.Context) error {
	return uc.dbPort.ClearAPIRequests(ctx)
}
