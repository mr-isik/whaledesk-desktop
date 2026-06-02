package usecase

import (
	"context"
	"dockit-desktop/internal/infrastructure/crypto"
	"dockit-desktop/internal/ports"
)

type SettingsUsecase struct {
	store  ports.SettingsPort
	crypto *crypto.CryptoService
}

func NewSettingsUsecase(store ports.SettingsPort, cs *crypto.CryptoService) *SettingsUsecase {
	return &SettingsUsecase{
		store:  store,
		crypto: cs,
	}
}

func (uc *SettingsUsecase) SaveSetting(ctx context.Context, key string, value string) error {
	// Encrypt sensitive settings
	if key == "OPENAI_API_KEY" {
		enc, err := uc.crypto.Encrypt(value)
		if err != nil {
			return err
		}
		value = enc
	}
	return uc.store.SaveSetting(ctx, key, value)
}

func (uc *SettingsUsecase) GetSetting(ctx context.Context, key string) (string, error) {
	val, err := uc.store.GetSetting(ctx, key)
	if err != nil || val == "" {
		return val, err
	}

	// Decrypt sensitive settings
	if key == "OPENAI_API_KEY" {
		dec, err := uc.crypto.Decrypt(val)
		if err != nil {
			return "", err
		}
		return dec, nil
	}
	return val, nil
}
