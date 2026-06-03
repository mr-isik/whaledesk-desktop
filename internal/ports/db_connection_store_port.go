package ports

import (
	"context"
	"whaledesk-desktop/internal/domain"
)

type DbConnectionStorePort interface {
	SaveConnection(ctx context.Context, conn *domain.DbConnection, encryptedPassword string) error
	ListConnections(ctx context.Context) ([]domain.DbConnection, error)
	DeleteConnection(ctx context.Context, id string) error
	UpdateConnection(ctx context.Context, conn *domain.DbConnection, encryptedPassword string) error
}
