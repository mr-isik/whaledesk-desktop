package bindings

import (
	"context"
	"dockit-desktop/internal/domain"
	"dockit-desktop/internal/usecase"
)

// DockerBinding, frontend'in Docker işlemleri için çağırabileceği metodları sunar.
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

// IsDaemonRunning, Docker'ın çalışıp çalışmadığını döndürür.
func (b *DockerBinding) IsDaemonRunning() bool {
	return b.uc.IsDaemonRunning(b.ctx)
}

// GetContainers, tüm container'ları listeler.
func (b *DockerBinding) GetContainers() ([]domain.Container, error) {
	return b.uc.GetContainers(b.ctx)
}

// StartContainer, container'ı başlatır.
func (b *DockerBinding) StartContainer(id string) error {
	return b.uc.StartContainer(b.ctx, id)
}

// StopContainer, container'ı durdurur.
func (b *DockerBinding) StopContainer(id string) error {
	return b.uc.StopContainer(b.ctx, id)
}

// RestartContainer, container'ı yeniden başlatır.
func (b *DockerBinding) RestartContainer(id string) error {
	return b.uc.RestartContainer(b.ctx, id)
}

// RemoveContainer, container'ı kaldırır.
func (b *DockerBinding) RemoveContainer(id string, force bool) error {
	return b.uc.RemoveContainer(b.ctx, id, force)
}

// GetContainerLogs, container loglarını döndürür.
func (b *DockerBinding) GetContainerLogs(id string, tail string) ([]domain.ContainerLog, error) {
	return b.uc.GetContainerLogs(b.ctx, id, tail)
}

// GetContainerStats, container kaynak kullanım istatistiklerini döndürür.
func (b *DockerBinding) GetContainerStats(id string) (*domain.ContainerStats, error) {
	return b.uc.GetContainerStats(b.ctx, id)
}

// GetImages, yerel Docker image'larını listeler.
func (b *DockerBinding) GetImages() ([]domain.ImageInfo, error) {
	return b.uc.GetImages(b.ctx)
}

// RemoveImage, image'ı kaldırır.
func (b *DockerBinding) RemoveImage(id string, force bool) error {
	return b.uc.RemoveImage(b.ctx, id, force)
}

// PullImage, Docker Hub'dan image çeker.
func (b *DockerBinding) PullImage(imageName string) error {
	return b.uc.PullImage(b.ctx, imageName)
}
