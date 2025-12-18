# Customer API v1

Customer-facing REST API for self-service operations.

## Base URL

```
Production: https://api.gphusa.com/api/v1
Development: https://alanapidev.lamlinks.com/api/v1
```

## Authentication

All endpoints (except `/auth/login` and `/auth/refresh`) require a valid JWT bearer token.

```
Authorization: Bearer <access_token>
```

See [AUTHENTICATION.md](./AUTHENTICATION.md) for detailed authentication documentation.

## Available Modules

### Authentication (`/api/v1/auth/`)

Customer user authentication and session management.

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/auth/login` | POST | No | Authenticate and receive tokens |
| `/auth/refresh` | POST | No | Refresh access token |
| `/auth/logout` | POST | Yes | Logout (invalidate session) |
| `/auth/me` | GET | Yes | Get current user profile |
| `/auth/change-password` | POST | Yes | Change user password |
| `/auth/forgot-password` | POST | No | Request password reset email |
| `/auth/reset-password` | POST | No | Reset password with token |

## Response Format

### Success Response

```json
{
  "field1": "value1",
  "field2": "value2"
}
```

### Error Response

```json
{
  "detail": "Error message describing what went wrong"
}
```

### Rate Limit Error (429)

```json
{
  "detail": "Too many login attempts. Please try again later.",
  "retry_after": 45
}
```

Headers include: `Retry-After: 45`

## Rate Limiting

- Login endpoint: **5 attempts per minute** per IP address
- After exceeding limit, wait for `Retry-After` seconds

## Token Expiration

| Token Type | Expiration |
|------------|------------|
| Access Token | 8 hours |
| Refresh Token | 7 days |

## OpenAPI Documentation

When Swagger UI is enabled (development only):
- Swagger UI: `https://alanapidev.lamlinks.com/docs`
- ReDoc: `https://alanapidev.lamlinks.com/redoc`
- OpenAPI JSON: `https://alanapidev.lamlinks.com/openapi.json`

## Quick Start

### 1. Login

```bash
curl -X POST "https://alanapidev.lamlinks.com/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "yourpassword"}'
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 28800,
  "must_change_password": false
}
```

### 2. Use Access Token

```bash
curl -X GET "https://alanapidev.lamlinks.com/api/v1/auth/me" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### 3. Refresh Token When Expired

```bash
curl -X POST "https://alanapidev.lamlinks.com/api/v1/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "eyJhbGciOiJIUzI1NiIs..."}'
```

## Error Codes

| HTTP Status | Meaning |
|-------------|---------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid or expired token |
| 403 | Forbidden - Account locked or inactive |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Server Error |

## Security Notes

1. **HTTPS Required**: All production requests must use HTTPS
2. **Token Storage**: Store tokens securely (httpOnly cookies recommended)
3. **Refresh Token Rotation**: Implement token rotation for enhanced security
4. **Password Requirements**: Minimum 8 characters
5. **Account Lockout**: 5 failed attempts = 1 hour lockout
