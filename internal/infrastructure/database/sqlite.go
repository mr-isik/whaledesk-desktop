package database

import (
	"context"
	"database/sql"
	"dockit-desktop/internal/domain"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

// SQLiteDB, SQLite veritabanıyla iletişimi sağlar.
// DatabasePort interface'ini implemente eder.
type SQLiteDB struct {
	db *sql.DB
}

// NewSQLiteDB, yeni bir SQLite bağlantısı açar ve tabloları oluşturur.
func NewSQLiteDB(dsn string) (*SQLiteDB, error) {
	db, err := sql.Open("sqlite3", dsn)
	if err != nil {
		return nil, err
	}

	// Bağlantıyı test et
	if err := db.Ping(); err != nil {
		return nil, err
	}

	// WAL modu ile performansı artır
	if _, err := db.Exec("PRAGMA journal_mode=WAL;"); err != nil {
		return nil, err
	}

	store := &SQLiteDB{db: db}
	if err := store.migrate(); err != nil {
		return nil, err
	}
	return store, nil
}

// migrate, gerekli tabloları oluşturur (idempotent).
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
`
	_, err := s.db.Exec(schema)
	return err
}

// SaveAPIRequest, bir API isteği kaydını veritabanına ekler.
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

// GetAPIRequests, en son 200 API isteğini döndürür (en yeniden en eskiye).
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
		// SQLite'dan gelen zaman string'ini parse et
		r.CreatedAt, _ = time.Parse("2006-01-02T15:04:05Z", createdAt)
		result = append(result, r)
	}
	return result, rows.Err()
}

// DeleteAPIRequest, belirtilen ID'ye sahip kaydı siler.
func (s *SQLiteDB) DeleteAPIRequest(ctx context.Context, id int) error {
	_, err := s.db.ExecContext(ctx, "DELETE FROM api_requests WHERE id = ?", id)
	return err
}

// ClearAPIRequests, tüm API isteği geçmişini temizler.
func (s *SQLiteDB) ClearAPIRequests(ctx context.Context) error {
	_, err := s.db.ExecContext(ctx, "DELETE FROM api_requests")
	return err
}

// Close, veritabanı bağlantısını kapatır.
func (s *SQLiteDB) Close() error {
	return s.db.Close()
}
