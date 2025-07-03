import { AppSettings } from '../../types';
import httpClient, { ApiResponse } from './index';
import { API_PATHS } from '../../config/env';

// Types for API requests and responses
export interface SettingsResponse {
  id: string;
  patient_id: string;
  language: string;
  notifications_enabled: boolean;
  created_at: string;
  updated_at?: string;
}

export interface UpdateSettingsRequest {
  language?: string;
  notifications_enabled?: boolean;
}

class SettingsService {
  /**
   * Get user settings
   */
  public async getSettings(): Promise<ApiResponse<SettingsResponse>> {
    return httpClient.get<SettingsResponse>(API_PATHS.SETTINGS.BASE);
  }

  /**
   * Update user settings
   */
  public async updateSettings(data: UpdateSettingsRequest): Promise<ApiResponse<SettingsResponse>> {
    return httpClient.put<SettingsResponse>(API_PATHS.SETTINGS.BASE, data);
  }

  /**
   * Transform API settings data to frontend AppSettings type
   */
  public transformSettingsData(apiData: SettingsResponse, appVersion: string): AppSettings {
    return {
      language: apiData.language || 'en',
      notificationsEnabled: apiData.notifications_enabled,
      version: appVersion
    };
  }
}

export const settingsService = new SettingsService();
export default settingsService;