import React, { ReactElement } from 'react';
import { render as rtlRender, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/hooks/use-auth-context';
import { LanguageProvider } from '@/contexts/language-context';

// Mock react-router-dom hooks
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => jest.fn(),
    useLocation: () => ({
      pathname: '/',
      search: '',
      hash: '',
      state: null,
    }),
  };
});

// Custom wrapper to provide all necessary contexts
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
};

// Custom render with contexts
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => rtlRender(ui, { wrapper: AllTheProviders, ...options });

// Mock for IndexedDB
const mockIDBFactory = {
  open: jest.fn(),
};

Object.defineProperty(window, 'indexedDB', {
  value: mockIDBFactory,
});

// Mock for localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => {
      return store[key] || null;
    },
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock for browser notifications
const mockNotification = {
  requestPermission: jest.fn().mockResolvedValue('granted'),
};

Object.defineProperty(window, 'Notification', {
  value: mockNotification,
});

// Mock online status
const mockOnlineStatus = (isOnline: boolean) => {
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value: isOnline,
  });
  
  if (isOnline) {
    window.dispatchEvent(new Event('online'));
  } else {
    window.dispatchEvent(new Event('offline'));
  }
};

// Simple test to ensure this file is valid
describe('test-utils', () => {
  it('should provide utility functions', () => {
    expect(customRender).toBeDefined();
    expect(mockOnlineStatus).toBeDefined();
  });
});

// Export everything from RTL
export * from '@testing-library/react';
export { customRender as render, mockOnlineStatus }; 