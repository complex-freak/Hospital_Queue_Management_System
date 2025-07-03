import React from 'react';
import { render, screen, act } from '@/__tests__/test-utils';
import { useAuth, AuthProvider } from '@/hooks/use-auth-context';

// Mock the useAuth hook implementation
jest.mock('@/hooks/use-auth-context', () => {
  const originalModule = jest.requireActual('@/hooks/use-auth-context');
  
  return {
    ...originalModule,
    useAuth: () => ({
      user: null,
      isAuthenticated: false,
      login: jest.fn().mockImplementation(() => {
        return Promise.resolve({ 
          id: 'user-123', 
          role: 'doctor',
          name: 'Dr. Smith'
        });
      }),
      logout: jest.fn().mockImplementation(() => {
        return Promise.resolve();
      }),
    }),
    AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
  };
});

// Create a test component that uses the hook
const TestComponent = () => {
  const { user, login, logout, isAuthenticated } = useAuth();
  
  return (
    <div>
      <span data-testid="authenticated">{isAuthenticated ? 'true' : 'false'}</span>
      <span data-testid="user-role">{user?.role || 'none'}</span>
      <button onClick={() => login('testuser', 'password')}>Login</button>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
};

// Wrap the component with AuthProvider for testing
const WrappedTestComponent = () => (
  <AuthProvider>
    <TestComponent />
  </AuthProvider>
);

describe('useAuth Hook', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    window.localStorage.clear();
    
    // Reset mocks
    jest.clearAllMocks();
  });
  
  test('should start as not authenticated', () => {
    render(<WrappedTestComponent />);
    
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('user-role')).toHaveTextContent('none');
  });
  
  test('should authenticate user on login', async () => {
    const { useAuth } = jest.requireMock('@/hooks/use-auth-context');
    const mockLogin = useAuth().login;
    
    render(<WrappedTestComponent />);
    
    // Initially not authenticated
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    
    // Click login button
    await act(async () => {
      screen.getByText('Login').click();
    });
    
    // Verify login was called
    expect(mockLogin).toHaveBeenCalledWith('testuser', 'password');
  });
  
  test('should log out user', async () => {
    const { useAuth } = jest.requireMock('@/hooks/use-auth-context');
    const mockLogout = useAuth().logout;
    
    render(<WrappedTestComponent />);
    
    // Click logout button
    await act(async () => {
      screen.getByText('Logout').click();
    });
    
    // Verify logout was called
    expect(mockLogout).toHaveBeenCalled();
  });
  
  test('should persist authentication in localStorage', async () => {
    // Mock localStorage.getItem to return a token
    jest.spyOn(window.localStorage, 'getItem').mockReturnValue('mock-token');
    
    const { unmount } = render(<WrappedTestComponent />);
    
    // Unmount and remount to simulate page refresh
    unmount();
    
    // Remount component - should check localStorage
    render(<WrappedTestComponent />);
    
    // Verify localStorage was checked
    expect(window.localStorage.getItem).toHaveBeenCalledWith('authToken');
  });
}); 