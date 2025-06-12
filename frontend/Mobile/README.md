# Hospital App

A mobile application for hospital queue management and appointment scheduling built with React Native and Expo.

## Features

- User authentication system
- Queue management
- Appointment booking
- Multilingual support with i18next
- Theme customization

## Testing

The project includes a comprehensive testing suite using Jest and React Testing Library.

### Running Tests

```bash
# Run all tests
npm test

# Run only passing tests
npm run test:passing

# Run tests with coverage report
npm test:coverage

# Run tests in watch mode
npm test:watch
```

### Test Structure

- `__tests__/App.test.tsx`: Tests for the main App component
- `__tests__/contexts/ThemeContext.test.tsx`: Tests for the theme context provider
- `__tests__/contexts/AuthContext.test.tsx`: Tests for the authentication context provider
- `__tests__/contexts/QueueContext.test.tsx`: Tests for the queue management context provider

## Development

```bash
# Start the development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on web
npm run web
```

## Dependencies

- React Native
- Expo
- React Navigation
- AsyncStorage
- i18next for internationalization
- date-fns for date manipulation
- Axios for API requests 