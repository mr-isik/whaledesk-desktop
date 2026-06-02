package database

import (
	"context"
	"dockit-desktop/internal/domain"
	"time"
)

func (s *SQLiteDB) SaveHistory(ctx context.Context, history *domain.AIHistory) error {
	const q = `
INSERT INTO ai_request_history (doc_input, method, url, headers, payload, created_at)
VALUES (?, ?, ?, ?, ?, ?)`

	result, err := s.db.ExecContext(ctx, q,
		history.DocInput,
		history.Method,
		history.URL,
		history.Headers,
		history.Payload,
		history.CreatedAt.UTC(),
	)
	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return err
	}
	history.ID = int(id)
	return nil
}

func (s *SQLiteDB) GetHistory(ctx context.Context) ([]domain.AIHistory, error) {
	const q = `
SELECT id, doc_input, method, url, headers, payload, created_at
FROM ai_request_history
ORDER BY created_at DESC
LIMIT 50`

	rows, err := s.db.QueryContext(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []domain.AIHistory
	for rows.Next() {
		var h domain.AIHistory
		var createdAt string
		if err := rows.Scan(
			&h.ID,
			&h.DocInput,
			&h.Method,
			&h.URL,
			&h.Headers,
			&h.Payload,
			&createdAt,
		); err != nil {
			return nil, err
		}

		h.CreatedAt, _ = time.Parse("2006-01-02T15:04:05Z", createdAt)
		result = append(result, h)
	}
	return result, rows.Err()
}
