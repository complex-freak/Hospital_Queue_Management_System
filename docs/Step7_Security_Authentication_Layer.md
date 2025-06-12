# Step 7: Security & Authentication Layer Detailed Implementation

**Overview**: Secure API endpoints, implement authentication and authorization, enforce HTTPS, and protect against common attacks.

---

## 1. Technologies & Libraries

- OAuth2 Password Flow (FastAPI built-in)
- PyJWT for token creation and verification
- `passlib[bcrypt]` for password hashing
- SlowAPI for rate limiting
- FastAPI CORS middleware
- HTTPS via TLS certificates (e.g., Let's Encrypt)
- `python-jose` or `Authlib` for advanced JWT handling

---

## 2. Environment & Prerequisites

1. **Certificates**: Obtain TLS certs from Let's Encrypt or internal CA.
2. **Environment Variables**:
   - `JWT_SECRET_KEY`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`
   - `RATE_LIMIT_PER_MINUTE`
3. **Install Dependencies**:
   ```bash
   pip install python-jose passlib[bcrypt] slowapi
   ```

---

## 3. Password Hashing

- **File**: `app/core/security.py`
  ```python
  from passlib.context import CryptContext
  pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

  def hash_password(password: str) -> str:
      return pwd_context.hash(password)

  def verify_password(plain: str, hashed: str) -> bool:
      return pwd_context.verify(plain, hashed)
  ```

---

## 4. JWT Token Management

- **Token Creation**:
  ```python
  from datetime import datetime, timedelta
  from jose import jwt

  def create_access_token(data: dict):
      to_encode = data.copy()
      expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
      to_encode.update({'exp': expire})
      return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
  ```
- **Token Verification**: use `jose.jwt.decode`

---

## 5. Auth Endpoints

- **File**: `api/v1/routers/auth.py`
  ```python
  @router.post('/login')
  async def login(form_data: OAuth2PasswordRequestForm = Depends()):
      user = authenticate_user(form_data.username, form_data.password)
      access_token = create_access_token({'sub': user.username, 'role': user.role})
      return {'access_token': access_token, 'token_type': 'bearer'}
  ```
- **Refresh Tokens**: implement `/refresh` endpoint generating new access token

---

## 6. Role-Based Access Control

- **Dependencies**:
  ```python
  def get_current_user(token: str = Depends(oauth2_scheme)):
      payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
      # fetch user and verify active

  def get_current_active_admin(user: User = Depends(get_current_user)):
      if user.role != 'admin': raise HTTPException(403)
      return user
  ```
- Apply to routers: `@router.get('/users', dependencies=[Depends(get_current_active_admin)])`

---

## 7. HTTPS & CORS

- **CORS**:
  ```python
  from fastapi.middleware.cors import CORSMiddleware
  app.add_middleware(
      CORSMiddleware,
      allow_origins=settings.ALLOWED_ORIGINS,
      allow_credentials=True,
      allow_methods=['*'],
      allow_headers=['*'],
  )
  ```
- **HTTPS**:
  - Terminate TLS at NGINX or proxy in front of Uvicorn.
  - Redirect HTTP to HTTPS.

---

## 8. Rate Limiting

- Configure SlowAPI:
  ```python
  from slowapi import Limiter
  limiter = Limiter(key_func=get_remote_address)
  app.state.limiter = limiter
  @limiter.limit('5/minute')
  @router.post('/login')
  async def login(...)
  ```

---

## 9. Input Validation & Sanitization

- Use Pydantic schemas to enforce types, length, regex.
- Avoid raw SQL; use ORM to prevent injection.

---

## 10. Testing Security Flows

- Write tests for password hashing, token creation/validation, and protected route access.
- Test rate limits by simulating rapid requests.

---

*End of Step 7 documentation.* 