package usecase

import (
	"context"
	"dockit-desktop/internal/domain"
	"dockit-desktop/internal/infrastructure/dbmanager"
	"dockit-desktop/internal/ports"
	"fmt"
	"sync"

	"github.com/google/uuid"
)

type DbManagerUsecase struct {
	mu          sync.Mutex
	activePort  ports.DbManagerPort
	activeConn  *domain.DbConnection
	connections []domain.DbConnection
}

func NewDbManagerUsecase() *DbManagerUsecase {
	return &DbManagerUsecase{
		connections: []domain.DbConnection{},
	}
}

func (uc *DbManagerUsecase) AddConnection(conn domain.DbConnection) domain.DbConnection {
	uc.mu.Lock()
	defer uc.mu.Unlock()

	if conn.ID == "" {
		conn.ID = uuid.NewString()
	}
	uc.connections = append(uc.connections, conn)
	return conn
}

func (uc *DbManagerUsecase) ListConnections() []domain.DbConnection {
	uc.mu.Lock()
	defer uc.mu.Unlock()
	return uc.connections
}

func (uc *DbManagerUsecase) RemoveConnection(ctx context.Context, id string) error {
	uc.mu.Lock()
	defer uc.mu.Unlock()

	if uc.activeConn != nil && uc.activeConn.ID == id {
		if uc.activePort != nil {
			_ = uc.activePort.Disconnect(ctx)
		}
		uc.activePort = nil
		uc.activeConn = nil
	}

	newConns := uc.connections[:0]
	for _, c := range uc.connections {
		if c.ID != id {
			newConns = append(newConns, c)
		}
	}
	uc.connections = newConns
	return nil
}

func (uc *DbManagerUsecase) Connect(ctx context.Context, id string) error {
	uc.mu.Lock()
	defer uc.mu.Unlock()

	var found *domain.DbConnection
	for i := range uc.connections {
		if uc.connections[i].ID == id {
			found = &uc.connections[i]
			break
		}
	}
	if found == nil {
		return fmt.Errorf("connection profile not found: %s", id)
	}

	if uc.activePort != nil {
		_ = uc.activePort.Disconnect(ctx)
	}

	manager, err := dbmanager.NewManagerForType(found.Type)
	if err != nil {
		return err
	}

	if err := manager.Connect(ctx, *found); err != nil {
		return err
	}

	uc.activePort = manager
	uc.activeConn = found
	return nil
}

func (uc *DbManagerUsecase) Disconnect(ctx context.Context) error {
	uc.mu.Lock()
	defer uc.mu.Unlock()

	if uc.activePort == nil {
		return nil
	}
	err := uc.activePort.Disconnect(ctx)
	uc.activePort = nil
	uc.activeConn = nil
	return err
}

func (uc *DbManagerUsecase) GetActiveConnection() *domain.DbConnection {
	uc.mu.Lock()
	defer uc.mu.Unlock()
	return uc.activeConn
}

func (uc *DbManagerUsecase) IsConnected(ctx context.Context) bool {
	uc.mu.Lock()
	defer uc.mu.Unlock()
	if uc.activePort == nil {
		return false
	}
	return uc.activePort.Ping(ctx) == nil
}

func (uc *DbManagerUsecase) ListDatabases(ctx context.Context) ([]domain.DbDatabase, error) {
	uc.mu.Lock()
	p := uc.activePort
	uc.mu.Unlock()
	if p == nil {
		return nil, fmt.Errorf("no active database connection")
	}
	return p.ListDatabases(ctx)
}

func (uc *DbManagerUsecase) ListSchemas(ctx context.Context) ([]domain.DbSchema, error) {
	uc.mu.Lock()
	p := uc.activePort
	uc.mu.Unlock()
	if p == nil {
		return nil, fmt.Errorf("no active database connection")
	}
	return p.ListSchemas(ctx)
}

func (uc *DbManagerUsecase) ListTables(ctx context.Context, schema string) ([]domain.DbTable, error) {
	uc.mu.Lock()
	p := uc.activePort
	uc.mu.Unlock()
	if p == nil {
		return nil, fmt.Errorf("no active database connection")
	}
	return p.ListTables(ctx, schema)
}

func (uc *DbManagerUsecase) DescribeTable(ctx context.Context, schema, table string) ([]domain.DbColumn, error) {
	uc.mu.Lock()
	p := uc.activePort
	uc.mu.Unlock()
	if p == nil {
		return nil, fmt.Errorf("no active database connection")
	}
	return p.DescribeTable(ctx, schema, table)
}

func (uc *DbManagerUsecase) ExecuteQuery(ctx context.Context, query string) (*domain.QueryResult, error) {
	uc.mu.Lock()
	p := uc.activePort
	uc.mu.Unlock()
	if p == nil {
		return nil, fmt.Errorf("no active database connection")
	}
	return p.ExecuteQuery(ctx, query)
}
