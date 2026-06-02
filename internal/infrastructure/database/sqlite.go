package database

import (
	"context"
	"database/sql"
	"dockit-desktop/internal/domain"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

type SQLiteDB struct {
	db *sql.DB
}

func NewSQLiteDB(dsn string) (*SQLiteDB, error) {
	db, err := sql.Open("sqlite3", dsn)
	if err != nil {
		return nil, err
	}

	if err := db.Ping(); err != nil {
		return nil, err
	}

	if _, err := db.Exec("PRAGMA journal_mode=WAL;"); err != nil {
		return nil, err
	}

	store := &SQLiteDB{db: db}
	if err := store.migrate(); err != nil {
		return nil, err
	}
	return store, nil
}

func (s *SQLiteDB) migrate() error {
	const schema = `
CREATE TABLE IF NOT EXISTS api_requests (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    url         TEXT    NOT NULL,
    method      TEXT    NOT NULL,
    payload     TEXT,
    response    TEXT,
    status      INTEGER NOT NULL DEFAULT 0,
    created_at  DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_api_requests_created_at ON api_requests(created_at DESC);

-- Ortam yönetimi tabloları
CREATE TABLE IF NOT EXISTS environments (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL UNIQUE,
    is_active  INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS env_variables (
    id          TEXT PRIMARY KEY,
    env_id      TEXT NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    key         TEXT NOT NULL,
    value_enc   TEXT NOT NULL,
    is_secret   INTEGER NOT NULL DEFAULT 0,
    description TEXT NOT NULL DEFAULT '',
    UNIQUE(env_id, key)
);

CREATE TABLE IF NOT EXISTS db_connections (
    id        TEXT PRIMARY KEY,
    name      TEXT NOT NULL,
    type      TEXT NOT NULL DEFAULT 'postgres',
    host      TEXT NOT NULL,
    port      INTEGER NOT NULL DEFAULT 5432,
    user      TEXT NOT NULL,
    password_enc TEXT NOT NULL,
    database  TEXT NOT NULL DEFAULT '',
    ssl_mode  TEXT NOT NULL DEFAULT 'disable',
    created_at DATETIME NOT NULL
);
`
	_, err := s.db.Exec(schema)
	return err
}

func (s *SQLiteDB) SaveAPIRequest(ctx context.Context, req *domain.APIRequest) error {
	const q = `
INSERT INTO api_requests (url, method, payload, response, status, created_at)
VALUES (?, ?, ?, ?, ?, ?)`

	result, err := s.db.ExecContext(ctx, q,
		req.URL,
		req.Method,
		req.Payload,
		req.Response,
		req.Status,
		req.CreatedAt.UTC(),
	)
	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return err
	}
	req.ID = int(id)
	return nil
}

func (s *SQLiteDB) GetAPIRequests(ctx context.Context) ([]domain.APIRequest, error) {
	const q = `
SELECT id, url, method, payload, response, status, created_at
FROM api_requests
ORDER BY created_at DESC
LIMIT 200`

	rows, err := s.db.QueryContext(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []domain.APIRequest
	for rows.Next() {
		var r domain.APIRequest
		var createdAt string
		if err := rows.Scan(
			&r.ID,
			&r.URL,
			&r.Method,
			&r.Payload,
			&r.Response,
			&r.Status,
			&createdAt,
		); err != nil {
			return nil, err
		}

		r.CreatedAt, _ = time.Parse("2006-01-02T15:04:05Z", createdAt)
		result = append(result, r)
	}
	return result, rows.Err()
}

func (s *SQLiteDB) DeleteAPIRequest(ctx context.Context, id int) error {
	_, err := s.db.ExecContext(ctx, "DELETE FROM api_requests WHERE id = ?", id)
	return err
}

func (s *SQLiteDB) ClearAPIRequests(ctx context.Context) error {
	_, err := s.db.ExecContext(ctx, "DELETE FROM api_requests")
	return err
}

func (s *SQLiteDB) Close() error {
	return s.db.Close()
}

func (s *SQLiteDB) CreateEnvironment(ctx context.Context, env *domain.Environment) error {
	const q = `INSERT INTO environments (id, name, is_active, created_at) VALUES (?, ?, ?, ?)`
	_, err := s.db.ExecContext(ctx, q, env.ID, env.Name, 0, env.CreatedAt.UTC())
	return err
}

func (s *SQLiteDB) ListEnvironments(ctx context.Context) ([]domain.Environment, error) {
	const q = `SELECT id, name, is_active, created_at FROM environments ORDER BY created_at ASC`
	rows, err := s.db.QueryContext(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []domain.Environment
	for rows.Next() {
		var e domain.Environment
		var isActive int
		var createdAt string
		if err := rows.Scan(&e.ID, &e.Name, &isActive, &createdAt); err != nil {
			return nil, err
		}
		e.IsActive = isActive == 1
		e.CreatedAt, _ = time.Parse("2006-01-02T15:04:05Z", createdAt)
		result = append(result, e)
	}
	return result, rows.Err()
}

func (s *SQLiteDB) DeleteEnvironment(ctx context.Context, id string) error {
	_, err := s.db.ExecContext(ctx, "DELETE FROM environments WHERE id = ?", id)
	return err
}

func (s *SQLiteDB) SetActiveEnvironment(ctx context.Context, id string) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, "UPDATE environments SET is_active = 0"); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, "UPDATE environments SET is_active = 1 WHERE id = ?", id); err != nil {
		return err
	}
	return tx.Commit()
}

