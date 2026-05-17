package domain

import "time"

type Environment struct {
	ID        string        `json:"id"`
	Name      string        `json:"name"`
	IsActive  bool          `json:"is_active"`
	Variables []EnvVariable `json:"variables"`
	CreatedAt time.Time     `json:"created_at"`
}

type EnvVariable struct {
	ID          string `json:"id"`
	EnvID       string `json:"env_id"`
	Key         string `json:"key"`
	Value       string `json:"value"`
	IsSecret    bool   `json:"is_secret"`
	Description string `json:"description"`
}
