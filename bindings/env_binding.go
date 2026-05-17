package bindings

import (
	"context"
	"dockit-desktop/internal/domain"
	"dockit-desktop/internal/usecase"
)

type EnvBinding struct {
	ctx   context.Context
	envUC *usecase.EnvManagerUsecase
	apiUC *usecase.APIUsecase
}

func NewEnvBinding(envUC *usecase.EnvManagerUsecase, apiUC *usecase.APIUsecase) *EnvBinding {
	return &EnvBinding{envUC: envUC, apiUC: apiUC}
}

func (b *EnvBinding) Startup(ctx context.Context) {
	b.ctx = ctx
}

func (b *EnvBinding) CreateEnvironment(name string) (*domain.Environment, error) {
	return b.envUC.CreateEnvironment(b.ctx, name)
}

func (b *EnvBinding) ListEnvironments() ([]domain.Environment, error) {
	return b.envUC.ListEnvironments(b.ctx)
}

func (b *EnvBinding) DeleteEnvironment(id string) error {
	return b.envUC.DeleteEnvironment(b.ctx, id)
}

func (b *EnvBinding) SetActiveEnvironment(id string) error {
	return b.envUC.SetActiveEnvironment(b.ctx, id)
}

func (b *EnvBinding) AddVariable(envID, key, value, description string, isSecret bool) (*domain.EnvVariable, error) {
	return b.envUC.AddVariable(b.ctx, envID, key, value, description, isSecret)
}

func (b *EnvBinding) UpdateVariable(varID, key, value, description string, isSecret bool) error {
	return b.envUC.UpdateVariable(b.ctx, varID, key, value, description, isSecret)
}

func (b *EnvBinding) DeleteVariable(varID string) error {
	return b.envUC.DeleteVariable(b.ctx, varID)
}

func (b *EnvBinding) ExecuteRequestWithEnv(method, rawURL, rawPayload string) (*domain.APIRequest, error) {

	resolvedURL, err := b.envUC.ResolveTemplate(b.ctx, rawURL)
	if err != nil {
		return nil, err
	}

	resolvedPayload, err := b.envUC.ResolveTemplate(b.ctx, rawPayload)
	if err != nil {
		return nil, err
	}

	return b.apiUC.ExecuteAndSaveRequest(b.ctx, method, resolvedURL, resolvedPayload)
}
