package main

import (
	"context"
	"whaledesk-desktop/bindings"
)

type App struct {
	ctx              context.Context
	dockerBinding    *bindings.DockerBinding
	dbBinding        *bindings.DatabaseBinding
	apiBinding       *bindings.APIBinding
	dbManagerBinding *bindings.DbManagerBinding
	envBinding       *bindings.EnvBinding
	settingsBinding  *bindings.SettingsBinding
	aiBinding        *bindings.AIBinding
}

func NewApp(
	docker *bindings.DockerBinding,
	db *bindings.DatabaseBinding,
	api *bindings.APIBinding,
	dbMgr *bindings.DbManagerBinding,
	env *bindings.EnvBinding,
	settings *bindings.SettingsBinding,
	ai *bindings.AIBinding,
) *App {
	return &App{
		dockerBinding:    docker,
		dbBinding:        db,
		apiBinding:       api,
		dbManagerBinding: dbMgr,
		envBinding:       env,
		settingsBinding:  settings,
		aiBinding:        ai,
	}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	a.dockerBinding.Startup(ctx)
	a.dbBinding.Startup(ctx)
	a.apiBinding.Startup(ctx)
	a.dbManagerBinding.Startup(ctx)
	a.envBinding.Startup(ctx)
	a.settingsBinding.Startup(ctx)
	a.aiBinding.Startup(ctx)
}
