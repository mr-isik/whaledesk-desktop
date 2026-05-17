package ports

import (
	"context"
	"dockit-desktop/internal/domain"
)

// DockerPort, Docker daemon ile iletişim kurmak için gerekli interface'i tanımlar.
// (SOLID - I: Interface Segregation, D: Dependency Inversion)
type DockerPort interface {
	// Container işlemleri
	ListContainers(ctx context.Context) ([]domain.Container, error)
	StartContainer(ctx context.Context, id string) error
	StopContainer(ctx context.Context, id string) error
	RestartContainer(ctx context.Context, id string) error
	RemoveContainer(ctx context.Context, id string, force bool) error
	GetContainerLogs(ctx context.Context, id string, tail string) ([]domain.ContainerLog, error)
	GetContainerStats(ctx context.Context, id string) (*domain.ContainerStats, error)

	// Image işlemleri
	ListImages(ctx context.Context) ([]domain.ImageInfo, error)
	RemoveImage(ctx context.Context, id string, force bool) error
	PullImage(ctx context.Context, imageName string) error

	// Daemon durumu
	Ping(ctx context.Context) error
}
