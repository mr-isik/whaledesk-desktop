package dbmanager

import (
	"whaledesk-desktop/internal/domain"
	"whaledesk-desktop/internal/infrastructure/dbmanager/postgres"
	"whaledesk-desktop/internal/ports"
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
