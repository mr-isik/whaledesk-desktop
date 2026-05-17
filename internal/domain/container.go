package domain

// Container, bir Docker container'ını temsil eder.
type Container struct {
	ID      string            `json:"id"`
	ShortID string            `json:"short_id"`
	Name    string            `json:"name"`
	Image   string            `json:"image"`
	Status  string            `json:"status"`
	State   string            `json:"state"`
	Ports   []Port            `json:"ports"`
	Labels  map[string]string `json:"labels"`
}

// Port, bir container port mapping'ini temsil eder.
type Port struct {
	IP          string `json:"ip"`
	PrivatePort uint16 `json:"private_port"`
	PublicPort  uint16 `json:"public_port"`
	Type        string `json:"type"`
}

// ImageInfo, bir Docker image'ını temsil eder.
type ImageInfo struct {
	ID      string   `json:"id"`
	Tags    []string `json:"tags"`
	Size    int64    `json:"size"`
	Created int64    `json:"created"`
}

// ContainerStats, bir container'ın anlık istatistiklerini temsil eder.
type ContainerStats struct {
	ContainerID string  `json:"container_id"`
	CPUPercent  float64 `json:"cpu_percent"`
	MemoryUsage uint64  `json:"memory_usage"`
	MemoryLimit uint64  `json:"memory_limit"`
	MemoryPercent float64 `json:"memory_percent"`
	NetworkRx   uint64  `json:"network_rx"`
	NetworkTx   uint64  `json:"network_tx"`
}

// ContainerLog, bir container'ın log satırını temsil eder.
type ContainerLog struct {
	ContainerID string `json:"container_id"`
	Stream      string `json:"stream"` // "stdout" | "stderr"
	Log         string `json:"log"`
	Timestamp   string `json:"timestamp"`
}
