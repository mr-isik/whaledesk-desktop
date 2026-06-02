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

	// GUI Data Operations
	GetTableData(ctx context.Context, req domain.TableDataRequest) (*domain.TableDataResult, error)
	InsertRow(ctx context.Context, mutation domain.RowMutation) error
	UpdateRow(ctx context.Context, mutation domain.RowMutation, primaryKey map[string]interface{}) error
	DeleteRows(ctx context.Context, req domain.RowDeleteRequest) (int64, error)
}
