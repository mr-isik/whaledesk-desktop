package usecase

import (
	"context"
	"dockit-desktop/internal/domain"
	"dockit-desktop/internal/infrastructure/crypto"
	"dockit-desktop/internal/ports"
	"encoding/json"
	"fmt"
	"time"
)

type AIUsecase struct {
	aiPort         ports.AIPort
	settingsPort   ports.SettingsPort
	collectionPort ports.AICollectionPort
	envUC          *EnvManagerUsecase
	crypto         *crypto.CryptoService
}

func NewAIUsecase(aiPort ports.AIPort, settingsPort ports.SettingsPort, collectionPort ports.AICollectionPort, envUC *EnvManagerUsecase, cs *crypto.CryptoService) *AIUsecase {
	return &AIUsecase{
		aiPort:         aiPort,
		settingsPort:   settingsPort,
		collectionPort: collectionPort,
		envUC:          envUC,
		crypto:         cs,
	}
}

// GenerateRequest keeps the old single generation flow for backward compatibility or direct single gen usage
func (uc *AIUsecase) GenerateRequest(ctx context.Context, docInput string) (*ports.AIGenerateResponse, error) {
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

	activeVars := make(map[string]string)
	envs, err := uc.envUC.ListEnvironments(ctx)
	if err == nil {
		for _, e := range envs {
			if e.IsActive {
				for _, v := range e.Variables {
					activeVars[v.Key] = v.Description
				}
				break
			}
		}
	}

	req := &ports.AIGenerateRequest{
		DocInput: docInput,
	}

	return uc.aiPort.GenerateRequest(ctx, apiKey, req, activeVars)
}

func (uc *AIUsecase) GenerateCollection(ctx context.Context, name string, docInput string) (*domain.AICollection, error) {
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

	activeVars := make(map[string]string)
	envs, err := uc.envUC.ListEnvironments(ctx)
	if err == nil {
		for _, e := range envs {
			if e.IsActive {
				for _, v := range e.Variables {
					activeVars[v.Key] = v.Description
				}
				break
			}
		}
	}

	resp, err := uc.aiPort.GenerateBatchRequests(ctx, apiKey, docInput, activeVars)
	if err != nil {
		return nil, err
	}

	if len(resp.Endpoints) == 0 {
		return nil, fmt.Errorf("no endpoints found in the documentation")
	}

	collection := &domain.AICollection{
		Name:      name,
		DocInput:  docInput,
		ItemCount: len(resp.Endpoints),
		CreatedAt: time.Now(),
	}

	if err := uc.collectionPort.CreateCollection(ctx, collection); err != nil {
		return nil, fmt.Errorf("failed to save collection: %w", err)
	}

	var items []domain.AICollectionItem
	for i, ep := range resp.Endpoints {
		headersJSON, _ := json.Marshal(ep.Headers)
		item := domain.AICollectionItem{
			CollectionID: collection.ID,
			Name:         ep.Name,
			Description:  ep.Description,
			Method:       ep.Method,
			URL:          ep.URL,
			Headers:      string(headersJSON),
			Payload:      ep.Body,
			SortOrder:    i,
		}
		items = append(items, item)
	}

	if err := uc.collectionPort.AddCollectionItems(ctx, collection.ID, items); err != nil {
		return nil, fmt.Errorf("failed to save collection items: %w", err)
	}

	return collection, nil
}

func (uc *AIUsecase) ListCollections(ctx context.Context) ([]domain.AICollection, error) {
	return uc.collectionPort.ListCollections(ctx)
}

func (uc *AIUsecase) DeleteCollection(ctx context.Context, id int) error {
	return uc.collectionPort.DeleteCollection(ctx, id)
}

func (uc *AIUsecase) GetCollectionItems(ctx context.Context, collectionID int) ([]domain.AICollectionItem, error) {
	return uc.collectionPort.GetCollectionItems(ctx, collectionID)
}

func (uc *AIUsecase) GetCollectionItemPage(ctx context.Context, collectionID int, page int, pageSize int) ([]domain.AICollectionItem, int, error) {
	return uc.collectionPort.GetCollectionItemPage(ctx, collectionID, page, pageSize)
}
