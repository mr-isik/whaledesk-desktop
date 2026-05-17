package ports

import (
	"context"
	"dockit-desktop/internal/domain"
)

type DatabasePort interface {
	SaveAPIRequest(ctx context.Context, req *domain.APIRequest) error
	GetAPIRequests(ctx context.Context) ([]domain.APIRequest, error)
	DeleteAPIRequest(ctx context.Context, id int) error
	ClearAPIRequests(ctx context.Context) error
}
