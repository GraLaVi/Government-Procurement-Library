# Customer API Authentication

Detailed documentation for customer authentication endpoints.

## Overview

The Customer API uses JWT (JSON Web Tokens) for authentication. The system provides:

- **Access Tokens**: Short-lived tokens (8 hours) for API access
- **Refresh Tokens**: Long-lived tokens (7 days) for obtaining new access tokens
- **Rate Limiting**: Protection against brute-force attacks
- **Account Lockout**: Automatic lockout after failed attempts

## Token Flow

```
1. User logs in with email/password
   └─> Receives access_token + refresh_token

2. User makes API requests with access_token
   └─> Authorization: Bearer <access_token>

3. Access token expires (after 8 hours)
   └─> Use refresh_token to get new access_token

4. Refresh token expires (after 7 days)
   └─> User must log in again
```

## Endpoints

### POST /api/v1/auth/login

Authenticate a customer user and receive tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Success Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 28800,
  "must_change_password": false
}
```

**Error Responses:**

| Status | Detail | Cause |
|--------|--------|-------|
| 401 | Incorrect email or password | Invalid credentials |
| 403 | Account is locked... | Too many failed attempts |
| 403 | User account is inactive | Account deactivated |
| 429 | Too many login attempts | Rate limit exceeded |

**Rate Limiting:**
- 5 attempts per minute per IP address
- Returns `Retry-After` header with seconds to wait

---

### POST /api/v1/auth/refresh

Get a new access token using a valid refresh token.

**Request:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 28800
}
```

**Error Responses:**

| Status | Detail | Cause |
|--------|--------|-------|
| 401 | Invalid or expired refresh token | Token invalid/expired |
| 403 | User account is inactive | Account deactivated |

---

### POST /api/v1/auth/logout

Logout the current user. Requires authentication.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Success Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

**Note:** Client should also delete stored tokens locally.

---

### GET /api/v1/auth/me

Get the current authenticated user's profile.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Success Response (200):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "customer_id": 5,
  "role": "user",
  "must_change_password": false,
  "email_verified": true
}
```

**User Roles:**
- `admin` - Can manage other users in the organization
- `user` - Standard access
- `read_only` - View-only access

---

### POST /api/v1/auth/change-password

Change password for the authenticated user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request:**
```json
{
  "current_password": "oldpassword123",
  "new_password": "newsecurepassword456"
}
```

**Success Response (200):**
```json
{
  "message": "Password changed successfully"
}
```

**Error Responses:**

| Status | Detail | Cause |
|--------|--------|-------|
| 400 | Current password is incorrect | Wrong current password |
| 400 | New password must be at least 8 characters | Password too short |

**Notes:**
- After changing password, `must_change_password` is set to `false`
- Consider invalidating all refresh tokens after password change

---

### POST /api/v1/auth/forgot-password

Request a password reset link (placeholder - email not yet implemented).

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "message": "If the email exists, a password reset link has been sent"
}
```

**Security:** Always returns success to prevent email enumeration.

---

### POST /api/v1/auth/reset-password

Reset password using a token received via email.

**Status:** Not yet implemented (501)

**Request:**
```json
{
  "token": "reset-token-from-email",
  "new_password": "newsecurepassword456"
}
```

---

## JWT Token Structure

### Access Token Payload

```json
{
  "sub": 123,
  "email": "user@example.com",
  "customer_id": 5,
  "role": "user",
  "exp": 1701234567,
  "type": "customer_access",
  "iat": 1701205767
}
```

### Refresh Token Payload

```json
{
  "sub": 123,
  "jti": "unique-token-id",
  "exp": 1701810567,
  "type": "customer_refresh",
  "iat": 1701205767
}
```

## Security Features

### Rate Limiting

```
Limit: 5 login attempts per minute per IP address
Tracking: In-memory (upgradeable to Redis for distributed deployments)
Reset: Rate limit resets after successful login
```

### Account Lockout

```
Threshold: 5 failed login attempts
Lockout Duration: 1 hour
Reset: Automatic after lockout period or manual by admin
```

### Password Requirements

- Minimum 8 characters
- Stored using bcrypt hashing

## Client Implementation Guide

### JavaScript/TypeScript Example

```typescript
class AuthService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  async login(email: string, password: string) {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;

    // Schedule token refresh before expiry
    this.scheduleRefresh(data.expires_in);

    return data;
  }

  async refreshAccessToken() {
    const response = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: this.refreshToken })
    });

    if (!response.ok) {
      // Refresh failed, user must login again
      this.logout();
      throw new Error('Session expired');
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.scheduleRefresh(data.expires_in);

    return data;
  }

  async apiRequest(url: string, options: RequestInit = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${this.accessToken}`
      }
    });

    if (response.status === 401) {
      // Try to refresh token
      await this.refreshAccessToken();
      // Retry request with new token
      return this.apiRequest(url, options);
    }

    return response;
  }

  private scheduleRefresh(expiresIn: number) {
    // Refresh 5 minutes before expiry
    const refreshTime = (expiresIn - 300) * 1000;
    setTimeout(() => this.refreshAccessToken(), refreshTime);
  }

  logout() {
    this.accessToken = null;
    this.refreshToken = null;
  }
}
```

### Python Example

```python
import requests
from datetime import datetime, timedelta

class CustomerAPIClient:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.access_token = None
        self.refresh_token = None
        self.token_expires_at = None

    def login(self, email: str, password: str):
        response = requests.post(
            f"{self.base_url}/api/v1/auth/login",
            json={"email": email, "password": password}
        )
        response.raise_for_status()

        data = response.json()
        self.access_token = data["access_token"]
        self.refresh_token = data["refresh_token"]
        self.token_expires_at = datetime.now() + timedelta(seconds=data["expires_in"])

        return data

    def refresh(self):
        response = requests.post(
            f"{self.base_url}/api/v1/auth/refresh",
            json={"refresh_token": self.refresh_token}
        )
        response.raise_for_status()

        data = response.json()
        self.access_token = data["access_token"]
        self.token_expires_at = datetime.now() + timedelta(seconds=data["expires_in"])

        return data

    def get_headers(self):
        # Auto-refresh if token expires in less than 5 minutes
        if self.token_expires_at and datetime.now() > self.token_expires_at - timedelta(minutes=5):
            self.refresh()

        return {"Authorization": f"Bearer {self.access_token}"}

    def get_profile(self):
        response = requests.get(
            f"{self.base_url}/api/v1/auth/me",
            headers=self.get_headers()
        )
        response.raise_for_status()
        return response.json()
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CUSTOMER_JWT_SECRET` | Secret key for JWT signing | (required in production) |
| `CUSTOMER_ACCESS_TOKEN_EXPIRE_HOURS` | Access token lifetime | 8 |
| `CUSTOMER_REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token lifetime | 7 |

## Database Schema

The `customer_refresh_tokens` table stores refresh token hashes for revocation support:

```sql
CREATE TABLE customer_refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES customer_users(id),
    token_hash VARCHAR(64) NOT NULL UNIQUE,  -- SHA-256 hash
    jti VARCHAR(64) NOT NULL UNIQUE,          -- JWT ID
    issued_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_reason VARCHAR(50),
    user_agent TEXT,
    ip_address INET
);
```
