// Mock the expo-status-bar module
jest.mock('expo-status-bar', () => ({
  StatusBar: 'StatusBar',
}));

// Mock the react-native-safe-area-context module
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: 'SafeAreaProvider',
  useSafeAreaInsets: jest.fn().mockReturnValue({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  }),
}));

// Mock the expo-notifications module
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock DateTimePicker
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

// Mock i18next
jest.mock('i18next', () => ({
  use: () => ({
    init: jest.fn(),
    t: jest.fn((key) => key),
    changeLanguage: jest.fn(),
  }),
}));

// Fix "useNativeDriver is not supported" warning
jest.mock('react-native', () => {
  const rn = jest.requireActual('react-native');
  rn.NativeModules.StatusBarManager = { getHeight: jest.fn() };
  return rn;
}); 