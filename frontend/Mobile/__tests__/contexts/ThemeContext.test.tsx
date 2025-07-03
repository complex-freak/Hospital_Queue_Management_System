import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { ThemeProvider, useTheme } from '../../src/context/ThemeContext';
import { COLORS } from '../../src/constants/theme';

describe('ThemeContext', () => {
    it('provides theme colors', () => {
        const wrapper = ({ children }) => (
            <ThemeProvider>{children}</ThemeProvider>
        );

        const { result } = renderHook(() => useTheme(), { wrapper });

        expect(result.current.colors).toBeDefined();
        expect(result.current.colors).toEqual(COLORS);
    });

    it('throws error when used outside of context', () => {
        // Testing error case without the provider
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => { });

        expect(() => {
            renderHook(() => useTheme());
        }).toThrow('useTheme must be used within a ThemeProvider');

        consoleError.mockRestore();
    });
});
