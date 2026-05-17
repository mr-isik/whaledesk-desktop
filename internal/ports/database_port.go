package ports

import (
	"context"
	"dockit-desktop/internal/domain"
)

// DatabasePort, veritabanı işlemleri için gerekli interface'i tanımlar.
type DatabasePort interface {
	SaveAPIRequest(ctx context.Context, req *domain.APIRequest) error
	GetAPIRequests(ctx context.Context) ([]domain.APIRequest, error)
	DeleteAPIRequest(ctx context.Context, id int) error
	ClearAPIRequests(ctx context.Context) error
}
