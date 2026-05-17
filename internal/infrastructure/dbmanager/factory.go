package dbmanager

import (
	"dockit-desktop/internal/domain"
	"dockit-desktop/internal/infrastructure/dbmanager/postgres"
	"dockit-desktop/internal/ports"
	"fmt"
)

func NewManagerForType(dbType domain.DbType) (ports.DbManagerPort, error) {
	switch dbType {
	case domain.DbTypePostgres:
		return postgres.NewPostgresManager(), nil

	default:
		return nil, fmt.Errorf("unsupported database type: %s", dbType)
	}
}
