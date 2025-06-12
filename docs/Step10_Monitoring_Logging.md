# Step 10: Monitoring & Logging Detailed Implementation

**Overview**: Integrate observability tools to track performance, errors, and system health for backend and frontend.

---

## 1. Technologies & Tools

- Sentry for error tracking
- Prometheus & Grafana for metrics
- `prometheus-client` Python library
- Celery Flower for task monitoring
- Logging via `structlog` or Python `logging` module

---

## 2. Backend Instrumentation

1. **Sentry Integration**:
   ```bash
   pip install sentry-sdk
   ```
   ```python
   import sentry_sdk
   sentry_sdk.init(dsn=settings.SENTRY_DSN, traces_sample_rate=0.2)
   ```
2. **Prometheus Metrics**:
   - Install: `pip install prometheus-client`
   - In `app/main.py`, expose metrics:
     ```python
     from prometheus_client import start_http_server, Counter
     request_counter = Counter('api_requests_total', 'Total API Requests', ['method', 'endpoint'])
     @app.middleware('http')
     async def metrics_middleware(request: Request, call_next):
         response = await call_next(request)
         request_counter.labels(request.method, request.url.path).inc()
         return response
     start_http_server(8001)  # Prometheus scrape endpoint
     ```
3. **Celery Monitoring (Flower)**:
   ```bash
   pip install flower
   celery -A app.workers.celery_app flower --port=5555
   ```

---

## 3. Frontend Monitoring

### Web Dashboards

- **Sentry SDK**:
  ```bash
  npm install @sentry/react @sentry/tracing
  ```
  ```js
  import * as Sentry from '@sentry/react';
  Sentry.init({ dsn: process.env.SENTRY_DSN });
  ```
- **Performance Metrics**: optional integration with Web Vitals and send to Sentry.

### Mobile App

- **React Native Sentry**:
  ```bash
  npm install @sentry/react-native
  ```
  ```js
  import * as Sentry from '@sentry/react-native';
  Sentry.init({ dsn: 'your-dsn', enableNative: true });
  ```
- **Crashlytics** (alternative): integrate via `@react-native-firebase/crashlytics`.

---

## 4. Alerting & Dashboards

- **Grafana**:
  - Connect to Prometheus.
  - Create dashboards: API latency, error rate, queue length over time.
- **Sentry Alerts**:
  - Configure email or Slack alerts on error thresholds.

---

## 5. Log Aggregation

- Structure logs as JSON and send to a central syslog or ELK stack.
- Example Python config:
  ```python
  import logging
  import sys
  handler = logging.StreamHandler(sys.stdout)
  formatter = logging.Formatter('{"timestamp": "%(asctime)s", "level": "%(levelname)s", "message": "%(message)s"}')
  handler.setFormatter(formatter)
  logger = logging.getLogger()
  logger.addHandler(handler)
  logger.setLevel(logging.INFO)
  ```

---

## 6. Testing & Validation

- Simulate errors in dev to verify Sentry captures them.
- Use Prometheus query inspector to verify metrics collection.

---

*End of Step 10 documentation.* 