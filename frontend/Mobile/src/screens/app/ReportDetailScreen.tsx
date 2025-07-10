import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Alert,
    Share,
    Platform,
    ScrollView
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Report } from '../../../../shared/types';
import { Ionicons } from '@expo/vector-icons';

type ReportDetailRouteProp = RouteProp<{
    ReportDetail: { reportId: string };
}, 'ReportDetail'>;

type ReportDetailNavigationProp = StackNavigationProp<any, 'ReportDetail'>;

const ReportDetailScreen: React.FC = () => {
    const route = useRoute<ReportDetailRouteProp>();
    const navigation = useNavigation<ReportDetailNavigationProp>();
    const { reportId } = route.params;
    const [report, setReport] = useState<Report | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [reportSaved, setReportSaved] = useState(false);

    // Check if the report is saved locally
    const checkIfReportIsSaved = async (reportId: string) => {
        try {
            const fileUri = `${FileSystem.documentDirectory}reports/${reportId}.pdf`;
            const fileInfo = await FileSystem.getInfoAsync(fileUri);
            setReportSaved(fileInfo.exists);
        } catch (err) {
            console.error('Error checking if report is saved:', err);
            setReportSaved(false);
        }
    };

    useEffect(() => {
        const fetchReport = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Simulate API call delay
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Mock data for development
                const mockReport: Report = {
                    id: reportId,
                    title: reportId === '1' ? 'Your Monthly Risk Assessment' : 'Quarterly Progress Report',
                    description: reportId === '1'
                        ? 'Summary of your cardiovascular risk factors'
                        : 'Your health progress over the last 3 months',
                    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                    createdBy: 'doctor-123',
                    templateId: 'template-1',
                    patientId: 'patient-123',
                    type: reportId === '1' ? 'risk-assessment' : 'progress-tracker',
                    status: 'generated',
                    format: 'pdf',
                    lastGenerated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                    data: {
                        patientInfo: {
                            id: 'patient-123',
                            email: 'john.doe@example.com',
                            firstName: 'John',
                            lastName: 'Doe',
                            role: 'patient',
                            createdAt: '2023-01-01T00:00:00.000Z',
                            updatedAt: '2023-01-01T00:00:00.000Z',
                            active: true
                        },
                        assessments: []
                    },
                    sharingEnabled: true,
                    sharedWith: []
                };

                setReport(mockReport);

                // Check if report is saved locally
                await checkIfReportIsSaved(reportId);

            } catch (err) {
                console.error('Error fetching report:', err);
                setError('Failed to load report. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchReport();
    }, [reportId]);

    // Format date function
    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString();
    };

    // Download/save the report for offline access
    const downloadReport = async () => {
        setIsDownloading(true);
        setDownloadProgress(0);

        try {
            // Ensure reports directory exists
            const reportsDir = `${FileSystem.documentDirectory}reports/`;
            const dirInfo = await FileSystem.getInfoAsync(reportsDir);

            if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(reportsDir, { intermediates: true });
            }

            // Use a sample PDF for demo purposes - in production, this would be the actual report URL
            const remoteUri = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
            const fileUri = `${reportsDir}${reportId}.pdf`;

            // Download the file with progress tracking
            const downloadResumable = FileSystem.createDownloadResumable(
                remoteUri,
                fileUri,
                {},
                (downloadProgress) => {
                    const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
                    setDownloadProgress(progress);
                }
            );

            const result = await downloadResumable.downloadAsync();
            const uri = result?.uri;

            if (uri) {
                setReportSaved(true);
                Alert.alert(
                    'Download Complete',
                    'Report saved for offline viewing',
                    [{ text: 'OK' }]
                );
            }
        } catch (err) {
            console.error('Error downloading report:', err);
            Alert.alert(
                'Download Failed',
                'There was a problem downloading the report. Please try again.',
                [{ text: 'OK' }]
            );
        } finally {
            setIsDownloading(false);
        }
    };

    // View the report PDF
    const viewReport = async () => {
        if (reportSaved) {
            // Navigate to PDF viewer with local file path
            const fileUri = `${FileSystem.documentDirectory}reports/${reportId}.pdf`;
            navigation.navigate('PDFViewer', { uri: fileUri, title: report?.title });
        } else {
            // For demo purposes, navigate to PDF viewer with remote URL
            const remoteUri = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
            navigation.navigate('PDFViewer', { uri: remoteUri, title: report?.title });
        }
    };

    // Share the report
    const shareReport = async () => {
        try {
            let shareUri: string;

            if (reportSaved) {
                // Use the locally saved file
                shareUri = `${FileSystem.documentDirectory}reports/${reportId}.pdf`;
            } else {
                // Download to temporary location first
                setIsDownloading(true);
                const remoteUri = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
                const fileUri = `${FileSystem.cacheDirectory}temp_report_${reportId}.pdf`;

                await FileSystem.downloadAsync(remoteUri, fileUri);
                shareUri = fileUri;
                setIsDownloading(false);
            }

            // Check if sharing is available
            const isAvailable = await Sharing.isAvailableAsync();

            if (isAvailable) {
                await Sharing.shareAsync(shareUri, {
                    mimeType: 'application/pdf',
                    dialogTitle: `Share ${report?.title}`,
                    UTI: 'com.adobe.pdf' // For iOS
                });
            } else {
                // Web platform or sharing is not available
                if (Platform.OS === 'web') {
                    Alert.alert(
                        'Sharing Unavailable',
                        'Sharing is not supported on web platform.'
                    );
                } else {
                    Alert.alert(
                        'Sharing Unavailable',
                        'Sharing is not available on this device.'
                    );
                }
            }
        } catch (err) {
            console.error('Error sharing report:', err);
            Alert.alert(
                'Sharing Failed',
                'There was a problem sharing the report. Please try again.'
            );
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2684FF" />
            </View>
        );
    }

    if (error || !report) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={48} color="#DE350B" />
                <Text style={styles.errorText}>{error || 'Report not found'}</Text>
                <TouchableOpacity
                    style={styles.button}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.buttonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <View style={styles.header}>
                <Text style={styles.reportType}>
                    {report.type.replace(/-/g, ' ').toUpperCase()}
                </Text>
                <Text style={styles.title}>{report.title}</Text>
                {report.description && (
                    <Text style={styles.description}>{report.description}</Text>
                )}
            </View>

            <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Created by:</Text>
                    <Text style={styles.infoValue}>Dr. Smith</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Date:</Text>
                    <Text style={styles.infoValue}>{formatDate(report.createdAt)}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Format:</Text>
                    <Text style={styles.infoValue}>{report.format.toUpperCase()}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Status:</Text>
                    <View style={[
                        styles.statusBadge,
                        report.status === 'generated' ? styles.statusGenerated :
                            report.status === 'scheduled' ? styles.statusScheduled :
                                styles.statusDraft
                    ]}>
                        <Text style={styles.statusText}>{report.status}</Text>
                    </View>
                </View>
            </View>

            {/* Action buttons */}
            <View style={styles.actionsCard}>
                <Text style={styles.sectionTitle}>Actions</Text>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={viewReport}
                >
                    <Ionicons name="document-text-outline" size={24} color="#2684FF" />
                    <Text style={styles.actionButtonText}>View Report</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={shareReport}
                    disabled={isDownloading}
                >
                    <Ionicons name="share-outline" size={24} color="#2684FF" />
                    <Text style={styles.actionButtonText}>Share Report</Text>
                </TouchableOpacity>

                {!reportSaved ? (
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={downloadReport}
                        disabled={isDownloading}
                    >
                        {isDownloading ? (
                            <>
                                <ActivityIndicator size="small" color="#2684FF" />
                                <Text style={styles.actionButtonText}>
                                    Downloading ({Math.round(downloadProgress * 100)}%)
                                </Text>
                            </>
                        ) : (
                            <>
                                <Ionicons name="cloud-download-outline" size={24} color="#2684FF" />
                                <Text style={styles.actionButtonText}>Save for Offline</Text>
                            </>
                        )}
                    </TouchableOpacity>
                ) : (
                    <View style={[styles.actionButton, styles.actionButtonSaved]}>
                        <Ionicons name="checkmark-circle" size={24} color="#00875A" />
                        <Text style={[styles.actionButtonText, styles.actionButtonTextSaved]}>
                            Saved for Offline
                        </Text>
                    </View>
                )}
            </View>

            <View style={styles.previewCard}>
                <Text style={styles.sectionTitle}>Preview</Text>
                <TouchableOpacity
                    style={styles.previewButton}
                    onPress={viewReport}
                >
                    <Ionicons name="document-outline" size={48} color="#2684FF" />
                    <Text style={styles.previewText}>Tap to view full report</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F4F5F7'
    },
    contentContainer: {
        padding: 16
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F4F5F7'
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F4F5F7',
        padding: 20
    },
    errorText: {
        fontSize: 16,
        color: '#172B4D',
        textAlign: 'center',
        marginTop: 12,
        marginBottom: 24
    },
    header: {
        marginBottom: 16
    },
    reportType: {
        fontSize: 12,
        color: '#5E6C84',
        fontWeight: '600',
        marginBottom: 4
    },
    title: {
        fontSize: 24,
        fontWeight: '600',
        color: '#172B4D',
        marginBottom: 8
    },
    description: {
        fontSize: 16,
        color: '#5E6C84'
    },
    infoCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F4F5F7'
    },
    infoLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#5E6C84'
    },
    infoValue: {
        fontSize: 14,
        color: '#172B4D'
    },
    statusBadge: {
        paddingVertical: 2,
        paddingHorizontal: 8,
        borderRadius: 12
    },
    statusGenerated: {
        backgroundColor: '#E3FCEF',
    },
    statusScheduled: {
        backgroundColor: '#DEEBFF',
    },
    statusDraft: {
        backgroundColor: '#F4F5F7',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#172B4D',
        textTransform: 'capitalize'
    },
    actionsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#172B4D',
        marginBottom: 12
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F4F5F7'
    },
    actionButtonSaved: {
        borderBottomWidth: 0
    },
    actionButtonText: {
        marginLeft: 12,
        fontSize: 16,
        color: '#172B4D'
    },
    actionButtonTextSaved: {
        color: '#00875A'
    },
    previewCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2
    },
    previewButton: {
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#DFE1E6',
        borderRadius: 8,
        borderStyle: 'dashed',
        backgroundColor: '#F4F5F7'
    },
    previewText: {
        marginTop: 8,
        fontSize: 14,
        color: '#2684FF'
    },
    button: {
        backgroundColor: '#2684FF',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 4,
        marginTop: 16
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600'
    }
});

export default ReportDetailScreen; 