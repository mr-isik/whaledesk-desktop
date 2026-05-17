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

// HTTPClient, dış HTTP API'lara istek yapar.
// APIPort interface'ini implemente eder.
type HTTPClient struct {
	client *http.Client
}

// NewHTTPClient, timeout ayarlı yeni bir HTTP client oluşturur.
func NewHTTPClient() *HTTPClient {
	return &HTTPClient{
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// SendRequest, verilen method, url ve payload ile bir HTTP isteği gönderir.
// Yanıtı domain.APIRequest olarak döndürür ve geçmişe kaydedilmesi için oluşturulmuş zaman bilgisini içerir.
func (c *HTTPClient) SendRequest(ctx context.Context, method string, url string, payload string) (*domain.APIRequest, error) {
	method = strings.ToUpper(method)

	var bodyReader io.Reader
	if payload != "" {
		bodyReader = strings.NewReader(payload)
	}

	req, err := http.NewRequestWithContext(ctx, method, url, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("istek oluşturulamadı: %w", err)
	}

	// Content-Type belirleme: payload varsa ve JSON gibi görünüyorsa json olarak ayarla
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
		// Bağlantı hatası durumunda hata kaydını oluştur
		return &domain.APIRequest{
			URL:       url,
			Method:    method,
			Payload:   payload,
			Response:  err.Error(),
			Status:    0,
			CreatedAt: startTime,
		}, fmt.Errorf("istek gönderilemedi: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("yanıt okunamadı: %w", err)
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
