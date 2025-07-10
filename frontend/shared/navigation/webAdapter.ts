/**
 * Web Navigation Adapter
 * Adapter for React Router DOM navigation to use the CrossPlatformNavigation interface
 */

import { NavigateFunction } from 'react-router-dom';
import { CrossPlatformNavigation, ROUTE_MAPPINGS } from './index';

/**
 * Create a navigation adapter for React Router DOM
 * @param navigate React Router DOM navigate function
 * @param goBack Function to go back (optional)
 * @returns CrossPlatformNavigation object
 */
export function createWebNavigationAdapter(
  navigate: NavigateFunction, 
  goBack?: () => void
): CrossPlatformNavigation {
  return {
    navigate: (routeName: string, params?: Record<string, any>) => {
      // If routeName looks like a mobile screen name (no slashes), convert it
      let path = routeName;
      if (!routeName.startsWith('/')) {
        path = ROUTE_MAPPINGS.MOBILE_TO_WEB[routeName] || '/dashboard'; // Default to dashboard
      }
      
      // Add query parameters if provided
      if (params && Object.keys(params).length > 0) {
        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            queryParams.append(key, String(value));
          }
        });
        path = `${path}?${queryParams.toString()}`;
      }
      
      navigate(path);
    },
    goBack: () => {
      if (goBack) {
        goBack();
      } else {
        navigate(-1); // Navigate back in history
      }
    }
  };
} 