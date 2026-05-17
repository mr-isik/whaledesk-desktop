package ports

import (
	"context"
	"dockit-desktop/internal/domain"
)

type DbManagerPort interface {
	Connect(ctx context.Context, conn domain.DbConnection) error

	Disconnect(ctx context.Context) error

	Ping(ctx context.Context) error

	ListDatabases(ctx context.Context) ([]domain.DbDatabase, error)

	ListSchemas(ctx context.Context) ([]domain.DbSchema, error)

	ListTables(ctx context.Context, schema string) ([]domain.DbTable, error)

	DescribeTable(ctx context.Context, schema, table string) ([]domain.DbColumn, error)

	ExecuteQuery(ctx context.Context, query string) (*domain.QueryResult, error)
}
