package usecase

import (
	"context"
	"dockit-desktop/internal/domain"
	"dockit-desktop/internal/infrastructure/crypto"
	"dockit-desktop/internal/ports"
	"encoding/json"
	"fmt"
)

type AIUsecase struct {
	aiPort       ports.AIPort
	settingsPort ports.SettingsPort
	historyPort  ports.AIHistoryPort
	envUC        *EnvManagerUsecase
	crypto       *crypto.CryptoService
}

func NewAIUsecase(aiPort ports.AIPort, settingsPort ports.SettingsPort, historyPort ports.AIHistoryPort, envUC *EnvManagerUsecase, cs *crypto.CryptoService) *AIUsecase {
	return &AIUsecase{
		aiPort:       aiPort,
		settingsPort: settingsPort,
		historyPort:  historyPort,
		envUC:        envUC,
		crypto:       cs,
	}
}

func (uc *AIUsecase) GenerateRequest(ctx context.Context, docInput string) (*ports.AIGenerateResponse, error) {
	// Get API Key
	encKey, err := uc.settingsPort.GetSetting(ctx, "OPENAI_API_KEY")
	if err != nil {
		return nil, fmt.Errorf("failed to get setting: %w", err)
	}
	if encKey == "" {
		return nil, fmt.Errorf("OpenAI API Key is not set. Please set it in Settings.")
	}

	apiKey, err := uc.crypto.Decrypt(encKey)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt API key: %w", err)
	}

	// Get active environment variables
	activeVars := make(map[string]string)
	envs, err := uc.envUC.ListEnvironments(ctx)
	if err == nil {
		for _, e := range envs {
			if e.IsActive {
				for _, v := range e.Variables {
					// Add non-secret keys to the context so AI knows about them
					activeVars[v.Key] = v.Description
				}
				break
			}
		}
	}

	req := &ports.AIGenerateRequest{
		DocInput: docInput,
	}

	resp, err := uc.aiPort.GenerateRequest(ctx, apiKey, req, activeVars)
	if err != nil {
		return nil, err
	}

	// Save to history
	headersJSON, _ := json.Marshal(resp.Headers)
	history := &domain.AIHistory{
		DocInput: docInput,
		Method:   resp.Method,
		URL:      resp.URL,
		Headers:  string(headersJSON),
		Payload:  resp.Body,
	}

	_ = uc.historyPort.SaveHistory(ctx, history)

	return resp, nil
}

func (uc *AIUsecase) GetHistory(ctx context.Context) ([]domain.AIHistory, error) {
	return uc.historyPort.GetHistory(ctx)
}
