package ports

import (
	"context"
)

type SettingsPort interface {
	SaveSetting(ctx context.Context, key string, value string) error
	GetSetting(ctx context.Context, key string) (string, error)
}
