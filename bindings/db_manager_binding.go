package bindings

import (
	"context"
	"dockit-desktop/internal/domain"
	"dockit-desktop/internal/usecase"
)

// DbManagerBinding, frontend'in harici veritabanı yönetimi için çağırabileceği
// tüm metodları sunar.
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

// --- Bağlantı Yönetimi ---

// AddConnection, yeni bir bağlantı profili kaydeder ve oluşturulan profili döndürür.
func (b *DbManagerBinding) AddConnection(conn domain.DbConnection) domain.DbConnection {
	return b.uc.AddConnection(conn)
}

// ListConnections, kaydedilmiş tüm bağlantı profillerini döndürür.
func (b *DbManagerBinding) ListConnections() []domain.DbConnection {
	return b.uc.ListConnections()
}

// RemoveConnection, belirtilen ID'deki bağlantı profilini siler.
func (b *DbManagerBinding) RemoveConnection(id string) error {
	return b.uc.RemoveConnection(b.ctx, id)
}

// Connect, belirtilen ID'deki bağlantı profiline bağlanır.
func (b *DbManagerBinding) Connect(id string) error {
	return b.uc.Connect(b.ctx, id)
}

// Disconnect, aktif bağlantıyı kapatır.
func (b *DbManagerBinding) Disconnect() error {
	return b.uc.Disconnect(b.ctx)
}

// GetActiveConnection, aktif bağlantı profilini döndürür (bağlı değilse nil).
func (b *DbManagerBinding) GetActiveConnection() *domain.DbConnection {
	return b.uc.GetActiveConnection()
}

// IsConnected, aktif bir veritabanı bağlantısı olup olmadığını döndürür.
func (b *DbManagerBinding) IsConnected() bool {
	return b.uc.IsConnected(b.ctx)
}

// --- Veritabanı Keşif İşlemleri ---

// ListDatabases, aktif sunucudaki veritabanlarını listeler.
func (b *DbManagerBinding) ListDatabases() ([]domain.DbDatabase, error) {
	return b.uc.ListDatabases(b.ctx)
}

// ListSchemas, aktif veritabanındaki şemaları listeler.
func (b *DbManagerBinding) ListSchemas() ([]domain.DbSchema, error) {
	return b.uc.ListSchemas(b.ctx)
}

// ListTables, belirtilen şemadaki tabloları listeler.
func (b *DbManagerBinding) ListTables(schema string) ([]domain.DbTable, error) {
	return b.uc.ListTables(b.ctx, schema)
}

// DescribeTable, bir tablonun sütun meta verilerini döndürür.
func (b *DbManagerBinding) DescribeTable(schema, table string) ([]domain.DbColumn, error) {
	return b.uc.DescribeTable(b.ctx, schema, table)
}

// ExecuteQuery, ham bir SQL sorgusu çalıştırır.
func (b *DbManagerBinding) ExecuteQuery(query string) (*domain.QueryResult, error) {
	return b.uc.ExecuteQuery(b.ctx, query)
}
