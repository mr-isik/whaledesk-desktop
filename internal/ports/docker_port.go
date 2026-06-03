package ports

import (
	"context"
	"whaledesk-desktop/internal/domain"
)

type DockerPort interface {
	ListContainers(ctx context.Context) ([]domain.Container, error)
	StartContainer(ctx context.Context, id string) error
	StopContainer(ctx context.Context, id string) error
	RestartContainer(ctx context.Context, id string) error
	RemoveContainer(ctx context.Context, id string, force bool) error
	GetContainerLogs(ctx context.Context, id string, tail string) ([]domain.ContainerLog, error)
	GetContainerStats(ctx context.Context, id string) (*domain.ContainerStats, error)

	ListImages(ctx context.Context) ([]domain.ImageInfo, error)
	RemoveImage(ctx context.Context, id string, force bool) error
	PullImage(ctx context.Context, imageName string) error

	Ping(ctx context.Context) error
}
