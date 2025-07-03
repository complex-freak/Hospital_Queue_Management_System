import React from 'react';
import { render } from '@testing-library/react-native';
import App from '../App';

// Mock all the context providers and navigation
jest.mock('../src/context/AuthContext', () => ({
    AuthProvider: ({ children }) => <>{children}</>,
}));

jest.mock('../src/context/QueueContext', () => ({
    QueueProvider: ({ children }) => <>{children}</>,
}));

jest.mock('../src/context/ThemeContext', () => ({
    ThemeProvider: ({ children }) => <>{children}</>,
}));

jest.mock('../src/navigation', () => 'Navigation');

// Mock the i18n initialization
jest.mock('../src/localization/i18n', () => ({}));

describe('App Component', () => {
    it('renders without crashing', () => {
        const { toJSON } = render(<App />);
        expect(toJSON()).toBeTruthy();
    });
}); 