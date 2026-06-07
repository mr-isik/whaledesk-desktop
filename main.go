package main

import (
	"embed"
	"log"
	"os"
	"path/filepath"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"

	"whaledesk-desktop/bindings"
	"whaledesk-desktop/internal/infrastructure/crypto"
	"whaledesk-desktop/internal/infrastructure/database"
	"whaledesk-desktop/internal/infrastructure/docker"
	"whaledesk-desktop/internal/infrastructure/httpclient"
	"whaledesk-desktop/internal/infrastructure/openai"
	"whaledesk-desktop/internal/usecase"
)

var assets embed.FS

func getDBPath() string {
	configDir, err := os.UserConfigDir()
	if err != nil {
		configDir, err = os.UserHomeDir()
		if err != nil {
			configDir = "."
		}
	}
	appDir := filepath.Join(configDir, "whaledesk")
	if err := os.MkdirAll(appDir, 0755); err != nil {
		log.Printf("Warning: Failed to create app config dir: %v", err)
	}
	return filepath.Join(appDir, "whaledesk.db")
}

func main() {

	dockerClient, err := docker.NewDockerClient()
	if err != nil {
		log.Printf("Warning: Docker client not available: %v", err)
	}

	dbPath := getDBPath()
	dbClient, err := database.NewSQLiteDB(dbPath)
	if err != nil {
		log.Fatalf("Failed to initialize SQLite database at %s: %v", dbPath, err)
	}

	httpClient := httpclient.NewHTTPClient()
	openaiClient := openai.NewOpenAIClient()

	cryptoService, err := crypto.NewCryptoService()
	if err != nil {
		log.Fatalf("Failed to initialize crypto service: %v", err)
	}

	dockerUC := usecase.NewDockerUsecase(dockerClient)
	dbUC := usecase.NewDatabaseUsecase(dbClient)
	apiUC := usecase.NewAPIUsecase(httpClient, dbClient)
	dbManagerUC := usecase.NewDbManagerUsecase(dbClient, cryptoService)
	envUC := usecase.NewEnvManagerUsecase(dbClient, cryptoService)
	settingsUC := usecase.NewSettingsUsecase(dbClient, cryptoService)
	aiUC := usecase.NewAIUsecase(openaiClient, dbClient, dbClient, envUC, cryptoService)

	dockerBinding := bindings.NewDockerBinding(dockerUC)
	dbBinding := bindings.NewDatabaseBinding(dbUC)
	apiBinding := bindings.NewAPIBinding(apiUC)
	dbManagerBinding := bindings.NewDbManagerBinding(dbManagerUC)
	envBinding := bindings.NewEnvBinding(envUC, apiUC)
	settingsBinding := bindings.NewSettingsBinding(settingsUC)
	aiBinding := bindings.NewAIBinding(aiUC)

	app := NewApp(dockerBinding, dbBinding, apiBinding, dbManagerBinding, envBinding, settingsBinding, aiBinding)

	err = wails.Run(&options.App{
		Title:  "whaledesk-desktop",
		Width:  1024,
		Height: 768,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.startup,
		Bind: []interface{}{
			app,
			dockerBinding,
			dbBinding,
			apiBinding,
			dbManagerBinding,
			envBinding,
			settingsBinding,
			aiBinding,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
