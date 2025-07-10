import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Report } from '../../../../shared/types';

// Storage keys
const REPORTS_METADATA_KEY = '@reports_metadata';
const REPORTS_DIRECTORY = `${FileSystem.documentDirectory}reports/`;

// Ensure the reports directory exists
export async function ensureReportsDirectoryExists() {
    const dirInfo = await FileSystem.getInfoAsync(REPORTS_DIRECTORY);
    if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(REPORTS_DIRECTORY, { intermediates: true });
    }
}

// Save report metadata to AsyncStorage
export async function saveReportMetadata(reports: Report[]) {
    try {
        await AsyncStorage.setItem(REPORTS_METADATA_KEY, JSON.stringify(reports));
        return true;
    } catch (error) {
        console.error('Error saving report metadata:', error);
        return false;
    }
}

// Get report metadata from AsyncStorage
export async function getReportMetadata(): Promise<Report[]> {
    try {
        const metadata = await AsyncStorage.getItem(REPORTS_METADATA_KEY);
        return metadata ? JSON.parse(metadata) : [];
    } catch (error) {
        console.error('Error getting report metadata:', error);
        return [];
    }
}

// Save a report PDF file
export async function saveReportFile(reportId: string, fileUri: string): Promise<string | null> {
    try {
        await ensureReportsDirectoryExists();

        const destinationUri = `${REPORTS_DIRECTORY}${reportId}.pdf`;

        // If the file is already a local file, copy it
        if (fileUri.startsWith('file://')) {
            await FileSystem.copyAsync({
                from: fileUri,
                to: destinationUri
            });
        } else {
            // If it's a remote file, download it
            const downloadResult = await FileSystem.downloadAsync(fileUri, destinationUri);
            if (downloadResult.status !== 200) {
                throw new Error(`Failed to download file: ${downloadResult.status}`);
            }
        }

        return destinationUri;
    } catch (error) {
        console.error('Error saving report file:', error);
        return null;
    }
}

// Check if a report file exists
export async function checkReportFileExists(reportId: string): Promise<boolean> {
    try {
        const fileUri = `${REPORTS_DIRECTORY}${reportId}.pdf`;
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        return fileInfo.exists;
    } catch (error) {
        console.error('Error checking report file:', error);
        return false;
    }
}

// Get the local URI for a report file
export function getReportFileUri(reportId: string): string {
    return `${REPORTS_DIRECTORY}${reportId}.pdf`;
}

// Delete a report file
export async function deleteReportFile(reportId: string): Promise<boolean> {
    try {
        const fileUri = `${REPORTS_DIRECTORY}${reportId}.pdf`;
        const fileInfo = await FileSystem.getInfoAsync(fileUri);

        if (fileInfo.exists) {
            await FileSystem.deleteAsync(fileUri);
        }

        return true;
    } catch (error) {
        console.error('Error deleting report file:', error);
        return false;
    }
}

// Get the total size of stored reports
export async function getStoredReportsSize(): Promise<number> {
    try {
        await ensureReportsDirectoryExists();

        const reportFiles = await FileSystem.readDirectoryAsync(REPORTS_DIRECTORY);
        let totalSize = 0;

        for (const file of reportFiles) {
            if (file.endsWith('.pdf')) {
                const fileInfo = await FileSystem.getInfoAsync(`${REPORTS_DIRECTORY}${file}`);
                if (fileInfo.exists && fileInfo.size) {
                    totalSize += fileInfo.size;
                }
            }
        }

        return totalSize;
    } catch (error) {
        console.error('Error calculating reports size:', error);
        return 0;
    }
}

// Format bytes to human-readable format
export function formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Clear all stored reports
export async function clearAllStoredReports(): Promise<boolean> {
    try {
        await ensureReportsDirectoryExists();

        const reportFiles = await FileSystem.readDirectoryAsync(REPORTS_DIRECTORY);

        for (const file of reportFiles) {
            if (file.endsWith('.pdf')) {
                await FileSystem.deleteAsync(`${REPORTS_DIRECTORY}${file}`);
            }
        }

        // Clear metadata too
        await AsyncStorage.removeItem(REPORTS_METADATA_KEY);

        return true;
    } catch (error) {
        console.error('Error clearing stored reports:', error);
        return false;
    }
}

// Sync reports with server (for when app comes back online)
export async function syncReportsWithServer(): Promise<boolean> {
    try {
        // Get local report metadata
        const localReports = await getReportMetadata();

        // In a real implementation, you would:
        // 1. Fetch the latest reports from the server
        // 2. Compare with local reports to find new/updated reports
        // 3. Download any missing reports
        // 4. Update the local metadata

        // This is a placeholder for the actual implementation
        console.log('Syncing reports with server...');

        return true;
    } catch (error) {
        console.error('Error syncing reports with server:', error);
        return false;
    }
}

export default {
    ensureReportsDirectoryExists,
    saveReportMetadata,
    getReportMetadata,
    saveReportFile,
    checkReportFileExists,
    getReportFileUri,
    deleteReportFile,
    getStoredReportsSize,
    formatBytes,
    clearAllStoredReports,
    syncReportsWithServer,
}; 