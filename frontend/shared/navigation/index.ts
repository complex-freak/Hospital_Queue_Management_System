/**
 * Cross-platform navigation helpers
 * This file helps bridge the gap between React Navigation (mobile) and React Router (web)
 * by providing consistent navigation functions that work across both platforms.
 */

// Route mappings between platforms
export const ROUTE_MAPPINGS = {
  // Map from mobile screen names to web routes
  MOBILE_TO_WEB: {
    'Appointments': '/appointments',
    'ClinicianRecommendations': '/recommendations',
    'Health': '/health-data',
    'RiskVisualization': '/risk-visualization',
    'Messages': '/messages',
    'Reports': '/reports',
    'Dashboard': '/dashboard',
    'Settings': '/settings',
    'Patients': '/patients',
    'Assessments': '/assessments',
  },
  
  // Map from web routes to mobile screen names
  WEB_TO_MOBILE: {
    '/appointments': 'Appointments',
    '/recommendations': 'ClinicianRecommendations',
    '/health-data': 'Health',
    '/risk-visualization': 'RiskVisualization',
    '/messages': 'Messages',
    '/reports': 'Reports',
    '/dashboard': 'Home',
    '/settings': 'Settings',
    '/patients': 'Patients',
    '/assessments': 'Assessments',
  }
};

/**
 * Detects the platform we're running on - web or mobile
 * @returns {boolean} true if we're on the web platform
 */
export const isWebPlatform = (): boolean => {
  // Check for window and document to determine if we're in a browser environment
  return typeof window !== 'undefined' && typeof document !== 'undefined' 
    && !('expo' in (globalThis as any));
};

/**
 * Interface that wraps both React Router and React Navigation navigation objects
 * to provide a consistent API for navigation
 */
export interface CrossPlatformNavigation {
  /**
   * Navigate to a route
   * @param routeName Route name or path
   * @param params Optional parameters to pass
   */
  navigate: (routeName: string, params?: Record<string, any>) => void;
  
  /**
   * Go back to previous screen
   */
  goBack: () => void;
}; 