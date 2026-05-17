package domain

import "time"

// APIRequest represents an HTTP request log or configuration
type APIRequest struct {
	ID        int       `json:"id"`
	URL       string    `json:"url"`
	Method    string    `json:"method"`
	Payload   string    `json:"payload"`
	Response  string    `json:"response"`
	Status    int       `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}
