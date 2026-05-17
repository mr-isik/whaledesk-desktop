package main

import (
	"context"
	"dockit-desktop/bindings"
)

type App struct {
	ctx              context.Context
	dockerBinding    *bindings.DockerBinding
	dbBinding        *bindings.DatabaseBinding
	apiBinding       *bindings.APIBinding
	dbManagerBinding *bindings.DbManagerBinding
	envBinding       *bindings.EnvBinding
}

func NewApp(
	docker *bindings.DockerBinding,
	db *bindings.DatabaseBinding,
	api *bindings.APIBinding,
	dbMgr *bindings.DbManagerBinding,
	env *bindings.EnvBinding,
) *App {
	return &App{
		dockerBinding:    docker,
		dbBinding:        db,
		apiBinding:       api,
		dbManagerBinding: dbMgr,
		envBinding:       env,
	}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	a.dockerBinding.Startup(ctx)
	a.dbBinding.Startup(ctx)
	a.apiBinding.Startup(ctx)
	a.dbManagerBinding.Startup(ctx)
	a.envBinding.Startup(ctx)
}
