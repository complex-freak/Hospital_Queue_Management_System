# Step 4: Web Client Layer (React.js Dashboards) Detailed Implementation

**Overview**: Build three separate web SPAs for receptionists, doctors, and admins using React.js, integrating with the backend API and supporting offline caching.

---

## 1. Technologies

- React.js 18+
- Vite or Create React App for project bootstrap
- Tailwind CSS (or Bootstrap) for styling
- React Router v6 for routing
- Redux Toolkit or Context API for state management
- React Query for data fetching and caching
- IndexedDB (via `idb` library) for offline support
- Axios for HTTP requests
- Jest + React Testing Library for unit tests

---

## 2. Project Initialization

1. **Bootstrap with Vite**:
   ```bash
   npm create vite@latest receptionist-dashboard --template react
   npm create vite@latest doctor-dashboard --template react
   npm create vite@latest admin-panel --template react
   ```
2. **Install Dependencies**:
   ```bash
   cd receptionist-dashboard
   npm install react-router-dom@6 @reduxjs/toolkit react-redux react-query axios idb
   npm install tailwindcss postcss autoprefixer
   npx tailwindcss init -p
   ```
3. **Tailwind Configuration** (`tailwind.config.js`):
   ```js
   module.exports = {
     content: ['./src/**/*.{js,jsx,ts,tsx}'],
     theme: { extend: {} },
     plugins: [],
   }
   ```

---

## 3. Directory Structure

```
src/
  ├── api/                 # axios instances and API calls
  ├── components/          # shared UI components (buttons, modals)
  ├── features/            # feature folders for receptionist, doctor, admin
  │   ├── receptionist/
  │   ├── doctor/
  │   └── admin/
  ├── hooks/               # custom React hooks
  ├── store/               # Redux store setup
  ├── routes/              # route definitions
  ├── utils/               # helper functions (date formatting, enums)
  └── index.js
``` 

---

## 4. Authentication Flow

- Store JWT in `localStorage` or secure `httpOnly` cookie.
- On app load, check token expiry and refresh if necessary.
- Protect routes with a `<ProtectedRoute>` component that checks role.

---

## 5. Core Components

1. **Receptionist Dashboard**:
   - `RegistrationForm`: auto-saves draft; calls `/patients` API.
   - `QueueMonitorView`: displays live queue; uses React Query polling.
   - `ManualQueueAssignment`: drag-and-drop reordering.
2. **Doctor Dashboard**:
   - `QueueListView`: filtered list by doctor ID.
   - `PatientDetailsViewer`: fetches `/appointments/{id}`.
   - `ConsultationFeedbackForm`: PATCH to `/queue/{id}/status`.
3. **Admin Panel**:
   - `AnalyticsDashboard`: charts via `recharts` or `chart.js`.
   - `UserManagement`: CRUD staff users.
   - `QueueConfigurator`: adjust priority weights; calls `/admin/queue-rules`.

---

## 6. Offline Caching (Receptionist)

- Use IndexedDB (`idb`) to cache recent queue and registration entries.
- On network loss, show offline banner and save actions locally.
- Sync queued actions on reconnect via background sync.

---

## 7. Real-time Updates

- Polling with React Query (e.g., every 30s) for queue state.
- Optional: integrate WebSocket for push updates via `socket.io-client`.

---

## 8. Testing & CI

- **Unit Tests**: Jest + RTL for components and hooks.
- **E2E Smoke**: Cypress for critical flows (login, registration, queue view).
- **CI**: GitHub Actions to run lint (`eslint`), tests, and build on PR.

---

*End of Step 4 documentation.* 