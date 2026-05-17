package usecase

import (
	"context"
	"dockit-desktop/internal/domain"
	"dockit-desktop/internal/ports"
)

// DockerUsecase, Docker container ve image işlemlerine ait iş mantığını yönetir.
type DockerUsecase struct {
	dockerPort ports.DockerPort
}

func NewDockerUsecase(dp ports.DockerPort) *DockerUsecase {
	return &DockerUsecase{dockerPort: dp}
}

// IsDaemonRunning, Docker daemon'unun erişilebilir olup olmadığını döndürür.
func (uc *DockerUsecase) IsDaemonRunning(ctx context.Context) bool {
	return uc.dockerPort.Ping(ctx) == nil
}

// GetContainers, tüm container'ları (durdurulanlar dahil) döndürür.
func (uc *DockerUsecase) GetContainers(ctx context.Context) ([]domain.Container, error) {
	return uc.dockerPort.ListContainers(ctx)
}

// StartContainer, belirtilen container'ı başlatır.
func (uc *DockerUsecase) StartContainer(ctx context.Context, id string) error {
	return uc.dockerPort.StartContainer(ctx, id)
}

// StopContainer, belirtilen container'ı durdurur.
func (uc *DockerUsecase) StopContainer(ctx context.Context, id string) error {
	return uc.dockerPort.StopContainer(ctx, id)
}

// RestartContainer, belirtilen container'ı yeniden başlatır.
func (uc *DockerUsecase) RestartContainer(ctx context.Context, id string) error {
	return uc.dockerPort.RestartContainer(ctx, id)
}

// RemoveContainer, belirtilen container'ı kaldırır.
func (uc *DockerUsecase) RemoveContainer(ctx context.Context, id string, force bool) error {
	return uc.dockerPort.RemoveContainer(ctx, id, force)
}

// GetContainerLogs, belirtilen container'ın son loglarını döndürür.
func (uc *DockerUsecase) GetContainerLogs(ctx context.Context, id string, tail string) ([]domain.ContainerLog, error) {
	if tail == "" {
		tail = "100"
	}
	return uc.dockerPort.GetContainerLogs(ctx, id, tail)
}

// GetContainerStats, belirtilen container'ın anlık CPU/Memory istatistiklerini döndürür.
func (uc *DockerUsecase) GetContainerStats(ctx context.Context, id string) (*domain.ContainerStats, error) {
	return uc.dockerPort.GetContainerStats(ctx, id)
}

// GetImages, yerel Docker image'larını döndürür.
func (uc *DockerUsecase) GetImages(ctx context.Context) ([]domain.ImageInfo, error) {
	return uc.dockerPort.ListImages(ctx)
}

// RemoveImage, belirtilen image'ı kaldırır.
func (uc *DockerUsecase) RemoveImage(ctx context.Context, id string, force bool) error {
	return uc.dockerPort.RemoveImage(ctx, id, force)
}

// PullImage, belirtilen image'ı Docker Hub'dan çeker.
func (uc *DockerUsecase) PullImage(ctx context.Context, imageName string) error {
	return uc.dockerPort.PullImage(ctx, imageName)
}
