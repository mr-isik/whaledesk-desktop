package ports

import (
	"context"
	"whaledesk-desktop/internal/domain"
)

type APIPort interface {
	SendRequest(ctx context.Context, method string, url string, payload string, headers map[string]string) (*domain.APIRequest, error)
}
