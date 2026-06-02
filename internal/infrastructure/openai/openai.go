package openai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"dockit-desktop/internal/ports"
)

const (
	apiEndpoint = "https://api.openai.com/v1/chat/completions"
	model       = "gpt-4o-mini"
)

type OpenAIClient struct {
	httpClient *http.Client
}

func NewOpenAIClient() *OpenAIClient {
	return &OpenAIClient{
		httpClient: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatRequest struct {
	Model       string        `json:"model"`
	Messages    []chatMessage `json:"messages"`
	Temperature float32       `json:"temperature"`
}

type chatResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

func (c *OpenAIClient) GenerateRequest(ctx context.Context, apiKey string, req *ports.AIGenerateRequest, activeEnvVars map[string]string) (*ports.AIGenerateResponse, error) {
	if apiKey == "" {
		return nil, fmt.Errorf("openai: API key is required")
	}

	var envVarsList []string
	for k := range activeEnvVars {
		envVarsList = append(envVarsList, fmt.Sprintf("{{%s}}", k))
	}
	envVarsStr := strings.Join(envVarsList, ", ")
	if envVarsStr == "" {
		envVarsStr = "None"
	}

	systemPrompt := fmt.Sprintf(`You are an API request generator for a desktop HTTP client tool called Dockit.
Given a user's API documentation (YAML or JSON from OpenAPI/Swagger), generate a valid HTTP request for the endpoint they are trying to reach.

Available environment variables (use {{var_name}} syntax):
%s

Respond ONLY with valid JSON in this exact format (no markdown blocks, just raw JSON):
{
  "method": "GET|POST|PUT|DELETE|PATCH",
  "url": "full URL using {{variable}} syntax where appropriate",
  "headers": {"Header-Name": "value"},
  "body": "JSON body string or empty string"
}`, envVarsStr)

	apiReq := chatRequest{
		Model: model,
		Messages: []chatMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: req.DocInput},
		},
		Temperature: 0.2,
	}

	bodyBytes, err := json.Marshal(apiReq)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", apiEndpoint, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create http request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+apiKey)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("openai error (status %d): %s", resp.StatusCode, string(respBody))
	}

	var apiResp chatResponse
	if err := json.Unmarshal(respBody, &apiResp); err != nil {
		return nil, fmt.Errorf("failed to parse openai response: %w", err)
	}

	if len(apiResp.Choices) == 0 {
		return nil, fmt.Errorf("openai returned no choices")
	}

	content := strings.TrimSpace(apiResp.Choices[0].Message.Content)
	// Strip markdown blocks if the model still returns them
	if strings.HasPrefix(content, "```json") {
		content = strings.TrimPrefix(content, "```json")
		content = strings.TrimSuffix(content, "```")
	} else if strings.HasPrefix(content, "```") {
		content = strings.TrimPrefix(content, "```")
		content = strings.TrimSuffix(content, "```")
	}
	content = strings.TrimSpace(content)

	var result ports.AIGenerateResponse
	if err := json.Unmarshal([]byte(content), &result); err != nil {
		return nil, fmt.Errorf("failed to parse generated JSON: %w\nResponse was: %s", err, content)
	}

	return &result, nil
}

