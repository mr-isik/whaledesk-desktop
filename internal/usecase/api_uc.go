package usecase

import (
	"context"
	"dockit-desktop/internal/domain"
	"dockit-desktop/internal/ports"
)

type APIUsecase struct {
	apiPort ports.APIPort
	dbPort  ports.DatabasePort
}

func NewAPIUsecase(ap ports.APIPort, db ports.DatabasePort) *APIUsecase {
	return &APIUsecase{
		apiPort: ap,
		dbPort:  db,
	}
}

// ExecuteAndSaveRequest makes an HTTP request and logs the result to DB
func (uc *APIUsecase) ExecuteAndSaveRequest(ctx context.Context, method, url, payload string) (*domain.APIRequest, error) {
	// Call external API
	req, err := uc.apiPort.SendRequest(ctx, method, url, payload)
	if err != nil {
		return nil, err
	}

	// Save log to DB
	if err := uc.dbPort.SaveAPIRequest(ctx, req); err != nil {
		// Even if saving to DB fails, we might still want to return the request result or log the error
		return req, err
	}

	return req, nil
}
