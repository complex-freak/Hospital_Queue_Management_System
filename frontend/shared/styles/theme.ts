// Shared theme constants for mobile and web applications

// Color palette
export const colors = {
    // Primary colors
    primary: {
        light: '#4C9AFF',
        main: '#2684FF',
        dark: '#0052CC',
        contrastText: '#FFFFFF',
    },
    // Secondary colors
    secondary: {
        light: '#6B778C',
        main: '#505F79',
        dark: '#344563',
        contrastText: '#FFFFFF',
    },
    // Semantic colors
    success: {
        light: '#57D9A3',
        main: '#36B37E',
        dark: '#00875A',
        contrastText: '#FFFFFF',
    },
    warning: {
        light: '#FFE380',
        main: '#FFAB00',
        dark: '#FF8B00',
        contrastText: '#FFFFFF',
    },
    error: {
        light: '#FF9C8F',
        main: '#FF5630',
        dark: '#DE350B',
        contrastText: '#FFFFFF',
    },
    // Neutrals
    grey: {
        50: '#F7F8F9',
        100: '#F1F2F4',
        200: '#EBECF0',
        300: '#DFE1E6',
        400: '#C1C7D0',
        500: '#A5ADBA',
        600: '#7A869A',
        700: '#5E6C84',
        800: '#42526E',
        900: '#091E42',
    },
    // Base colors
    common: {
        black: '#000000',
        white: '#FFFFFF',
        transparent: 'transparent',
    },
    // Background and text colors
    background: {
        default: '#F4F5F7',
        paper: '#FFFFFF',
        subtle: '#FAFBFC',
    },
    text: {
        primary: '#091E42',
        secondary: '#42526E',
        disabled: '#A5ADBA',
        hint: '#7A869A',
        inverse: '#FFFFFF',
    },
};

// Typography
export const typography = {
    fontFamily: {
        primary: "'SF Pro Display', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
        secondary: "'SF Pro Text', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
        monospace: "'SF Mono', SFMono-Regular, Consolas, 'Liberation Mono', Menlo, Courier, monospace",
    },
    fontWeight: {
        light: 300,
        regular: 400,
        medium: 500,
        semiBold: 600,
        bold: 700,
    },
    fontSize: {
        xs: '0.75rem', // 12px
        sm: '0.875rem', // 14px
        md: '1rem',     // 16px
        lg: '1.125rem', // 18px
        xl: '1.25rem',  // 20px
        '2xl': '1.5rem', // 24px
        '3xl': '1.875rem', // 30px
        '4xl': '2.25rem',  // 36px
        '5xl': '3rem',     // 48px
        '6xl': '3.75rem',  // 60px
        '7xl': '4.5rem',   // 72px
    },
    lineHeight: {
        none: 1,
        tight: 1.25,
        snug: 1.375,
        normal: 1.5,
        relaxed: 1.625,
        loose: 2,
    },
    letterSpacing: {
        tighter: '-0.05em',
        tight: '-0.025em',
        normal: '0',
        wide: '0.025em',
        wider: '0.05em',
        widest: '0.1em',
    },
};

// Spacing system
export const spacing = {
    px: '1px',
    0: '0',
    0.5: '0.125rem', // 2px
    1: '0.25rem',    // 4px 
    1.5: '0.375rem', // 6px
    2: '0.5rem',     // 8px
    2.5: '0.625rem', // 10px
    3: '0.75rem',    // 12px
    3.5: '0.875rem', // 14px
    4: '1rem',       // 16px
    5: '1.25rem',    // 20px
    6: '1.5rem',     // 24px
    7: '1.75rem',    // 28px
    8: '2rem',       // 32px
    9: '2.25rem',    // 36px
    10: '2.5rem',    // 40px
    11: '2.75rem',   // 44px
    12: '3rem',      // 48px
    14: '3.5rem',    // 56px
    16: '4rem',      // 64px
    20: '5rem',      // 80px
    24: '6rem',      // 96px
    28: '7rem',      // 112px
    32: '8rem',      // 128px
    36: '9rem',      // 144px
    40: '10rem',     // 160px
    44: '11rem',     // 176px
    48: '12rem',     // 192px
    52: '13rem',     // 208px
    56: '14rem',     // 224px
    60: '15rem',     // 240px
    64: '16rem',     // 256px
    72: '18rem',     // 288px
    80: '20rem',     // 320px
    96: '24rem',     // 384px
};

// Border radius
export const borderRadius = {
    none: '0',
    xs: '0.125rem',  // 2px
    sm: '0.25rem',   // 4px
    md: '0.375rem',  // 6px
    lg: '0.5rem',    // 8px
    xl: '0.75rem',   // 12px
    '2xl': '1rem',   // 16px
    '3xl': '1.5rem', // 24px
    full: '9999px',
};

// Shadows
export const shadows = {
    none: 'none',
    xs: '0 1px 2px 0 rgba(9, 30, 66, 0.1)',
    sm: '0 1px 3px 0 rgba(9, 30, 66, 0.13)',
    md: '0 3px 5px 0 rgba(9, 30, 66, 0.15)',
    lg: '0 5px 15px 0 rgba(9, 30, 66, 0.15)',
    xl: '0 10px 30px 0 rgba(9, 30, 66, 0.18)',
    '2xl': '0 14px 40px 0 rgba(9, 30, 66, 0.2)',
};

// Transitions
export const transitions = {
    duration: {
        shortest: 150,
        shorter: 200,
        short: 250,
        standard: 300,
        complex: 375,
        enteringScreen: 225,
        leavingScreen: 195,
    },
    easing: {
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
        easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    },
};

// Z-index
export const zIndex = {
    mobileStepper: 1000,
    speedDial: 1050,
    appBar: 1100,
    drawer: 1200,
    modal: 1300,
    snackbar: 1400,
    tooltip: 1500,
};

// Export all theme values as a single object
export const theme = {
    colors,
    typography,
    spacing,
    borderRadius,
    shadows,
    transitions,
    zIndex,
};

export default theme; 