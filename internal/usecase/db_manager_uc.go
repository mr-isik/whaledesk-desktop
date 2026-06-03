package usecase

import (
	"context"
	"whaledesk-desktop/internal/domain"
	"whaledesk-desktop/internal/infrastructure/crypto"
	"whaledesk-desktop/internal/infrastructure/dbmanager"
	"whaledesk-desktop/internal/ports"
	"fmt"
	"sync"

	"github.com/google/uuid"
)

type DbManagerUsecase struct {
	mu         sync.Mutex
	activePort ports.DbManagerPort
	activeConn *domain.DbConnection
	store      ports.DbConnectionStorePort
	crypto     *crypto.CryptoService
}

func NewDbManagerUsecase(store ports.DbConnectionStorePort, cs *crypto.CryptoService) *DbManagerUsecase {
	return &DbManagerUsecase{
		store:  store,
		crypto: cs,
	}
}

func (uc *DbManagerUsecase) AddConnection(ctx context.Context, conn domain.DbConnection) (domain.DbConnection, error) {
	uc.mu.Lock()
	defer uc.mu.Unlock()

	if conn.ID == "" {
		conn.ID = uuid.NewString()
	}
	
	encrypted, err := uc.crypto.Encrypt(conn.Password)
	if err != nil {
		return conn, fmt.Errorf("failed to encrypt password: %w", err)
	}

	if err := uc.store.SaveConnection(ctx, &conn, encrypted); err != nil {
		return conn, fmt.Errorf("failed to save connection: %w", err)
	}

	return conn, nil
}

func (uc *DbManagerUsecase) ListConnections(ctx context.Context) ([]domain.DbConnection, error) {
	uc.mu.Lock()
	defer uc.mu.Unlock()
	
	conns, err := uc.store.ListConnections(ctx)
	if err != nil {
		return nil, err
	}
	
	for i := range conns {
		if conns[i].Password != "" {
			plain, decErr := uc.crypto.Decrypt(conns[i].Password)
			if decErr != nil {
				conns[i].Password = "" // Error handling, don't expose
			} else {
				conns[i].Password = plain
			}
		}
	}
	
	return conns, nil
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

	return uc.store.DeleteConnection(ctx, id)
}

func (uc *DbManagerUsecase) Connect(ctx context.Context, id string) error {
	uc.mu.Lock()
	defer uc.mu.Unlock()

	conns, err := uc.store.ListConnections(ctx)
	if err != nil {
		return fmt.Errorf("failed to load connections: %w", err)
	}

	var found *domain.DbConnection
	for i := range conns {
		if conns[i].ID == id {
			found = &conns[i]
			break
		}
	}
	if found == nil {
		return fmt.Errorf("connection profile not found: %s", id)
	}
	
	if found.Password != "" {
		plain, decErr := uc.crypto.Decrypt(found.Password)
		if decErr == nil {
			found.Password = plain
		}
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

func (uc *DbManagerUsecase) GetTableData(ctx context.Context, req domain.TableDataRequest) (*domain.TableDataResult, error) {
	uc.mu.Lock()
	p := uc.activePort
	uc.mu.Unlock()
	if p == nil {
		return nil, fmt.Errorf("no active database connection")
	}

	if req.PageSize <= 0 {
		req.PageSize = 50
	}
	if req.Page <= 0 {
		req.Page = 1
	}

	return p.GetTableData(ctx, req)
}

func (uc *DbManagerUsecase) InsertRow(ctx context.Context, mutation domain.RowMutation) error {
	uc.mu.Lock()
	p := uc.activePort
	uc.mu.Unlock()
	if p == nil {
		return fmt.Errorf("no active database connection")
	}
	return p.InsertRow(ctx, mutation)
}

func (uc *DbManagerUsecase) UpdateRow(ctx context.Context, mutation domain.RowMutation, primaryKey map[string]interface{}) error {
	uc.mu.Lock()
	p := uc.activePort
	uc.mu.Unlock()
	if p == nil {
		return fmt.Errorf("no active database connection")
	}
	return p.UpdateRow(ctx, mutation, primaryKey)
}

func (uc *DbManagerUsecase) DeleteRows(ctx context.Context, req domain.RowDeleteRequest) (int64, error) {
	uc.mu.Lock()
	p := uc.activePort
	uc.mu.Unlock()
	if p == nil {
		return 0, fmt.Errorf("no active database connection")
	}
	return p.DeleteRows(ctx, req)
}
