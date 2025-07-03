# Step 6: Notifications Layer Detailed Implementation

**Overview**: Set up and configure SMS and push notification services, integrate with Celery for asynchronous delivery, and log events.

---

## 1. Technologies & Services

- Twilio Programmable SMS API
- Firebase Cloud Messaging (FCM) for push
- Celery for async task queue
- Redis as broker and result backend
- `twilio` Python SDK
- `firebase-admin` Python SDK

---

## 2. Provisioning Services

1. **Twilio Account**:
   - Sign up and create a project.
   - Purchase or provision a phone number.
   - Store `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER` as environment variables.
2. **Firebase Project**:
   - Create Firebase project.
   - Enable Cloud Messaging API.
   - Download `serviceAccountKey.json` and secure it in the server.

---

## 3. Celery Configuration

- **Broker**: `redis://localhost:6379/0`
- **Result Backend**: `redis://localhost:6379/1`
- **File**: `app/workers/celery_app.py`
  ```python
  from celery import Celery
  from core.config import settings

  celery_app = Celery(
      'notifications',
      broker=settings.CELERY_BROKER_URL,
      backend=settings.CELERY_RESULT_BACKEND
  )
  celery_app.conf.update(task_serializer='json', result_serializer='json', accept_content=['json'])
  ```

---

## 4. SMS Service Wrapper

- **File**: `app/services/twilio_service.py`
  ```python
  from twilio.rest import Client
  from core.config import settings

  client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

  def send_sms(to: str, body: str) -> str:
      message = client.messages.create(
          body=body,
          from_=settings.TWILIO_PHONE_NUMBER,
          to=to
      )
      return message.sid
  ```
- **Celery Task**:
  ```python
  @celery_app.task(name='send_sms')
  def task_send_sms(notification_id: str, to: str, body: str):
      sid = send_sms(to, body)
      # update Notifications table with status and sid
  ```

---

## 5. Push Service Wrapper

- **File**: `app/services/fcm_service.py`
  ```python
  import firebase_admin
  from firebase_admin import messaging, credentials

  cred = credentials.Certificate('serviceAccountKey.json')
  firebase_admin.initialize_app(cred)

  def send_push(token: str, title: str, body: str) -> str:
      message = messaging.Message(
          notification=messaging.Notification(title=title, body=body),
          token=token
      )
      response = messaging.send(message)
      return response
  ```
- **Celery Task**:
  ```python
  @celery_app.task(name='send_push')
  def task_send_push(notification_id: str, token: str, title: str, body: str):
      res = send_push(token, title, body)
      # update Notifications table
  ```

---

## 6. Task Scheduling & Retries

- Configure retries in Celery tasks:
  ```python
  @celery_app.task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=5)
  def task_send_sms(self, notification_id, to, body):
      # ...
  ```
- Use Celery beat for scheduled reminders (e.g., delay warnings).

---

## 7. Logging & Monitoring

- Log each send attempt and outcome to `Notifications` table.
- Expose Celery metrics via Flower or Prometheus exporter.

---

## 8. Testing

- Write unit tests for service wrappers using `pytest-mock`.
- Use a sandbox Twilio account for integration testing.
- Mock FCM SDK for push tests.

---

*End of Step 6 documentation.* 