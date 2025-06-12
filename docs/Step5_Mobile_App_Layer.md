# Step 5: Mobile App Layer (React Native) Detailed Implementation

**Overview**: Develop a Swahili-first mobile app for patients using React Native, supporting offline mode and real-time queue tracking.

---

## 1. Technologies

- React Native (0.70+)
- TypeScript (recommended) or JavaScript
- React Navigation v6
- AsyncStorage or SQLite (via `react-native-sqlite-storage`)
- Firebase Cloud Messaging (FCM)
- `react-native-encrypted-storage` for secure token storage
- `react-native-background-fetch` for offline sync
- NativeBase or TailwindCSS for React Native (via `nativewind`)
- Detox for E2E testing

---

## 2. Environment & Project Setup

1. **Bootstrap App**:
   ```bash
   npx react-native init PatientApp --template react-native-template-typescript
   cd PatientApp
   ```
2. **Install Dependencies**:
   ```bash
   npm install @react-navigation/native @react-navigation/native-stack react-native-screens react-native-safe-area-context
   npm install @react-native-async-storage/async-storage react-native-sqlite-storage
   npm install react-native-encrypted-storage
   npm install @react-native-firebase/app @react-native-firebase/messaging
   npm install react-native-background-fetch
   npm install nativewind tailwindcss postcss autoprefixer
   npx tailwindcss init
   ```
3. **iOS/Android Linking** (if not auto-linked):
   ```bash
   cd ios && pod install && cd ..
   ```

---

## 3. Directory Structure

```
src/
  ├── screens/
  │   ├── RegistrationScreen.tsx
  │   ├── QueueStatusScreen.tsx
  │   ├── NotificationCenter.tsx
  │   ├── HelpOverlay.tsx
  │   └── SettingsScreen.tsx
  ├── navigation/
  │   └── AppNavigator.tsx
  ├── services/
  │   ├── api.ts      # Axios instance
  │   ├── fcm.ts      # FCM setup
  │   └── storage.ts  # AsyncStorage & SQLite helpers
  ├── hooks/
  │   └── useQueueSync.ts
  └── App.tsx
``` 

---

## 4. Screens & Functionality

1. **RegistrationScreen**:
   - Form labels in Swahili.
   - Validate inputs and submit to `/patients` API.
   - Save draft locally if offline.
2. **QueueStatusScreen**:
   - Display queue number, wait time, position.
   - Poll API every 60s or use FCM notifications.
3. **NotificationCenter**:
   - List past alerts stored locally and from API.
4. **HelpOverlay**:
   - Step-by-step tutorials with icons and Swahili text.
5. **SettingsScreen**:
   - Language toggle, app version, logout.

---

## 5. Offline Caching & Sync

- **AsyncStorage/SQLite**:
  - Cache registration forms and queue snapshots.
- **Background Fetch**:
  - Use `react-native-background-fetch` to sync cached actions when online.
- **Sync Logic**:
  - Endpoint: `POST /sync/push`, `GET /sync/pull`.
  - On reconnect, replay pending form submissions and update local queue.

---

## 6. Push Notifications Setup

1. **Firebase Setup**: Create project in Firebase console, add Android & iOS apps, download config files.
2. **Integrate FCM**:
   - In `fcm.ts`, request permission and get FCM token.
   - Listen for messages in `App.tsx` and update local storage.

---

## 7. Security

- Store JWT in `react-native-encrypted-storage`.
- Disable screenshot capture on sensitive screens:
  ```js
  import { useFocusEffect } from '@react-navigation/native';
  useFocusEffect(() => {
    StatusBar.setHidden(true);
    // platform-specific code to disable screenshots
  });
  ```

---

## 8. Testing

- **Unit Tests**: Jest + React Native Testing Library for components.
- **E2E Tests**: Detox to simulate flows: registration, queue view, notification.

---

*End of Step 5 documentation.* 