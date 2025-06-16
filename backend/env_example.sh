# Database Configuration
DATABASE_URL=postgresql+asyncpg://queue_user:queue_password@localhost:5432/queue_management

# Security Configuration
SECRET_KEY=your-super-secret-key-here-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Firebase Push Notification Configuration
FIREBASE_SERVER_KEY=your-firebase-server-key

# Redis Configuration (optional)
REDIS_URL=redis://localhost:6379/0

# Application Settings
APP_NAME=Queue Management System
APP_VERSION=1.0.0
DEBUG=true
LOG_LEVEL=INFO

# CORS Settings
ALLOWED_ORIGINS=["http://localhost:3000", "http://localhost:8080"]

# Queue Settings
DEFAULT_QUEUE_SIZE=100
MAX_QUEUE_SIZE=500
QUEUE_REFRESH_INTERVAL=30

# Notification Settings
SMS_ENABLED=true
PUSH_ENABLED=true
EMAIL_ENABLED=false

# SMTP Email Configuration (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@yourapp.com

# File Upload Settings
MAX_FILE_SIZE=5242880  # 5MB
ALLOWED_FILE_TYPES=["jpg", "jpeg", "png", "pdf"]

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60

# Development/Testing
TEST_DATABASE_URL=postgresql+asyncpg://queue_user:queue_password@localhost:5432/queue_management_test