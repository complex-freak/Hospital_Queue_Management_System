# Step 9: DevOps & Infrastructure Detailed Implementation

**Overview**: Containerize applications, define CI/CD pipelines, and configure hosting and environment management.

---

## 1. Technologies & Tools

- Docker & Docker Compose
- GitHub Actions (or GitLab CI)
- Render / DigitalOcean / Railway for deployment
- NGINX as reverse proxy/load balancer
- Git for version control

---

## 2. Dockerization

1. **Backend Dockerfile**:
   ```dockerfile
   FROM python:3.11-slim
   WORKDIR /app
   COPY backend/requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt
   COPY backend/ .
   CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
   ```
2. **Web Dockerfile** (for each dashboard):
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY web/package.json web/package-lock.json ./
   RUN npm ci
   COPY web/ .
   RUN npm run build
   EXPOSE 3000
   CMD ["npx", "serve", "-s", "dist"]
   ```
3. **Mobile**: Build CI pipeline for Android/iOS artifacts, no Docker.

---

## 3. Docker Compose for Local Dev

- **File**: `docker-compose.yml`
  ```yaml
  version: '3.8'
  services:
    db:
      image: postgres:14
      environment:
        POSTGRES_USER: hq_user
        POSTGRES_PASSWORD: secure_pass
        POSTGRES_DB: hospital_queue
      ports:
        - '5432:5432'
    redis:
      image: redis:7
      ports:
        - '6379:6379'
    backend:
      build: ./backend
      depends_on:
        - db
        - redis
      ports:
        - '8000:8000'
    receptionist:
      build: ./receptionist-dashboard
      ports:
        - '3001:3000'
    doctor:
      build: ./doctor-dashboard
      ports:
        - '3002:3000'
    admin:
      build: ./admin-panel
      ports:
        - '3003:3000'
  ```

---

## 4. CI/CD Pipeline

### GitHub Actions

1. **Workflow**: `.github/workflows/ci.yml`
   ```yaml
   name: CI
   on: [push, pull_request]
   jobs:
     lint-test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v2
         - name: Setup Python
           uses: actions/setup-python@v2
           with: python-version: '3.11'
         - name: Install Backend Dependencies
           run: |
             cd backend
             pip install -r requirements.txt
         - name: Run Backend Tests
           run: |
             pytest
         - name: Setup Node
           uses: actions/setup-node@v2
           with: node-version: '18'
         - name: Install Web Dependencies & Test
           run: |
             cd receptionist-dashboard
             npm ci
             npm test -- --coverage
         # repeat for doctor and admin
   ```
2. **CD**:
   - On `main` merge, build and push Docker images to registry, then deploy to Render/DigitalOcean.

---

## 5. Hosting & Deployment

- **Render**:
  - Connect Git repo, auto-deploy backend Docker service.
  - Setup environment variables and secrets in service settings.
- **NGINX**:
  - Reverse proxy traffic:
    ```nginx
    server {
      listen 80;
      server_name api.example.com;
      location / {
        proxy_pass http://backend:8000;
      }
    }
    ```
- **CDN**:
  - Use Cloudflare or Netlify for static web assets.

---

## 6. Environment Management

- Store secrets (DB creds, JWT secrets, Twilio keys) in environment variables or Docker secrets.
- Use `.env` files for local dev (with `dotenv` in Python and Node).

---

## 7. Documentation & README

- Each repo (`backend/`, `receptionist-dashboard/`, etc.) must include a `README.md` with setup, build, test, and deploy instructions.

---

*End of Step 9 documentation.* 