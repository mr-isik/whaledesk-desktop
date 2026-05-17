package docker

import (
	"bufio"
	"context"
	"dockit-desktop/internal/domain"
	"encoding/json"
	"io"
	"strings"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/client"
)

type DockerClient struct {
	cli *client.Client
}

func NewDockerClient() (*DockerClient, error) {
	cli, err := client.NewClientWithOpts(
		client.FromEnv,
		client.WithAPIVersionNegotiation(),
	)
	if err != nil {
		return nil, err
	}
	return &DockerClient{cli: cli}, nil
}

func (d *DockerClient) ListContainers(ctx context.Context) ([]domain.Container, error) {
	list, err := d.cli.ContainerList(ctx, container.ListOptions{All: true})
	if err != nil {
		return nil, err
	}

	var result []domain.Container
	for _, c := range list {
		name := ""
		if len(c.Names) > 0 {
			name = strings.TrimPrefix(c.Names[0], "/")
		}

		var ports []domain.Port
		for _, p := range c.Ports {
			ports = append(ports, domain.Port{
				IP:          p.IP,
				PrivatePort: p.PrivatePort,
				PublicPort:  p.PublicPort,
				Type:        p.Type,
			})
		}

		result = append(result, domain.Container{
			ID:      c.ID,
			ShortID: c.ID[:12],
			Name:    name,
			Image:   c.Image,
			Status:  c.Status,
			State:   c.State,
			Ports:   ports,
			Labels:  c.Labels,
		})
	}
	return result, nil
}

func (d *DockerClient) StartContainer(ctx context.Context, id string) error {
	return d.cli.ContainerStart(ctx, id, container.StartOptions{})
}

func (d *DockerClient) StopContainer(ctx context.Context, id string) error {
	timeout := 10
	return d.cli.ContainerStop(ctx, id, container.StopOptions{Timeout: &timeout})
}

func (d *DockerClient) RestartContainer(ctx context.Context, id string) error {
	timeout := 10
	return d.cli.ContainerRestart(ctx, id, container.StopOptions{Timeout: &timeout})
}

func (d *DockerClient) RemoveContainer(ctx context.Context, id string, force bool) error {
	return d.cli.ContainerRemove(ctx, id, container.RemoveOptions{Force: force})
}

func (d *DockerClient) GetContainerLogs(ctx context.Context, id string, tail string) ([]domain.ContainerLog, error) {
	reader, err := d.cli.ContainerLogs(ctx, id, container.LogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Timestamps: true,
		Tail:       tail,
	})
	if err != nil {
		return nil, err
	}
	defer reader.Close()

	var logs []domain.ContainerLog
	scanner := bufio.NewScanner(reader)
	for scanner.Scan() {
		line := scanner.Text()
		stream := "stdout"

		if len(line) > 0 && line[0] == 2 {
			stream = "stderr"
		}

		logLine := line
		if len(line) >= 8 {
			logLine = line[8:]
		}

		parts := strings.SplitN(logLine, " ", 2)
		ts, msg := "", logLine
		if len(parts) == 2 {
			ts, msg = parts[0], parts[1]
		}

		logs = append(logs, domain.ContainerLog{
			ContainerID: id,
			Stream:      stream,
			Log:         msg,
			Timestamp:   ts,
		})
	}
	return logs, nil
}

func (d *DockerClient) GetContainerStats(ctx context.Context, id string) (*domain.ContainerStats, error) {
	resp, err := d.cli.ContainerStats(ctx, id, false)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var raw container.StatsResponse
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, err
	}

	cpuDelta := float64(raw.CPUStats.CPUUsage.TotalUsage - raw.PreCPUStats.CPUUsage.TotalUsage)
	systemDelta := float64(raw.CPUStats.SystemUsage - raw.PreCPUStats.SystemUsage)
	numCPU := float64(raw.CPUStats.OnlineCPUs)
	if numCPU == 0 {
		numCPU = float64(len(raw.CPUStats.CPUUsage.PercpuUsage))
	}
	cpuPercent := 0.0
	if systemDelta > 0 {
		cpuPercent = (cpuDelta / systemDelta) * numCPU * 100.0
	}

	memUsage := raw.MemoryStats.Usage - raw.MemoryStats.Stats["cache"]
	memLimit := raw.MemoryStats.Limit
	memPercent := 0.0
	if memLimit > 0 {
		memPercent = (float64(memUsage) / float64(memLimit)) * 100.0
	}

	var netRx, netTx uint64
	for _, nw := range raw.Networks {
		netRx += nw.RxBytes
		netTx += nw.TxBytes
	}

	return &domain.ContainerStats{
		ContainerID:   id,
		CPUPercent:    cpuPercent,
		MemoryUsage:   memUsage,
		MemoryLimit:   memLimit,
		MemoryPercent: memPercent,
		NetworkRx:     netRx,
		NetworkTx:     netTx,
	}, nil
}

func (d *DockerClient) ListImages(ctx context.Context) ([]domain.ImageInfo, error) {
	images, err := d.cli.ImageList(ctx, image.ListOptions{All: false})
	if err != nil {
		return nil, err
	}

	var result []domain.ImageInfo
	for _, img := range images {
		result = append(result, domain.ImageInfo{
			ID:      img.ID,
			Tags:    img.RepoTags,
			Size:    img.Size,
			Created: img.Created,
		})
	}
	return result, nil
}

func (d *DockerClient) RemoveImage(ctx context.Context, id string, force bool) error {
	_, err := d.cli.ImageRemove(ctx, id, image.RemoveOptions{Force: force, PruneChildren: true})
	return err
}

func (d *DockerClient) PullImage(ctx context.Context, imageName string) error {
	reader, err := d.cli.ImagePull(ctx, imageName, image.PullOptions{})
	if err != nil {
		return err
	}
	defer reader.Close()

	_, err = io.Copy(io.Discard, reader)
	return err
}

func (d *DockerClient) PruneContainers(ctx context.Context) (uint64, error) {
	report, err := d.cli.ContainersPrune(ctx, filters.Args{})
	if err != nil {
		return 0, err
	}
	return report.SpaceReclaimed, nil
}

func (d *DockerClient) Ping(ctx context.Context) error {
	_, err := d.cli.Ping(ctx)
	return err
}
