package postgres

import (
	"context"
	"dockit-desktop/internal/domain"
	"fmt"
	"net"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresManager struct {
	pool *pgxpool.Pool
}

func NewPostgresManager() *PostgresManager {
	return &PostgresManager{}
}

func (p *PostgresManager) Connect(ctx context.Context, conn domain.DbConnection) error {

	if p.pool != nil {
		p.pool.Close()
	}

	sslMode := strings.TrimSpace(conn.SSLMode)
	if sslMode == "" {
		sslMode = "prefer"
	}

	dsn := buildPostgresDSN(conn, sslMode)

	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return fmt.Errorf("invalid connection configuration: %w", err)
	}

	cfg.MaxConns = 5

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return fmt.Errorf("failed to ping database: %w", err)
	}

	p.pool = pool
	return nil
}

func (p *PostgresManager) Disconnect(_ context.Context) error {
	if p.pool != nil {
		p.pool.Close()
		p.pool = nil
	}
	return nil
}

func (p *PostgresManager) Ping(ctx context.Context) error {
	if p.pool == nil {
		return fmt.Errorf("no active database connection")
	}
	return p.pool.Ping(ctx)
}

func (p *PostgresManager) ListDatabases(ctx context.Context) ([]domain.DbDatabase, error) {
	if err := p.checkConnection(); err != nil {
		return nil, err
	}

	const q = `
SELECT datname, pg_catalog.pg_get_userbyid(datdba) AS owner
FROM pg_catalog.pg_database
WHERE NOT datistemplate
ORDER BY datname`

	rows, err := p.pool.Query(ctx, q)
	if err != nil {
		return nil, fmt.Errorf("failed to list databases: %w", err)
	}
	defer rows.Close()

	result := make([]domain.DbDatabase, 0)
	for rows.Next() {
		var db domain.DbDatabase
		if err := rows.Scan(&db.Name, &db.Owner); err != nil {
			return nil, err
		}
		result = append(result, db)
	}
	return result, rows.Err()
}

func (p *PostgresManager) ListSchemas(ctx context.Context) ([]domain.DbSchema, error) {
	if err := p.checkConnection(); err != nil {
		return nil, err
	}

	const q = `
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
ORDER BY schema_name`

	rows, err := p.pool.Query(ctx, q)
	if err != nil {
		return nil, fmt.Errorf("failed to list schemas: %w", err)
	}
	defer rows.Close()

	result := make([]domain.DbSchema, 0)
	for rows.Next() {
		var s domain.DbSchema
		if err := rows.Scan(&s.Name); err != nil {
			return nil, err
		}
		result = append(result, s)
	}
	return result, rows.Err()
}

func (p *PostgresManager) ListTables(ctx context.Context, schema string) ([]domain.DbTable, error) {
	if err := p.checkConnection(); err != nil {
		return nil, err
	}

	const q = `
SELECT table_schema, table_name, table_type
FROM information_schema.tables
WHERE table_schema = $1
ORDER BY table_name`

	rows, err := p.pool.Query(ctx, q, schema)
	if err != nil {
		return nil, fmt.Errorf("tablolar listelenemedi: %w", err)
	}
	defer rows.Close()

	result := make([]domain.DbTable, 0)
	for rows.Next() {
		var t domain.DbTable
		if err := rows.Scan(&t.Schema, &t.Name, &t.TableType); err != nil {
			return nil, err
		}
		result = append(result, t)
	}
	return result, rows.Err()
}

func (p *PostgresManager) DescribeTable(ctx context.Context, schema, table string) ([]domain.DbColumn, error) {
	if err := p.checkConnection(); err != nil {
		return nil, err
	}

	const q = `
SELECT
    c.column_name,
    c.data_type,
    c.is_nullable = 'YES',
    c.column_default,
    COALESCE(bool_or(tc.constraint_type = 'PRIMARY KEY'), FALSE) AS is_primary_key,
    COALESCE(bool_or(tc.constraint_type = 'UNIQUE'), FALSE) AS is_unique
FROM information_schema.columns c
LEFT JOIN information_schema.key_column_usage kcu
    ON kcu.table_schema = c.table_schema
    AND kcu.table_name = c.table_name
    AND kcu.column_name = c.column_name
LEFT JOIN information_schema.table_constraints tc
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
    AND tc.table_name = kcu.table_name
WHERE c.table_schema = $1 AND c.table_name = $2
GROUP BY c.column_name, c.data_type, c.is_nullable, c.column_default, c.ordinal_position
ORDER BY c.ordinal_position`

	rows, err := p.pool.Query(ctx, q, schema, table)
	if err != nil {
		return nil, fmt.Errorf("failed to get table description: %w", err)
	}
	defer rows.Close()

	result := make([]domain.DbColumn, 0)
	for rows.Next() {
		var col domain.DbColumn
		if err := rows.Scan(
			&col.Name,
			&col.DataType,
			&col.IsNullable,
			&col.DefaultValue,
			&col.IsPrimaryKey,
			&col.IsUnique,
		); err != nil {
			return nil, err
		}
		result = append(result, col)
	}
	return result, rows.Err()
}