func (s *SQLiteDB) GetActiveEnvironmentID(ctx context.Context) (string, error) {
	var id string
	err := s.db.QueryRowContext(ctx, "SELECT id FROM environments WHERE is_active = 1 LIMIT 1").Scan(&id)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return id, err
}

func (s *SQLiteDB) AddVariable(ctx context.Context, v *domain.EnvVariable, encryptedValue string) error {
	const q = `INSERT INTO env_variables (id, env_id, key, value_enc, is_secret, description)
			   VALUES (?, ?, ?, ?, ?, ?)`
	isSecret := 0
	if v.IsSecret {
		isSecret = 1
	}
	_, err := s.db.ExecContext(ctx, q, v.ID, v.EnvID, v.Key, encryptedValue, isSecret, v.Description)
	return err
}

func (s *SQLiteDB) UpdateVariable(ctx context.Context, varID string, encryptedValue string, v *domain.EnvVariable) error {
	const q = `UPDATE env_variables SET key = ?, value_enc = ?, is_secret = ?, description = ? WHERE id = ?`
	isSecret := 0
	if v.IsSecret {
		isSecret = 1
	}
	_, err := s.db.ExecContext(ctx, q, v.Key, encryptedValue, isSecret, v.Description, varID)
	return err
}

func (s *SQLiteDB) DeleteVariable(ctx context.Context, varID string) error {
	_, err := s.db.ExecContext(ctx, "DELETE FROM env_variables WHERE id = ?", varID)
	return err
}

func (s *SQLiteDB) GetVariables(ctx context.Context, envID string) ([]domain.EnvVariable, error) {
	const q = `SELECT id, env_id, key, value_enc, is_secret, description
	           FROM env_variables WHERE env_id = ? ORDER BY key ASC`
	rows, err := s.db.QueryContext(ctx, q, envID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []domain.EnvVariable
	for rows.Next() {
		var v domain.EnvVariable
		var isSecret int
		if err := rows.Scan(&v.ID, &v.EnvID, &v.Key, &v.Value, &isSecret, &v.Description); err != nil {
			return nil, err
		}
		v.IsSecret = isSecret == 1
		result = append(result, v)
	}
	return result, rows.Err()
}

func (s *SQLiteDB) SaveConnection(ctx context.Context, conn *domain.DbConnection, encryptedPassword string) error {
	const q = `INSERT INTO db_connections (id, name, type, host, port, user, password_enc, database, ssl_mode, created_at)
			   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	_, err := s.db.ExecContext(ctx, q,
		conn.ID, conn.Name, conn.Type, conn.Host, conn.Port, conn.User, encryptedPassword, conn.Database, conn.SSLMode, time.Now().UTC())
	return err
}

func (s *SQLiteDB) ListConnections(ctx context.Context) ([]domain.DbConnection, error) {
	const q = `SELECT id, name, type, host, port, user, password_enc, database, ssl_mode FROM db_connections ORDER BY created_at ASC`
	rows, err := s.db.QueryContext(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []domain.DbConnection
	for rows.Next() {
		var c domain.DbConnection
		if err := rows.Scan(
			&c.ID, &c.Name, &c.Type, &c.Host, &c.Port, &c.User, &c.Password, &c.Database, &c.SSLMode,
		); err != nil {
			return nil, err
		}
		result = append(result, c)
	}
	return result, rows.Err()
}

func (s *SQLiteDB) DeleteConnection(ctx context.Context, id string) error {
	_, err := s.db.ExecContext(ctx, "DELETE FROM db_connections WHERE id = ?", id)
	return err
}

func (s *SQLiteDB) UpdateConnection(ctx context.Context, conn *domain.DbConnection, encryptedPassword string) error {
	const q = `UPDATE db_connections SET name = ?, type = ?, host = ?, port = ?, user = ?, password_enc = ?, database = ?, ssl_mode = ? WHERE id = ?`
	_, err := s.db.ExecContext(ctx, q,
		conn.Name, conn.Type, conn.Host, conn.Port, conn.User, encryptedPassword, conn.Database, conn.SSLMode, conn.ID)
	return err
}
