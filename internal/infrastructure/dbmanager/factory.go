package dbmanager

import (
	"dockit-desktop/internal/domain"
	"dockit-desktop/internal/infrastructure/dbmanager/postgres"
	"dockit-desktop/internal/ports"
	"fmt"
)

// ManagerFactory, DbType'a göre doğru DbManagerPort implementasyonunu döndürür.
// (SOLID - O: Open/Closed) Yeni bir DB tipi eklemek için sadece yeni bir case
// ve implementasyon eklenir; bu fonksiyonun geri kalanı değişmez.
func NewManagerForType(dbType domain.DbType) (ports.DbManagerPort, error) {
	switch dbType {
	case domain.DbTypePostgres:
		return postgres.NewPostgresManager(), nil
	// Gelecekte eklenebilir:
	// case domain.DbTypeMySQL:
	//     return mysql.NewMySQLManager(), nil
	// case domain.DbTypeSQLite:
	//     return sqlite.NewSQLiteManager(), nil
	default:
		return nil, fmt.Errorf("desteklenmeyen veritabanı tipi: %s", dbType)
	}
}