func (p *PostgresManager) ExecuteQuery(ctx context.Context, query string) (*domain.QueryResult, error) {
	if err := p.checkConnection(); err != nil {
		return nil, err
	}

	rows, err := p.pool.Query(ctx, query)
	if err != nil {

		return &domain.QueryResult{ErrorMessage: err.Error()}, nil
	}
	defer rows.Close()

	fields := rows.FieldDescriptions()
	colNames := make([]string, len(fields))
	for i, f := range fields {
		colNames[i] = string(f.Name)
	}

	resultRows := make([][]interface{}, 0)
	for rows.Next() {
		vals, err := rows.Values()
		if err != nil {
			return nil, err
		}
		
		safeRow := make([]interface{}, len(vals))
		for i, v := range vals {
			safeRow[i] = toJSONSafe(v)
		}
		resultRows = append(resultRows, safeRow)
	}
	if err := rows.Err(); err != nil {
		return &domain.QueryResult{ErrorMessage: err.Error()}, nil
	}

	tag := rows.CommandTag()
	return &domain.QueryResult{
		Columns:      colNames,
		Rows:         resultRows,
		RowsAffected: tag.RowsAffected(),
	}, nil
}

func toJSONSafe(v interface{}) interface{} {
	if v == nil {
		return nil
	}
	switch val := v.(type) {
	case string:
		return val
	case int, int8, int16, int32, int64:
		return val
	case uint, uint8, uint16, uint32, uint64:
		return val
	case float32, float64:
		return val
	case bool:
		return val
	case time.Time:
		return val.Format(time.RFC3339)
	case []byte:
		return fmt.Sprintf("%x", val)
	default:
		return fmt.Sprintf("%v", val)
	}
}

func (p *PostgresManager) GetTableData(ctx context.Context, req domain.TableDataRequest) (*domain.TableDataResult, error) {
	if err := p.checkConnection(); err != nil {
		return nil, err
	}

	// 1. Get columns
	columns, err := p.DescribeTable(ctx, req.Schema, req.Table)
	if err != nil {
		return nil, fmt.Errorf("failed to get table metadata: %w", err)
	}

	// 2. Count total rows
	var totalRows int64
	countQuery := fmt.Sprintf("SELECT count(*) FROM %s.%s", pgx.Identifier{req.Schema}.Sanitize(), pgx.Identifier{req.Table}.Sanitize())
	if err := p.pool.QueryRow(ctx, countQuery).Scan(&totalRows); err != nil {
		return nil, fmt.Errorf("failed to count rows: %w", err)
	}

	// 3. Build data query
	offset := (req.Page - 1) * req.PageSize
	query := fmt.Sprintf("SELECT * FROM %s.%s", pgx.Identifier{req.Schema}.Sanitize(), pgx.Identifier{req.Table}.Sanitize())

	// Sorting
	if req.SortCol != "" {
		// Validate sort col against described columns to prevent injection
		validCol := false
		for _, col := range columns {
			if col.Name == req.SortCol {
				validCol = true
				break
			}
		}
		if validCol {
			dir := "ASC"
			if strings.ToLower(req.SortDir) == "desc" {
				dir = "DESC"
			}
			query += fmt.Sprintf(" ORDER BY %s %s", pgx.Identifier{req.SortCol}.Sanitize(), dir)
		}
	} else {
		// Default sort by first PK if available
		for _, col := range columns {
			if col.IsPrimaryKey {
				query += fmt.Sprintf(" ORDER BY %s ASC", pgx.Identifier{col.Name}.Sanitize())
				break
			}
		}
	}

	// Pagination
	query += fmt.Sprintf(" LIMIT %d OFFSET %d", req.PageSize, offset)

	rows, err := p.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query data: %w", err)
	}
	defer rows.Close()

	resultRows := make([][]interface{}, 0)
	for rows.Next() {
		vals, err := rows.Values()
		if err != nil {
			return nil, err
		}
		
		safeRow := make([]interface{}, len(vals))
		for i, v := range vals {
			safeRow[i] = toJSONSafe(v)
		}
		resultRows = append(resultRows, safeRow)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	totalPages := int(totalRows) / req.PageSize
	if int(totalRows)%req.PageSize > 0 {
		totalPages++
	}

	return &domain.TableDataResult{
		Columns:    columns,
		Rows:       resultRows,
		TotalRows:  totalRows,
		Page:       req.Page,
		PageSize:   req.PageSize,
		TotalPages: totalPages,
	}, nil
}

