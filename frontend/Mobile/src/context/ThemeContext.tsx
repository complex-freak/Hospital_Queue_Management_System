import React, { createContext, useContext } from 'react';
import { COLORS } from '../constants/theme';

type ThemeContextType = {
    colors: typeof COLORS;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const colors = COLORS;

    return (
        <ThemeContext.Provider value={{ colors }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}; 