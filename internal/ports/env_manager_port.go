package ports

import (
	"context"
	"whaledesk-desktop/internal/domain"
)

type EnvStorePort interface {
	CreateEnvironment(ctx context.Context, env *domain.Environment) error

	ListEnvironments(ctx context.Context) ([]domain.Environment, error)

	DeleteEnvironment(ctx context.Context, id string) error

	SetActiveEnvironment(ctx context.Context, id string) error

	GetActiveEnvironmentID(ctx context.Context) (string, error)

	AddVariable(ctx context.Context, v *domain.EnvVariable, encryptedValue string) error

	UpdateVariable(ctx context.Context, varID string, encryptedValue string, v *domain.EnvVariable) error

	DeleteVariable(ctx context.Context, varID string) error

	GetVariables(ctx context.Context, envID string) ([]domain.EnvVariable, error)
}
