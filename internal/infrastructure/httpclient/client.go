package httpclient

import (
	"context"
	"dockit-desktop/internal/domain"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type HTTPClient struct {
	client *http.Client
}

func NewHTTPClient() *HTTPClient {
	return &HTTPClient{
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (c *HTTPClient) SendRequest(ctx context.Context, method string, url string, payload string) (*domain.APIRequest, error) {
	method = strings.ToUpper(method)

	var bodyReader io.Reader
	if payload != "" {
		bodyReader = strings.NewReader(payload)
	}

	req, err := http.NewRequestWithContext(ctx, method, url, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	if payload != "" {
		trimmed := strings.TrimSpace(payload)
		if strings.HasPrefix(trimmed, "{") || strings.HasPrefix(trimmed, "[") {
			req.Header.Set("Content-Type", "application/json")
		} else {
			req.Header.Set("Content-Type", "text/plain")
		}
	}

	req.Header.Set("Accept", "application/json, text/plain, */*")
	req.Header.Set("User-Agent", "Dockit-Desktop/1.0")

	startTime := time.Now()

	resp, err := c.client.Do(req)
	if err != nil {

		return &domain.APIRequest{
			URL:       url,
			Method:    method,
			Payload:   payload,
			Response:  err.Error(),
			Status:    0,
			CreatedAt: startTime,
		}, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	return &domain.APIRequest{
		URL:       url,
		Method:    method,
		Payload:   payload,
		Response:  string(body),
		Status:    resp.StatusCode,
		CreatedAt: startTime,
	}, nil
}
