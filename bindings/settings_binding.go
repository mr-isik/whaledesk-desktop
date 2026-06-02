package bindings

import (
	"context"
	"dockit-desktop/internal/usecase"
)

type SettingsBinding struct {
	ctx context.Context
	uc  *usecase.SettingsUsecase
}

func NewSettingsBinding(uc *usecase.SettingsUsecase) *SettingsBinding {
	return &SettingsBinding{uc: uc}
}

func (b *SettingsBinding) Startup(ctx context.Context) {
	b.ctx = ctx
}

func (b *SettingsBinding) SaveSetting(key, value string) error {
	return b.uc.SaveSetting(b.ctx, key, value)
}

func (b *SettingsBinding) GetSetting(key string) (string, error) {
	return b.uc.GetSetting(b.ctx, key)
}
