package usecase

import (
	"context"
	"encoding/json"

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

func (uc *APIUsecase) ExecuteAndSaveRequest(ctx context.Context, method, url, payload string, headers map[string]string) (*domain.APIRequest, error) {

	req, err := uc.apiPort.SendRequest(ctx, method, url, payload, headers)
	if err != nil {
		return nil, err
	}

	if headers != nil {
		hBytes, _ := json.Marshal(headers)
		req.Headers = string(hBytes)
	}

	if err := uc.dbPort.SaveAPIRequest(ctx, req); err != nil {
		return req, err
	}

	return req, nil
}
