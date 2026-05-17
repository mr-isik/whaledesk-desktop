package ports

import (
	"context"
	"dockit-desktop/internal/domain"
)

// DbManagerPort, bir veritabanı yöneticisinin yerine getirmesi gereken
// tüm işlemleri tanımlar. (SOLID - I: Interface Segregation, D: Dependency Inversion)
//
// Yeni bir veritabanı tipi (MySQL, SQLite, MongoDB vb.) eklemek için bu arayüzü
// implemente eden yeni bir struct oluşturmak yeterlidir; mevcut kod değişmez.
// (SOLID - O: Open/Closed)
type DbManagerPort interface {
	// Connect, verilen bağlantı bilgileriyle veritabanına bağlanır ve bağlantıyı test eder.
	Connect(ctx context.Context, conn domain.DbConnection) error

	// Disconnect, aktif bağlantıyı kapatır.
	Disconnect(ctx context.Context) error

	// Ping, aktif bağlantının sağlıklı olup olmadığını kontrol eder.
	Ping(ctx context.Context) error

	// ListDatabases, sunucudaki erişilebilir veritabanlarını listeler.
	ListDatabases(ctx context.Context) ([]domain.DbDatabase, error)

	// ListSchemas, belirtilen veritabanındaki şemaları listeler.
	ListSchemas(ctx context.Context) ([]domain.DbSchema, error)

	// ListTables, belirtilen şemadaki tabloları listeler.
	ListTables(ctx context.Context, schema string) ([]domain.DbTable, error)

	// DescribeTable, bir tablonun sütun bilgilerini döndürür.
	DescribeTable(ctx context.Context, schema, table string) ([]domain.DbColumn, error)

	// ExecuteQuery, ham bir SQL sorgusu çalıştırır ve sonucu döndürür.
	ExecuteQuery(ctx context.Context, query string) (*domain.QueryResult, error)
}
