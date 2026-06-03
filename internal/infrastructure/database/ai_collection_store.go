package database

import (
	"context"
	"whaledesk-desktop/internal/domain"
	"time"
)

func (s *SQLiteDB) CreateCollection(ctx context.Context, collection *domain.AICollection) error {
	const q = `
INSERT INTO ai_collections (name, doc_input, item_count, created_at)
VALUES (?, ?, ?, ?)`

	result, err := s.db.ExecContext(ctx, q,
		collection.Name,
		collection.DocInput,
		collection.ItemCount,
		collection.CreatedAt.UTC(),
	)
	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return err
	}
	collection.ID = int(id)
	return nil
}

func (s *SQLiteDB) ListCollections(ctx context.Context) ([]domain.AICollection, error) {
	const q = `
SELECT id, name, doc_input, item_count, created_at
FROM ai_collections
ORDER BY created_at DESC`

	rows, err := s.db.QueryContext(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []domain.AICollection
	for rows.Next() {
		var c domain.AICollection
		var createdAt string
		if err := rows.Scan(
			&c.ID,
			&c.Name,
			&c.DocInput,
			&c.ItemCount,
			&createdAt,
		); err != nil {
			return nil, err
		}
		c.CreatedAt, _ = time.Parse("2006-01-02T15:04:05Z", createdAt)
		result = append(result, c)
	}
	return result, rows.Err()
}

func (s *SQLiteDB) DeleteCollection(ctx context.Context, id int) error {
	_, err := s.db.ExecContext(ctx, "DELETE FROM ai_collections WHERE id = ?", id)
	return err
}

func (s *SQLiteDB) AddCollectionItems(ctx context.Context, collectionID int, items []domain.AICollectionItem) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	const q = `
INSERT INTO ai_collection_items (collection_id, name, description, method, url, headers, payload, sort_order)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)`

	stmt, err := tx.PrepareContext(ctx, q)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, item := range items {
		_, err := stmt.ExecContext(ctx,
			collectionID,
			item.Name,
			item.Description,
			item.Method,
			item.URL,
			item.Headers,
			item.Payload,
			item.SortOrder,
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (s *SQLiteDB) GetCollectionItems(ctx context.Context, collectionID int) ([]domain.AICollectionItem, error) {
	const q = `
SELECT id, collection_id, name, description, method, url, headers, payload, sort_order
FROM ai_collection_items
WHERE collection_id = ?
ORDER BY sort_order ASC`

	rows, err := s.db.QueryContext(ctx, q, collectionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []domain.AICollectionItem
	for rows.Next() {
		var i domain.AICollectionItem
		if err := rows.Scan(
			&i.ID,
			&i.CollectionID,
			&i.Name,
			&i.Description,
			&i.Method,
			&i.URL,
			&i.Headers,
			&i.Payload,
			&i.SortOrder,
		); err != nil {
			return nil, err
		}
		result = append(result, i)
	}
	return result, rows.Err()
}

func (s *SQLiteDB) GetCollectionItemPage(ctx context.Context, collectionID int, page int, pageSize int) ([]domain.AICollectionItem, int, error) {
	var total int
	err := s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM ai_collection_items WHERE collection_id = ?", collectionID).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	if offset < 0 {
		offset = 0
	}

	const q = `
SELECT id, collection_id, name, description, method, url, headers, payload, sort_order
FROM ai_collection_items
WHERE collection_id = ?
ORDER BY sort_order ASC
LIMIT ? OFFSET ?`

	rows, err := s.db.QueryContext(ctx, q, collectionID, pageSize, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var result []domain.AICollectionItem
	for rows.Next() {
		var i domain.AICollectionItem
		if err := rows.Scan(
			&i.ID,
			&i.CollectionID,
			&i.Name,
			&i.Description,
			&i.Method,
			&i.URL,
			&i.Headers,
			&i.Payload,
			&i.SortOrder,
		); err != nil {
			return nil, 0, err
		}
		result = append(result, i)
	}

	return result, total, rows.Err()
}
