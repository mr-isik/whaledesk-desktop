package domain

type DbType string

const (
	DbTypePostgres DbType = "postgres"
)

type DbConnection struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Type     DbType `json:"type"`
	Host     string `json:"host"`
	Port     int    `json:"port"`
	User     string `json:"user"`
	Password string `json:"password"`
	Database string `json:"database"`
	SSLMode  string `json:"ssl_mode"`
}

type DbDatabase struct {
	Name  string `json:"name"`
	Owner string `json:"owner"`
}

type DbSchema struct {
	Name string `json:"name"`
}

type DbTable struct {
	Schema    string `json:"schema"`
	Name      string `json:"name"`
	TableType string `json:"table_type"`
	RowCount  *int64 `json:"row_count,omitempty"`
}

type DbColumn struct {
	Name         string  `json:"name"`
	DataType     string  `json:"data_type"`
	IsNullable   bool    `json:"is_nullable"`
	DefaultValue *string `json:"default_value,omitempty"`
	IsPrimaryKey bool    `json:"is_primary_key"`
	IsUnique     bool    `json:"is_unique"`
}

type QueryResult struct {
	Columns      []string        `json:"columns"`
	Rows         [][]interface{} `json:"rows"`
	RowsAffected int64           `json:"rows_affected"`
	ErrorMessage string          `json:"error_message,omitempty"`
}

// Paginated table data request
type TableDataRequest struct {
	Schema   string `json:"schema"`
	Table    string `json:"table"`
	Page     int    `json:"page"`      // 1-indexed
	PageSize int    `json:"page_size"` // default 50
	SortCol  string `json:"sort_col"`
	SortDir  string `json:"sort_dir"` // "asc" | "desc"
}

// Paginated table data result
type TableDataResult struct {
	Columns    []DbColumn        `json:"columns"`
	Rows       [][]interface{}   `json:"rows"`
	TotalRows  int64             `json:"total_rows"`
	Page       int               `json:"page"`
	PageSize   int               `json:"page_size"`
	TotalPages int               `json:"total_pages"`
}

// Row mutation for insert/update
type RowMutation struct {
	Schema string                 `json:"schema"`
	Table  string                 `json:"table"`
	Data   map[string]interface{} `json:"data"` // column_name -> value
}

// Row delete request (supports bulk)
type RowDeleteRequest struct {
	Schema      string                   `json:"schema"`
	Table       string                   `json:"table"`
	PrimaryKeys []map[string]interface{} `json:"primary_keys"` // each item is a map of PK col -> value
}
