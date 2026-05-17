package bindings

import (
	"context"
	"dockit-desktop/internal/domain"
	"dockit-desktop/internal/usecase"
)

type DockerBinding struct {
	ctx context.Context
	uc  *usecase.DockerUsecase
}

func NewDockerBinding(uc *usecase.DockerUsecase) *DockerBinding {
	return &DockerBinding{uc: uc}
}

func (b *DockerBinding) Startup(ctx context.Context) {
	b.ctx = ctx
}

func (b *DockerBinding) IsDaemonRunning() bool {
	return b.uc.IsDaemonRunning(b.ctx)
}

func (b *DockerBinding) GetContainers() ([]domain.Container, error) {
	return b.uc.GetContainers(b.ctx)
}

func (b *DockerBinding) StartContainer(id string) error {
	return b.uc.StartContainer(b.ctx, id)
}

func (b *DockerBinding) StopContainer(id string) error {
	return b.uc.StopContainer(b.ctx, id)
}

func (b *DockerBinding) RestartContainer(id string) error {
	return b.uc.RestartContainer(b.ctx, id)
}

func (b *DockerBinding) RemoveContainer(id string, force bool) error {
	return b.uc.RemoveContainer(b.ctx, id, force)
}

func (b *DockerBinding) GetContainerLogs(id string, tail string) ([]domain.ContainerLog, error) {
	return b.uc.GetContainerLogs(b.ctx, id, tail)
}

func (b *DockerBinding) GetContainerStats(id string) (*domain.ContainerStats, error) {
	return b.uc.GetContainerStats(b.ctx, id)
}

func (b *DockerBinding) GetImages() ([]domain.ImageInfo, error) {
	return b.uc.GetImages(b.ctx)
}

func (b *DockerBinding) RemoveImage(id string, force bool) error {
	return b.uc.RemoveImage(b.ctx, id, force)
}

func (b *DockerBinding) PullImage(imageName string) error {
	return b.uc.PullImage(b.ctx, imageName)
}
