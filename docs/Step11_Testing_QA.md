# Step 11: Testing & QA Detailed Implementation

**Overview**: Define testing strategies across unit, integration, and end-to-end levels for all components.

---

## 1. Technologies & Tools

- Python: `pytest`, `pytest-asyncio`, `pytest-mock`
- JavaScript: `Jest`, `React Testing Library`, `Cypress`
- React Native: `Detox`
- API Testing: Postman / Newman
- Mock data: `factory_boy`, `Faker`
- Coverage: `coverage.py`, `jest --coverage`

---

## 2. Unit Testing

### Backend

- **Setup**:
  ```bash
  pip install pytest pytest-asyncio pytest-mock factory_boy faker
  ```
- **Structure**:
  - `tests/unit/models/`
  - `tests/unit/services/`
  - Use fixtures for test database session.
- **Examples**:
  ```python
  def test_priority_calculator():
      from app.services.queue_engine import PriorityCalculator
      score = PriorityCalculator.calculate(severity='high', category='elderly')
      assert score > 0
  ```

### Frontend (React)

- **Setup**:
  ```bash
  npm install --save-dev jest @testing-library/react @testing-library/jest-dom
  ```
- **Config**: Add `jest.config.js` with Babel preset and CSS mocks.
- **Examples**:
  ```js
  test('renders registration form', () => {
    render(<RegistrationForm />);
    expect(screen.getByLabelText(/Jina/i)).toBeInTheDocument();
  });
  ```

---

## 3. Integration Testing

### API Endpoints

- Use `TestClient` from FastAPI to call real endpoints with test DB.
- Tests in `tests/integration/`:
  ```python
  def test_register_and_login(client):
      response = client.post('/patients/', json={...})
      assert response.status_code == 201
  ```

### Database Migrations

- Ensure migrations apply cleanly in CI and rollback if needed.

---

## 4. End-to-End (E2E) Testing

### Web Dashboards (Cypress)

1. **Setup**:
   ```bash
   npm install cypress --save-dev
   ```
2. **Write Specs**:
   - `cypress/integration/registration.spec.js`
   - Use `cy.visit()`, `cy.get()`, `cy.click()`.
3. **Run**:
   ```bash
   npx cypress open
   ```

### Mobile App (Detox)

1. **Install**:
   ```bash
   npm install detox --save-dev
   detox init -r jest
   ```
2. **Configure** (`.detoxrc.json` for Android & iOS).
3. **Write Tests** in `e2e/` folder:
   ```js
   describe('Registration flow', () => {
     it('should register new patient', async () => {
       await device.launchApp();
       await element(by.id('registration-name')).typeText('John');
       // ...
     });
   });
   ```
4. **Run**:
   ```bash
   detox test
   ```

---

## 5. API Contract Testing (Postman)

- Create Postman collection for all REST endpoints.
- Export and run via Newman in CI:
  ```bash
  newman run hospital_queue.postman_collection.json --env-var baseUrl=https://api.example.com
  ```

---

## 6. Coverage & Reporting

- **Backend**: `coverage run -m pytest && coverage html`
- **Frontend**: `jest --coverage`
- Publish coverage reports in CI artifacts.

---

## 7. QA Process

- Code reviews with PR templates including testing checklist.
- Manual exploratory testing for edge cases.
- Bug triage and tracking via Jira or GitHub Issues.

---

*End of Step 11 documentation.* 