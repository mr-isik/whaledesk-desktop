package domain

// DbType, desteklenen veritabanı türlerini temsil eder.
// Yeni türler eklendiğinde sadece bu sabit ve ilgili implementasyon eklenir.
type DbType string

const (
	DbTypePostgres DbType = "postgres"
	// İleride eklenebilir:
	// DbTypeMySQL   DbType = "mysql"
	// DbTypeSQLite  DbType = "sqlite"
)

// DbConnection, bir veritabanına bağlanmak için gereken kimlik bilgilerini tutar.
type DbConnection struct {
	ID       string `json:"id"`       // Frontend'de benzersiz tanımlamak için (uuid)
	Name     string `json:"name"`     // Kullanıcı dostu bir isim ("Production DB")
	Type     DbType `json:"type"`     // "postgres", "mysql" vb.
	Host     string `json:"host"`
	Port     int    `json:"port"`
	User     string `json:"user"`
	Password string `json:"password"`
	Database string `json:"database"`
	SSLMode  string `json:"ssl_mode"` // "disable", "require", "verify-full"
}

// DbDatabase, bir sunucudaki veritabanını temsil eder.
type DbDatabase struct {
	Name  string `json:"name"`
	Owner string `json:"owner"`
}

// DbSchema, bir veritabanı şemasını temsil eder.
type DbSchema struct {
	Name string `json:"name"`
}

// DbTable, bir tablonun meta verisini temsil eder.
type DbTable struct {
	Schema    string `json:"schema"`
	Name      string `json:"name"`
	TableType string `json:"table_type"` // "BASE TABLE", "VIEW"
	RowCount  *int64 `json:"row_count,omitempty"`
}

// DbColumn, bir tablonun sütun bilgilerini temsil eder.
type DbColumn struct {
	Name         string  `json:"name"`
	DataType     string  `json:"data_type"`
	IsNullable   bool    `json:"is_nullable"`
	DefaultValue *string `json:"default_value,omitempty"`
	IsPrimaryKey bool    `json:"is_primary_key"`
	IsUnique     bool    `json:"is_unique"`
}

// QueryResult, bir SQL sorgusunun sonucunu tutar.
type QueryResult struct {
	Columns      []string        `json:"columns"`
	Rows         [][]interface{} `json:"rows"`
	RowsAffected int64           `json:"rows_affected"`
	ErrorMessage string          `json:"error_message,omitempty"`
}
