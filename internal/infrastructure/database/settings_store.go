package database

import (
	"context"
	"database/sql"
)

func (s *SQLiteDB) SaveSetting(ctx context.Context, key string, value string) error {
	const q = `
INSERT INTO settings (key, value)
VALUES (?, ?)
ON CONFLICT(key) DO UPDATE SET value = excluded.value`

	_, err := s.db.ExecContext(ctx, q, key, value)
	return err
}

func (s *SQLiteDB) GetSetting(ctx context.Context, key string) (string, error) {
	var value string
	const q = `SELECT value FROM settings WHERE key = ?`
	
	err := s.db.QueryRowContext(ctx, q, key).Scan(&value)
	if err == sql.ErrNoRows {
		return "", nil // Return empty string if not found
	}
	return value, err
}
