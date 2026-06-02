package domain

import "time"

type AIHistory struct {
	ID        int       `json:"id"`
	DocInput  string    `json:"doc_input"`
	Method    string    `json:"method"`
	URL       string    `json:"url"`
	Headers   string    `json:"headers"`
	Payload   string    `json:"payload"`
	CreatedAt time.Time `json:"created_at"`
}
