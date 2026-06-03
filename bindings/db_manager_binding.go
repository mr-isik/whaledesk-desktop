package bindings

import (
	"context"
	"whaledesk-desktop/internal/domain"
	"whaledesk-desktop/internal/usecase"
)

type DbManagerBinding struct {
	ctx context.Context
	uc  *usecase.DbManagerUsecase
}

func NewDbManagerBinding(uc *usecase.DbManagerUsecase) *DbManagerBinding {
	return &DbManagerBinding{uc: uc}
}

func (b *DbManagerBinding) Startup(ctx context.Context) {
	b.ctx = ctx
}

func (b *DbManagerBinding) AddConnection(conn domain.DbConnection) (domain.DbConnection, error) {
	return b.uc.AddConnection(b.ctx, conn)
}

func (b *DbManagerBinding) ListConnections() ([]domain.DbConnection, error) {
	return b.uc.ListConnections(b.ctx)
}

func (b *DbManagerBinding) RemoveConnection(id string) error {
	return b.uc.RemoveConnection(b.ctx, id)
}

func (b *DbManagerBinding) Connect(id string) error {
	return b.uc.Connect(b.ctx, id)
}

func (b *DbManagerBinding) Disconnect() error {
	return b.uc.Disconnect(b.ctx)
}

func (b *DbManagerBinding) GetActiveConnection() *domain.DbConnection {
	return b.uc.GetActiveConnection()
}

func (b *DbManagerBinding) IsConnected() bool {
	return b.uc.IsConnected(b.ctx)
}

func (b *DbManagerBinding) ListDatabases() ([]domain.DbDatabase, error) {
	return b.uc.ListDatabases(b.ctx)
}

func (b *DbManagerBinding) ListSchemas() ([]domain.DbSchema, error) {
	return b.uc.ListSchemas(b.ctx)
}

func (b *DbManagerBinding) ListTables(schema string) ([]domain.DbTable, error) {
	return b.uc.ListTables(b.ctx, schema)
}

func (b *DbManagerBinding) DescribeTable(schema, table string) ([]domain.DbColumn, error) {
	return b.uc.DescribeTable(b.ctx, schema, table)
}

func (b *DbManagerBinding) ExecuteQuery(query string) (*domain.QueryResult, error) {
	return b.uc.ExecuteQuery(b.ctx, query)
}

func (b *DbManagerBinding) GetTableData(req domain.TableDataRequest) (*domain.TableDataResult, error) {
	return b.uc.GetTableData(b.ctx, req)
}

func (b *DbManagerBinding) InsertRow(mutation domain.RowMutation) error {
	return b.uc.InsertRow(b.ctx, mutation)
}

func (b *DbManagerBinding) UpdateRow(mutation domain.RowMutation, primaryKey map[string]interface{}) error {
	return b.uc.UpdateRow(b.ctx, mutation, primaryKey)
}

func (b *DbManagerBinding) DeleteRows(req domain.RowDeleteRequest) (int64, error) {
	return b.uc.DeleteRows(b.ctx, req)
}
