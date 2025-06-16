.PHONY: help install dev test clean build deploy migrate seed

# Default target
help:
	@echo "Available commands:"
	@echo "  install     - Install dependencies"
	@echo "  dev         - Start development server"
	@echo "  test        - Run tests"
	@echo "  test-cov    - Run tests with coverage"
	@echo "  clean       - Clean up temporary files"
	@echo "  build       - Build Docker image"
	@echo "  deploy      - Deploy with Docker Compose"
	@echo "  migrate     - Run database migrations"
	@echo "  migrate-gen - Generate new migration"
	@echo "  seed        - Seed database with sample data"
	@echo "  lint        - Run code linting"
	@echo "  format      - Format code"
	@echo "  setup-dev   - Setup development environment"
	@echo "  db-reset    - Reset database and reseed"
	@echo "  docs        - Show API documentation info"
	@echo "  security    - Run security checks"
	@echo "  deps-check  - Check dependencies for vulnerabilities"
	@echo "  stop        - Stop Docker services"

# Install dependencies
install:
	pip install -r requirements.txt
	pip install -r requirements-dev.txt

# Start development server
dev:
	uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Run tests
test:
	pytest tests/ -v

# Run tests with coverage
test-cov:
	pytest tests/ -v --cov=. --cov-report=html --cov-report=term --cov-exclude="*/tests/*" --cov-exclude="*/alembic/*"

# Clean up temporary files
clean:
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type d -name "*.egg-info" -delete
	rm -rf htmlcov/
	rm -rf .pytest_cache/
	rm -rf .coverage
	rm -rf dist/
	rm -rf build/

# Build Docker image
build:
	docker build -t queue-management-backend .

# Deploy with Docker Compose
deploy:
	docker-compose up -d

# Stop Docker services
stop:
	docker-compose down

# Run database migrations
migrate:
	alembic upgrade head

# Generate new migration
migrate-gen:
	@if [ -z "$(MSG)" ]; then \
		echo "Usage: make migrate-gen MSG='your migration message'"; \
		exit 1; \
	fi
	alembic revision --autogenerate -m "$(MSG)"

# Seed database with sample data
seed:
	python scripts/seed_data.py

# Run code linting
lint:
	flake8 . --exclude=alembic/versions/
	black --check .
	isort --check-only .

# Format code
format:
	black .
	isort .

# Setup development environment
setup-dev: install
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "Created .env file from .env.example"; \
		echo "Please update .env file with your configuration"; \
	else \
		echo ".env file already exists"; \
	fi
	@echo "Development environment setup complete!"

# Database reset and reseed
db-reset:
	docker-compose down -v
	docker-compose up -d db
	@echo "Waiting for database to be ready..."
	sleep 10
	alembic upgrade head
	python scripts/seed_data.py

# Generate API documentation info
docs:
	@echo "API documentation available at:"
	@echo "  Swagger UI: http://localhost:8000/docs"
	@echo "  ReDoc:      http://localhost:8000/redoc"
	@echo "  OpenAPI:    http://localhost:8000/openapi.json"

# Run security checks
security:
	bandit -r . -x tests/,alembic/versions/

# Check dependencies for vulnerabilities
deps-check:
	pip-audit

# Run full quality checks
quality: lint security deps-check test

# Development workflow
dev-setup: setup-dev db-reset
	@echo "Development environment ready!"
	@echo "Run 'make dev' to start the development server"

# Production deployment preparation
prod-check: quality build
	@echo "Production readiness check complete!"

# Database backup (requires pg_dump)
db-backup:
	@echo "Creating database backup..."
	docker-compose exec db pg_dump -U postgres queue_management > backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "Backup created: backup_$(shell date +%Y%m%d_%H%M%S).sql"

# Database restore (requires backup file)
db-restore:
	@if [ -z "$(FILE)" ]; then \
		echo "Usage: make db-restore FILE=backup_file.sql"; \
		exit 1; \
	fi
	docker-compose exec -T db psql -U postgres queue_management < $(FILE)

# View logs
logs:
	docker-compose logs -f

# View database logs
db-logs:
	docker-compose logs -f db

# Connect to database shell
db-shell:
	docker-compose exec db psql -U postgres queue_management

# Show running services
status:
	docker-compose ps

# Update dependencies
update-deps:
	pip list --outdated --format=freeze | grep -v '^\-e' | cut -d = -f 1 | xargs -n1 pip install -U
	pip freeze > requirements.txt

# Create new service template
new-service:
	@if [ -z "$(NAME)" ]; then \
		echo "Usage: make new-service NAME=service_name"; \
		exit 1; \
	fi
	@echo "Creating new service: $(NAME)"
	@mkdir -p services
	@echo "# $(NAME) Service\n\nclass $(shell echo $(NAME) | sed 's/_/ /g' | sed 's/\b\w/\u&/g' | sed 's/ //g')Service:\n    pass" > services/$(NAME)_service.py

# Run specific test file
test-file:
	@if [ -z "$(FILE)" ]; then \
		echo "Usage: make test-file FILE=test_filename.py"; \
		exit 1; \
	fi
	pytest tests/$(FILE) -v

# Monitor system resources
monitor:
	docker stats $(shell docker-compose ps -q)

# Health check
health:
	@echo "Checking application health..."
	@curl -f http://localhost:8000/health || echo "Application not responding"

# Load testing preparation
load-test-setup:
	pip install locust
	@echo "Locust installed. Create locustfile.py for load testing."

# Quick development restart
restart: stop deploy
	@echo "Services restarted!"

# Show environment info
env-info:
	@echo "Python version: $(shell python --version)"
	@echo "Docker version: $(shell docker --version)"
	@echo "Docker Compose version: $(shell docker-compose --version)"
	@echo "Current directory: $(shell pwd)"
	@echo "Git branch: $(shell git branch --show-current 2>/dev/null || echo 'Not a git repository')"