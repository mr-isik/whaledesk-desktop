package usecase

import (
	"context"
	"dockit-desktop/internal/domain"
	"dockit-desktop/internal/ports"
)

type DockerUsecase struct {
	dockerPort ports.DockerPort
}

func NewDockerUsecase(dp ports.DockerPort) *DockerUsecase {
	return &DockerUsecase{dockerPort: dp}
}

func (uc *DockerUsecase) IsDaemonRunning(ctx context.Context) bool {
	return uc.dockerPort.Ping(ctx) == nil
}

func (uc *DockerUsecase) GetContainers(ctx context.Context) ([]domain.Container, error) {
	return uc.dockerPort.ListContainers(ctx)
}

func (uc *DockerUsecase) StartContainer(ctx context.Context, id string) error {
	return uc.dockerPort.StartContainer(ctx, id)
}

func (uc *DockerUsecase) StopContainer(ctx context.Context, id string) error {
	return uc.dockerPort.StopContainer(ctx, id)
}

func (uc *DockerUsecase) RestartContainer(ctx context.Context, id string) error {
	return uc.dockerPort.RestartContainer(ctx, id)
}

func (uc *DockerUsecase) RemoveContainer(ctx context.Context, id string, force bool) error {
	return uc.dockerPort.RemoveContainer(ctx, id, force)
}

func (uc *DockerUsecase) GetContainerLogs(ctx context.Context, id string, tail string) ([]domain.ContainerLog, error) {
	if tail == "" {
		tail = "100"
	}
	return uc.dockerPort.GetContainerLogs(ctx, id, tail)
}

func (uc *DockerUsecase) GetContainerStats(ctx context.Context, id string) (*domain.ContainerStats, error) {
	return uc.dockerPort.GetContainerStats(ctx, id)
}

func (uc *DockerUsecase) GetImages(ctx context.Context) ([]domain.ImageInfo, error) {
	return uc.dockerPort.ListImages(ctx)
}

func (uc *DockerUsecase) RemoveImage(ctx context.Context, id string, force bool) error {
	return uc.dockerPort.RemoveImage(ctx, id, force)
}

func (uc *DockerUsecase) PullImage(ctx context.Context, imageName string) error {
	return uc.dockerPort.PullImage(ctx, imageName)
}
