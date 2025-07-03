import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const COLORS = {
    // Primary colors
    primary: '#1E88E5',     // Main blue
    secondary: '#26A69A',   // Teal accent
    background: '#F5F7FA',  // Light background
    white: '#FFFFFF',
    black: '#2D3748',       // Dark text
    gray: '#718096',        // Medium gray
    lightGray: '#E2E8F0',   // Light gray

    // Status colors
    error: '#E53E3E',       // Error red
    success: '#38A169',     // Success green
    warning: '#ECC94B',     // Warning yellow
    info: '#4299E1',        // Info blue

    // Navigation colors
    tabBarBackground: '#FFFFFF',
    tabBarActive: '#1E88E5',
    tabBarInactive: '#A0AEC0',

    // Auth screen colors
    authBackground: '#F5F7FA',
    authCardBackground: '#FFFFFF',
    authText: '#2D3748',
    authSubtext: '#718096',

    // Card and border colors
    cardBackground: '#FFFFFF',
    border: '#E2E8F0',
    divider: '#EDF2F7',

    // Dashboard specific colors
    dashboardHeader: '#1E88E5',
    dashboardCard: '#FFFFFF',
    dashboardText: '#2D3748',
    dashboardSubtext: '#718096',
};

export const SIZES = {
    // Global sizes
    base: 8,
    font: 14,
    radius: 12,
    padding: 16,
    margin: 16,
    topSpacing: 24,

    // Font sizes
    largeTitle: 40,
    h1: 30,
    h2: 24,
    h3: 18,
    h4: 16,
    h5: 14,
    body1: 30,
    body2: 22,
    body3: 16,
    body4: 14,
    body5: 12,

    // App dimensions
    width,
    height,
};

export const FONTS = {
    largeTitle: {
        fontFamily: 'System',
        fontSize: SIZES.largeTitle,
        lineHeight: 55,
        fontWeight: '700' as const
    },
    h1: {
        fontFamily: 'System',
        fontSize: SIZES.h1,
        lineHeight: 36,
        fontWeight: '700' as const
    },
    h2: {
        fontFamily: 'System',
        fontSize: SIZES.h2,
        lineHeight: 30,
        fontWeight: '700' as const
    },
    h3: {
        fontFamily: 'System',
        fontSize: SIZES.h3,
        lineHeight: 22,
        fontWeight: '600' as const
    },
    h4: {
        fontFamily: 'System',
        fontSize: SIZES.h4,
        lineHeight: 20,
        fontWeight: '600' as const
    },
    h5: {
        fontFamily: 'System',
        fontSize: SIZES.h5,
        lineHeight: 18,
        fontWeight: '600' as const
    },
    body1: {
        fontFamily: 'System',
        fontSize: SIZES.body1,
        lineHeight: 36
    },
    body2: {
        fontFamily: 'System',
        fontSize: SIZES.body2,
        lineHeight: 30
    },
    body3: {
        fontFamily: 'System',
        fontSize: SIZES.body3,
        lineHeight: 25
    },
    body4: {
        fontFamily: 'System',
        fontSize: SIZES.body4,
        lineHeight: 22
    },
    body5: {
        fontFamily: 'System',
        fontSize: SIZES.body5,
        lineHeight: 20
    },
};

const appTheme = { COLORS, SIZES, FONTS };

export default appTheme; 