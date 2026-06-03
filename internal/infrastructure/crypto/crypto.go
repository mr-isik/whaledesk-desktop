package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"os"

	"github.com/zalando/go-keyring"
)

const (
	keyringService = "whaledesk-desktop"
	keyringUser    = "env-encryption-key"
)

type CryptoService struct {
	key []byte
}

func NewCryptoService() (*CryptoService, error) {
	if os.Getenv("CI") == "true" || os.Getenv("GITHUB_ACTIONS") == "true" {
		keyring.MockInit()
	}
	key, err := loadOrCreateKey()
	if err != nil {
		return nil, fmt.Errorf("crypto: key initialization error: %w", err)
	}
	return &CryptoService{key: key}, nil
}

func (c *CryptoService) Encrypt(plaintext string) (string, error) {
	block, err := aes.NewCipher(c.key)
	if err != nil {
		return "", fmt.Errorf("crypto: failed to create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("crypto: failed to create GCM: %w", err)
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("crypto: failed to generate nonce: %w", err)
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

func (c *CryptoService) Decrypt(encoded string) (string, error) {
	data, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return "", fmt.Errorf("crypto: base64 decoding error: %w", err)
	}

	block, err := aes.NewCipher(c.key)
	if err != nil {
		return "", fmt.Errorf("crypto: failed to create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("crypto: failed to create GCM: %w", err)
	}

	if len(data) < gcm.NonceSize() {
		return "", errors.New("crypto: encrypted data is too short")
	}

	nonce, ciphertext := data[:gcm.NonceSize()], data[gcm.NonceSize():]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", fmt.Errorf("crypto: decryption failed (corrupted data or incorrect key): %w", err)
	}

	return string(plaintext), nil
}

func loadOrCreateKey() ([]byte, error) {

	encoded, err := keyring.Get(keyringService, keyringUser)
	if err == nil {
		key, decodeErr := base64.StdEncoding.DecodeString(encoded)
		if decodeErr != nil {
			return nil, fmt.Errorf("crypto: invalid key in keyring: %w", decodeErr)
		}
		if len(key) != 32 {
			return nil, errors.New("crypto: key in keyring must be 32 bytes")
		}
		return key, nil
	}

	key := make([]byte, 32)
	if _, err := io.ReadFull(rand.Reader, key); err != nil {
		return nil, fmt.Errorf("crypto: failed to generate new key: %w", err)
	}

	encoded = base64.StdEncoding.EncodeToString(key)
	if setErr := keyring.Set(keyringService, keyringUser, encoded); setErr != nil {
		return nil, fmt.Errorf("crypto: failed to save key to keyring: %w", setErr)
	}

	return key, nil
}