func (p *PostgresManager) InsertRow(ctx context.Context, mutation domain.RowMutation) error {
	if err := p.checkConnection(); err != nil {
		return err
	}

	if len(mutation.Data) == 0 {
		return fmt.Errorf("no data provided for insert")
	}

	var cols []string
	var placeholders []string
	var args []interface{}
	
	i := 1
	for colName, val := range mutation.Data {
		cols = append(cols, pgx.Identifier{colName}.Sanitize())
		placeholders = append(placeholders, fmt.Sprintf("$%d", i))
		args = append(args, val)
		i++
	}

	query := fmt.Sprintf("INSERT INTO %s.%s (%s) VALUES (%s)", 
		pgx.Identifier{mutation.Schema}.Sanitize(),
		pgx.Identifier{mutation.Table}.Sanitize(),
		strings.Join(cols, ", "),
		strings.Join(placeholders, ", "),
	)

	_, err := p.pool.Exec(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("insert failed: %w", err)
	}
	return nil
}

func (p *PostgresManager) UpdateRow(ctx context.Context, mutation domain.RowMutation, primaryKey map[string]interface{}) error {
	if err := p.checkConnection(); err != nil {
		return err
	}

	if len(mutation.Data) == 0 {
		return fmt.Errorf("no data provided for update")
	}
	if len(primaryKey) == 0 {
		return fmt.Errorf("primary key is required for update")
	}

	var setCols []string
	var args []interface{}
	
	i := 1
	for colName, val := range mutation.Data {
		setCols = append(setCols, fmt.Sprintf("%s = $%d", pgx.Identifier{colName}.Sanitize(), i))
		args = append(args, val)
		i++
	}

	var whereCols []string
	for colName, val := range primaryKey {
		whereCols = append(whereCols, fmt.Sprintf("%s = $%d", pgx.Identifier{colName}.Sanitize(), i))
		args = append(args, val)
		i++
	}

	query := fmt.Sprintf("UPDATE %s.%s SET %s WHERE %s", 
		pgx.Identifier{mutation.Schema}.Sanitize(),
		pgx.Identifier{mutation.Table}.Sanitize(),
		strings.Join(setCols, ", "),
		strings.Join(whereCols, " AND "),
	)

	res, err := p.pool.Exec(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("update failed: %w", err)
	}
	if res.RowsAffected() == 0 {
		return fmt.Errorf("no rows were updated (row not found)")
	}
	return nil
}

func (p *PostgresManager) DeleteRows(ctx context.Context, req domain.RowDeleteRequest) (int64, error) {
	if err := p.checkConnection(); err != nil {
		return 0, err
	}

	if len(req.PrimaryKeys) == 0 {
		return 0, fmt.Errorf("no rows specified for deletion")
	}

	var conditions []string
	var args []interface{}
	paramIdx := 1

	for _, pkMap := range req.PrimaryKeys {
		var andConds []string
		for colName, val := range pkMap {
			andConds = append(andConds, fmt.Sprintf("%s = $%d", pgx.Identifier{colName}.Sanitize(), paramIdx))
			args = append(args, val)
			paramIdx++
		}
		if len(andConds) > 0 {
			conditions = append(conditions, fmt.Sprintf("(%s)", strings.Join(andConds, " AND ")))
		}
	}

	if len(conditions) == 0 {
		return 0, fmt.Errorf("invalid primary keys provided")
	}

	query := fmt.Sprintf("DELETE FROM %s.%s WHERE %s", 
		pgx.Identifier{req.Schema}.Sanitize(),
		pgx.Identifier{req.Table}.Sanitize(),
		strings.Join(conditions, " OR "),
	)

	res, err := p.pool.Exec(ctx, query, args...)
	if err != nil {
		return 0, fmt.Errorf("delete failed: %w", err)
	}
	
	return res.RowsAffected(), nil
}

func (p *PostgresManager) checkConnection() error {
	if p.pool == nil {
		return fmt.Errorf("not connected to database; call Connect() first")
	}
	return nil
}

func collectRows[T any](rows pgx.Rows, scanFn func(pgx.CollectableRow) (T, error)) ([]T, error) {
	return pgx.CollectRows(rows, scanFn)
}

func buildPostgresDSN(conn domain.DbConnection, sslMode string) string {
	host := strings.TrimSpace(conn.Host)
	if host == "" {
		host = "localhost"
	}
	port := conn.Port
	if port == 0 {
		port = 5432
	}
	user := strings.TrimSpace(conn.User)
	dbName := strings.TrimSpace(conn.Database)

	var userInfo *url.Userinfo
	if user != "" {
		if conn.Password != "" {
			userInfo = url.UserPassword(user, conn.Password)
		} else {
			userInfo = url.User(user)
		}
	}

	u := &url.URL{
		Scheme: "postgres",
		User:   userInfo,
		Host:   net.JoinHostPort(host, strconv.Itoa(port)),
	}
	if dbName != "" {
		u.Path = "/" + dbName
	}

	q := u.Query()
	if sslMode != "" {
		q.Set("sslmode", sslMode)
	}
	u.RawQuery = q.Encode()
	return u.String()
}
