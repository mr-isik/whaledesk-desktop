package domain

import "time"

type AICollection struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	DocInput  string    `json:"doc_input"`
	ItemCount int       `json:"item_count"`
	CreatedAt time.Time `json:"created_at"`
}

type AICollectionItem struct {
	ID           int    `json:"id"`
	CollectionID int    `json:"collection_id"`
	Name         string `json:"name"`
	Description  string `json:"description"`
	Method       string `json:"method"`
	URL          string `json:"url"`
	Headers      string `json:"headers"`
	Payload      string `json:"payload"`
	SortOrder    int    `json:"sort_order"`
}
