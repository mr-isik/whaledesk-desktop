package ports

import (
	"context"
	"dockit-desktop/internal/domain"
)

// APIPort defines the interface for sending HTTP requests
type APIPort interface {
	SendRequest(ctx context.Context, method string, url string, payload string) (*domain.APIRequest, error)
}
