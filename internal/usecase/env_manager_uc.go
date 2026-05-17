package usecase

import (
	"context"
	"fmt"
	"regexp"
	"sync"
	"time"

	"github.com/google/uuid"

	"dockit-desktop/internal/domain"
	"dockit-desktop/internal/infrastructure/crypto"
	"dockit-desktop/internal/ports"
)

const secretMask = "••••••••"

var varPattern = regexp.MustCompile(`\{\{([a-zA-Z0-9_]+)\}\}`)

type EnvManagerUsecase struct {
	mu     sync.RWMutex
	store  ports.EnvStorePort
	crypto *crypto.CryptoService
}

func NewEnvManagerUsecase(store ports.EnvStorePort, cs *crypto.CryptoService) *EnvManagerUsecase {
	return &EnvManagerUsecase{
		store:  store,
		crypto: cs,
	}
}

func (uc *EnvManagerUsecase) CreateEnvironment(ctx context.Context, name string) (*domain.Environment, error) {
	if name == "" {
		return nil, fmt.Errorf("env: environment name cannot be empty")
	}
	env := &domain.Environment{
		ID:        uuid.NewString(),
		Name:      name,
		IsActive:  false,
		Variables: nil,
		CreatedAt: time.Now().UTC(),
	}
	if err := uc.store.CreateEnvironment(ctx, env); err != nil {
		return nil, fmt.Errorf("env: failed to create environment: %w", err)
	}
	return env, nil
}

func (uc *EnvManagerUsecase) ListEnvironments(ctx context.Context) ([]domain.Environment, error) {
	uc.mu.RLock()
	defer uc.mu.RUnlock()

	envs, err := uc.store.ListEnvironments(ctx)
	if err != nil {
		return nil, err
	}

	for i := range envs {
		vars, err := uc.store.GetVariables(ctx, envs[i].ID)
		if err != nil {
			return nil, err
		}
		for j := range vars {
			if vars[j].IsSecret {

				vars[j].Value = secretMask
			} else {

				plain, decErr := uc.crypto.Decrypt(vars[j].Value)
				if decErr != nil {
					vars[j].Value = "[şifre çözme hatası]"
				} else {
					vars[j].Value = plain
				}
			}
		}
		envs[i].Variables = vars
	}
	return envs, nil
}

func (uc *EnvManagerUsecase) DeleteEnvironment(ctx context.Context, id string) error {
	return uc.store.DeleteEnvironment(ctx, id)
}

func (uc *EnvManagerUsecase) SetActiveEnvironment(ctx context.Context, id string) error {
	return uc.store.SetActiveEnvironment(ctx, id)
}

func (uc *EnvManagerUsecase) AddVariable(ctx context.Context, envID, key, value, description string, isSecret bool) (*domain.EnvVariable, error) {
	uc.mu.Lock()
	defer uc.mu.Unlock()

	if key == "" {
		return nil, fmt.Errorf("env: variable key cannot be empty")
	}

	encrypted, err := uc.crypto.Encrypt(value)
	if err != nil {
		return nil, fmt.Errorf("env: failed to encrypt value: %w", err)
	}

	v := &domain.EnvVariable{
		ID:          uuid.NewString(),
		EnvID:       envID,
		Key:         key,
		IsSecret:    isSecret,
		Description: description,
	}

	if err := uc.store.AddVariable(ctx, v, encrypted); err != nil {
		return nil, fmt.Errorf("env: failed to save variable: %w", err)
	}

	if isSecret {
		v.Value = secretMask
	} else {
		v.Value = value
	}
	return v, nil
}

func (uc *EnvManagerUsecase) UpdateVariable(ctx context.Context, varID, key, value, description string, isSecret bool) error {
	uc.mu.Lock()
	defer uc.mu.Unlock()

	encrypted, err := uc.crypto.Encrypt(value)
	if err != nil {
		return fmt.Errorf("env: failed to encrypt value: %w", err)
	}

	v := &domain.EnvVariable{
		Key:         key,
		IsSecret:    isSecret,
		Description: description,
	}
	return uc.store.UpdateVariable(ctx, varID, encrypted, v)
}

func (uc *EnvManagerUsecase) DeleteVariable(ctx context.Context, varID string) error {
	return uc.store.DeleteVariable(ctx, varID)
}

func (uc *EnvManagerUsecase) ResolveTemplate(ctx context.Context, template string) (string, error) {
	uc.mu.RLock()
	defer uc.mu.RUnlock()

	if !varPattern.MatchString(template) {
		return template, nil
	}

	activeID, err := uc.store.GetActiveEnvironmentID(ctx)
	if err != nil {
		return template, fmt.Errorf("env: failed to get active environment: %w", err)
	}
	if activeID == "" {

		return template, nil
	}

	encVars, err := uc.store.GetVariables(ctx, activeID)
	if err != nil {
		return template, fmt.Errorf("env: failed to get variables: %w", err)
	}

	resolved := make(map[string]string, len(encVars))
	for _, v := range encVars {
		plain, decErr := uc.crypto.Decrypt(v.Value)
		if decErr != nil {

			continue
		}
		resolved[v.Key] = plain
	}

	result := varPattern.ReplaceAllStringFunc(template, func(match string) string {

		key := match[2 : len(match)-2]
		if val, ok := resolved[key]; ok {
			return val
		}
		return match
	})

	return result, nil
}
