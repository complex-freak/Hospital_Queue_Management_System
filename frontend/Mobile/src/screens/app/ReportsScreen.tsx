import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Report } from '../../../../shared/types';

type ReportsScreenNavigationProp = StackNavigationProp<any, 'Reports'>;

const ReportsScreen: React.FC = () => {
    const navigation = useNavigation<ReportsScreenNavigationProp>();
    const [reports, setReports] = useState<Report[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Set up the header with settings button
    React.useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <TouchableOpacity
                    style={styles.headerButton}
                    onPress={() => navigation.navigate('ReportSettings')}
                >
                    <Ionicons name="settings-outline" size={24} color="#172B4D" />
                </TouchableOpacity>
            ),
        });
    }, [navigation]);

    const fetchReports = async (showRefreshing = false) => {
        if (showRefreshing) setRefreshing(true);
        else setIsLoading(true);

        setError(null);

        try {
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Mock data for development
            const mockReports: Report[] = [
                {
                    id: '1',
                    title: 'Your Monthly Risk Assessment',
                    description: 'Summary of your cardiovascular risk factors',
                    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                    createdBy: 'doctor-123',
                    templateId: 'template-1',
                    patientId: 'patient-123',
                    type: 'risk-assessment',
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
                },
                {
                    id: '2',
                    title: 'Quarterly Progress Report',
                    description: 'Your health progress over the last 3 months',
                    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                    createdBy: 'doctor-456',
                    templateId: 'template-2',
                    patientId: 'patient-123',
                    type: 'progress-tracker',
                    status: 'generated',
                    format: 'pdf',
                    lastGenerated: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
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
                }
            ];

            setReports(mockReports);
        } catch (err) {
            console.error('Error fetching reports:', err);
            setError('Failed to load reports. Please try again.');
        } finally {
            setIsLoading(false);
            if (showRefreshing) setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const onRefresh = () => {
        fetchReports(true);
    };

    // Format date function
    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString();
    };

    const renderReportItem = ({ item }: { item: Report }) => (
        <TouchableOpacity
            style={styles.reportItem}
            onPress={() => navigation.navigate('ReportDetail', { reportId: item.id })}
        >
            <View style={styles.reportHeader}>
                <Text style={styles.reportType}>{item.type.replace(/-/g, ' ').toUpperCase()}</Text>
                <Text style={styles.reportDate}>{formatDate(item.createdAt)}</Text>
            </View>
            <Text style={styles.reportTitle}>{item.title}</Text>
            {item.description && (
                <Text style={styles.reportDescription} numberOfLines={2}>
                    {item.description}
                </Text>
            )}
            <View style={styles.reportFooter}>
                <View style={[
                    styles.statusBadge,
                    item.status === 'generated' ? styles.statusGenerated :
                        item.status === 'scheduled' ? styles.statusScheduled :
                            styles.statusDraft
                ]}>
                    <Text style={styles.statusText}>{item.status}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2684FF" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>My Reports</Text>
                    <Text style={styles.subtitle}>
                        Access your health reports and assessments
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.settingsButton}
                    onPress={() => navigation.navigate('ReportSettings')}
                >
                    <Ionicons name="settings-outline" size={24} color="#2684FF" />
                </TouchableOpacity>
            </View>
            
            <FlatList
                data={reports}
                renderItem={renderReportItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No reports available</Text>
                        <Text style={styles.emptySubtext}>When your healthcare provider shares reports, they'll appear here</Text>
                    </View>
                }
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={["#2684FF"]}
                    />
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F4F5F7'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 70,
        paddingBottom: 20,
        backgroundColor: '#FFFFFF',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#091E42',
    },
    subtitle: {
        fontSize: 16,
        color: '#5E6C84',
        marginTop: 4,
    },
    settingsButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F4F5F7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F4F5F7'
    },
    listContent: {
        padding: 16,
        paddingBottom: 24
    },
    reportItem: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2
    },
    reportHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8
    },
    reportType: {
        fontSize: 12,
        color: '#5E6C84',
        fontWeight: '600'
    },
    reportDate: {
        fontSize: 12,
        color: '#5E6C84'
    },
    reportTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#172B4D',
        marginBottom: 4
    },
    reportDescription: {
        fontSize: 14,
        color: '#5E6C84',
        marginBottom: 12
    },
    reportFooter: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    statusBadge: {
        paddingVertical: 2,
        paddingHorizontal: 8,
        borderRadius: 12,
        alignSelf: 'flex-start'
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
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        marginTop: 48
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#172B4D',
        marginBottom: 8
    },
    emptySubtext: {
        fontSize: 14,
        color: '#5E6C84',
        textAlign: 'center'
    },
    headerButton: {
        padding: 8,
        marginRight: 16
    }
});

export default ReportsScreen; 