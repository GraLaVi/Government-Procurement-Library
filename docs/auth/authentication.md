# Customer API Authentication

Detailed documentation for customer authentication endpoints.

## Overview

The Customer API uses JWT (JSON Web Tokens) for authentication. The system provides:

- **Access Tokens**: Short-lived tokens (1 hour) for API access
- **Refresh Tokens**: Long-lived tokens (30 days) for obtaining new access tokens
- **Refresh Token Rotation**: Each refresh mints a new refresh token and revokes the one used, so an active session slides forward and never expires on a fixed schedule
- **Rate Limiting**: Protection against brute-force attacks
- **Account Lockout**: Automatic lockout after failed attempts

## Token Flow

```
1. User logs in with email/password
   └─> Receives access_token + refresh_token

2. User makes API requests with access_token
   └─> Authorization: Bearer <access_token>

3. Access token expires (after 1 hour)
   └─> Use refresh_token to get a new access_token
       AND a new refresh_token (the old one is revoked)

4. Refresh token expires (30 days after the LAST refresh)
   └─> User must log in again
```

Because step 3 issues a fresh refresh token, the 30 days is an **inactivity
ceiling**, not a session cap: anyone using the product at least once a month
stays signed in indefinitely, while an abandoned session still dies on
schedule.

A customer user may hold at most `CUSTOMER_MAX_CONCURRENT_SESSIONS` signed-in
devices at once (default 2). Logging in on one too many signs out the
least-recently-used device rather than refusing the login; that device gets a
401 on its next request or refresh, which `SessionExpiredContext` already
handles as an ordinary expiry. Nothing in this app needs to detect the
difference.

In this app the tokens live in httpOnly cookies, and every server-side call to
`/auth/refresh` goes through `refreshSession()` in `src/lib/auth/refresh.ts`,
which writes both the access **and** the rotated refresh cookie. Any new call
site must use that helper: dropping the rotated token leaves the browser
holding one that dies with the server's grace window.

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
  "expires_in": 3600,
  "refresh_expires_in": 2592000,
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

Exchange a valid refresh token for a new access token **and a new refresh
token**.

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
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_expires_in": 2592000
}
```

**Clients must replace their stored refresh token with the one returned here.**
The token that was presented is revoked (`revoked_reason = 'rotated'`), but is
still accepted for `CUSTOMER_REFRESH_ROTATION_GRACE_SECONDS` (default 60s) so
requests already in flight with the pre-rotation token are not signed out.

**Error Responses:**

| Status | Detail | Cause |
|--------|--------|-------|
| 401 | Invalid or expired refresh token | Token invalid/expired |
| 401 | Refresh token has been revoked | Logged out, revoked, or rotated more than the grace window ago |
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
| `CUSTOMER_ACCESS_TOKEN_EXPIRE_HOURS` | Access token lifetime. Short by design — a stateless token cannot be withdrawn early, so this bounds how long a signed-out device keeps working | 1 |
| `CUSTOMER_REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token lifetime (inactivity ceiling — rotation restarts it) | 30 |
| `CUSTOMER_REFRESH_ROTATION_GRACE_SECONDS` | How long a just-rotated refresh token is still accepted; 0 disables | 60 |

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