func (c *OpenAIClient) GenerateBatchRequests(ctx context.Context, apiKey string, docInput string, activeEnvVars map[string]string) (*ports.AIGenerateBatchResponse, error) {
	if apiKey == "" {
		return nil, fmt.Errorf("openai: API key is required")
	}

	var envVarsList []string
	for k := range activeEnvVars {
		envVarsList = append(envVarsList, fmt.Sprintf("{{%s}}", k))
	}
	envVarsStr := strings.Join(envVarsList, ", ")
	if envVarsStr == "" {
		envVarsStr = "None"
	}

	systemPrompt := fmt.Sprintf(`You are an API request generator for a desktop HTTP client tool called Dockit.
Given an OpenAPI/Swagger documentation chunk (YAML or JSON), extract ALL endpoints found. 
Note: The chunk might be a partial document. Ignore syntax errors and extract any complete endpoints you can identify.

Available environment variables (use {{var_name}} syntax):
%s

Respond ONLY with a JSON array containing the endpoints (no markdown blocks, just raw JSON). Example format:
[
  {
    "method": "GET",
    "url": "full URL using {{variable}} syntax",
    "headers": {"Header-Name": "value"},
    "body": "JSON string or empty",
    "name": "GET /users",
    "description": "Short summary"
  }
]`, envVarsStr)

	// Simple chunking strategy: split by lines, ~500 lines per chunk with 50 lines overlap
	lines := strings.Split(docInput, "\n")
	chunkSize := 500
	overlap := 50
	var chunks []string

	if len(lines) <= chunkSize {
		chunks = append(chunks, docInput)
	} else {
		for i := 0; i < len(lines); i += (chunkSize - overlap) {
			end := i + chunkSize
			if end > len(lines) {
				end = len(lines)
			}
			chunk := strings.Join(lines[i:end], "\n")
			chunks = append(chunks, chunk)
		}
	}

	var allEndpoints []ports.AIGenerateResponse

	for i, chunk := range chunks {
		apiReq := chatRequest{
			Model: model,
			Messages: []chatMessage{
				{Role: "system", Content: systemPrompt},
				{Role: "user", Content: chunk},
			},
			Temperature: 0.1,
		}

		bodyBytes, err := json.Marshal(apiReq)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal request for chunk %d: %w", i, err)
		}

		httpReq, err := http.NewRequestWithContext(ctx, "POST", apiEndpoint, bytes.NewReader(bodyBytes))
		if err != nil {
			return nil, fmt.Errorf("failed to create http request for chunk %d: %w", i, err)
		}

		httpReq.Header.Set("Content-Type", "application/json")
		httpReq.Header.Set("Authorization", "Bearer "+apiKey)

		resp, err := c.httpClient.Do(httpReq)
		if err != nil {
			return nil, fmt.Errorf("failed to execute request for chunk %d: %w", i, err)
		}

		respBody, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			return nil, fmt.Errorf("failed to read response for chunk %d: %w", i, err)
		}

		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("openai error (status %d) on chunk %d: %s", resp.StatusCode, i, string(respBody))
		}

		var apiResp chatResponse
		if err := json.Unmarshal(respBody, &apiResp); err != nil {
			return nil, fmt.Errorf("failed to parse openai response on chunk %d: %w", i, err)
		}

		if len(apiResp.Choices) == 0 {
			continue // No choices for this chunk, skip
		}

		content := strings.TrimSpace(apiResp.Choices[0].Message.Content)
		if strings.HasPrefix(content, "```json") {
			content = strings.TrimPrefix(content, "```json")
			content = strings.TrimSuffix(content, "```")
		} else if strings.HasPrefix(content, "```") {
			content = strings.TrimPrefix(content, "```")
			content = strings.TrimSuffix(content, "```")
		}
		content = strings.TrimSpace(content)

		var endpoints []ports.AIGenerateResponse
		if err := json.Unmarshal([]byte(content), &endpoints); err != nil {
			// If JSON is invalid for a chunk, log it but don't fail the entire batch
			fmt.Printf("Warning: failed to parse JSON from chunk %d: %v\nContent: %s\n", i, err, content)
			continue
		}

		allEndpoints = append(allEndpoints, endpoints...)
	}

	// Deduplicate endpoints based on Method+URL (simple dedup since chunks overlap)
	seen := make(map[string]bool)
	var dedupedEndpoints []ports.AIGenerateResponse
	for _, ep := range allEndpoints {
		key := ep.Method + " " + ep.URL
		if !seen[key] {
			seen[key] = true
			dedupedEndpoints = append(dedupedEndpoints, ep)
		}
	}

	return &ports.AIGenerateBatchResponse{
		Endpoints: dedupedEndpoints,
	}, nil
}
