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

// DbManagerUsecase, dış veritabanlarını yönetme iş mantığını içerir.
// Birden fazla kaydedilmiş bağlantıyı destekler; aktif bağlantı havuzu tutulur.
type DbManagerUsecase struct {
	mu          sync.Mutex
	activePort  ports.DbManagerPort      // Şu an aktif olan bağlantı adaptörü
	activeConn  *domain.DbConnection     // Aktif bağlantının meta verisi
	connections []domain.DbConnection    // Kayıtlı tüm bağlantılar (in-memory)
}

func NewDbManagerUsecase() *DbManagerUsecase {
	return &DbManagerUsecase{
		connections: []domain.DbConnection{},
	}
}

// AddConnection, yeni bir bağlantı profilini kaydeder (bağlanmaz).
func (uc *DbManagerUsecase) AddConnection(conn domain.DbConnection) domain.DbConnection {
	uc.mu.Lock()
	defer uc.mu.Unlock()
	
	if conn.ID == "" {
		conn.ID = uuid.NewString()
	}
	uc.connections = append(uc.connections, conn)
	return conn
}

// ListConnections, kayıtlı tüm bağlantı profillerini döndürür.
func (uc *DbManagerUsecase) ListConnections() []domain.DbConnection {
	uc.mu.Lock()
	defer uc.mu.Unlock()
	return uc.connections
}

// RemoveConnection, kayıtlı bir bağlantıyı siler.
func (uc *DbManagerUsecase) RemoveConnection(ctx context.Context, id string) error {
	uc.mu.Lock()
	defer uc.mu.Unlock()
	
	// Aktif bağlantı ise önce kapat
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

// Connect, belirtilen ID'deki bağlantı profiline bağlanır.
func (uc *DbManagerUsecase) Connect(ctx context.Context, id string) error {
	uc.mu.Lock()
	defer uc.mu.Unlock()
	
	// Bağlantı profilini bul
	var found *domain.DbConnection
	for i := range uc.connections {
		if uc.connections[i].ID == id {
			found = &uc.connections[i]
			break
		}
	}
	if found == nil {
		return fmt.Errorf("bağlantı profili bulunamadı: %s", id)
	}
	
	// Varsa önceki bağlantıyı kapat
	if uc.activePort != nil {
		_ = uc.activePort.Disconnect(ctx)
	}
	
	// Veritabanı tipine uygun manager'ı factory'den al
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

// Disconnect, aktif bağlantıyı kapatır.
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

// GetActiveConnection, aktif bağlantı profilini döndürür.
func (uc *DbManagerUsecase) GetActiveConnection() *domain.DbConnection {
	uc.mu.Lock()
	defer uc.mu.Unlock()
	return uc.activeConn
}

// IsConnected, aktif bir bağlantı olup olmadığını döndürür.
func (uc *DbManagerUsecase) IsConnected(ctx context.Context) bool {
	uc.mu.Lock()
	defer uc.mu.Unlock()
	if uc.activePort == nil {
		return false
	}
	return uc.activePort.Ping(ctx) == nil
}

// --- Proxy: Aktif bağlantı üzerinden veritabanı işlemleri ---

func (uc *DbManagerUsecase) ListDatabases(ctx context.Context) ([]domain.DbDatabase, error) {
	uc.mu.Lock()
	p := uc.activePort
	uc.mu.Unlock()
	if p == nil {
		return nil, fmt.Errorf("aktif bir veritabanı bağlantısı yok")
	}
	return p.ListDatabases(ctx)
}

func (uc *DbManagerUsecase) ListSchemas(ctx context.Context) ([]domain.DbSchema, error) {
	uc.mu.Lock()
	p := uc.activePort
	uc.mu.Unlock()
	if p == nil {
		return nil, fmt.Errorf("aktif bir veritabanı bağlantısı yok")
	}
	return p.ListSchemas(ctx)
}

func (uc *DbManagerUsecase) ListTables(ctx context.Context, schema string) ([]domain.DbTable, error) {
	uc.mu.Lock()
	p := uc.activePort
	uc.mu.Unlock()
	if p == nil {
		return nil, fmt.Errorf("aktif bir veritabanı bağlantısı yok")
	}
	return p.ListTables(ctx, schema)
}

func (uc *DbManagerUsecase) DescribeTable(ctx context.Context, schema, table string) ([]domain.DbColumn, error) {
	uc.mu.Lock()
	p := uc.activePort
	uc.mu.Unlock()
	if p == nil {
		return nil, fmt.Errorf("aktif bir veritabanı bağlantısı yok")
	}
	return p.DescribeTable(ctx, schema, table)
}

func (uc *DbManagerUsecase) ExecuteQuery(ctx context.Context, query string) (*domain.QueryResult, error) {
	uc.mu.Lock()
	p := uc.activePort
	uc.mu.Unlock()
	if p == nil {
		return nil, fmt.Errorf("aktif bir veritabanı bağlantısı yok")
	}
	return p.ExecuteQuery(ctx, query)
}

