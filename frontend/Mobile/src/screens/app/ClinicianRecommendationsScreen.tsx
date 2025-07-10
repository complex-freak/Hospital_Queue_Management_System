import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    FlatList,
    Image,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ClinicianRecommendationsScreenProp = StackNavigationProp<any, 'ClinicianRecommendations'>;

interface Clinician {
    id: string;
    name: string;
    specialty: string;
    photoUrl: string;
}

interface Recommendation {
    id: string;
    clinicianId: string;
    title: string;
    description: string;
    date: string;
    priority: 'high' | 'medium' | 'low';
    category: 'medication' | 'lifestyle' | 'follow_up' | 'test' | 'other';
    status: 'new' | 'in_progress' | 'completed' | 'dismissed';
    hasAttachment: boolean;
    attachmentType?: 'pdf' | 'image' | 'link';
    attachmentUrl?: string;
}

const ClinicianRecommendationsScreen: React.FC = () => {
    const navigation = useNavigation<ClinicianRecommendationsScreenProp>();
    const [isLoading, setIsLoading] = useState(true);
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [clinicians, setClinicians] = useState<Record<string, Clinician>>({});
    const [activeFilter, setActiveFilter] = useState<string>('all');

    useEffect(() => {
        loadRecommendationsData();
    }, []);

    const loadRecommendationsData = async () => {
        setIsLoading(true);
        try {
            // In a real app, this would be an API call
            const savedRecommendations = await AsyncStorage.getItem('clinicianRecommendations');
            const savedClinicians = await AsyncStorage.getItem('clinicians');

            if (savedRecommendations && savedClinicians) {
                setRecommendations(JSON.parse(savedRecommendations));
                setClinicians(JSON.parse(savedClinicians));
            } else {
                // Mock data
                const mockClinicians: Record<string, Clinician> = {
                    'c1': {
                        id: 'c1',
                        name: 'Dr. Sarah Johnson',
                        specialty: 'Cardiologist',
                        photoUrl: 'https://randomuser.me/api/portraits/women/32.jpg',
                    },
                    'c2': {
                        id: 'c2',
                        name: 'Dr. Michael Chen',
                        specialty: 'Endocrinologist',
                        photoUrl: 'https://randomuser.me/api/portraits/men/22.jpg',
                    },
                    'c3': {
                        id: 'c3',
                        name: 'Dr. Lisa Patel',
                        specialty: 'Primary Care',
                        photoUrl: 'https://randomuser.me/api/portraits/women/45.jpg',
                    },
                };

                const mockRecommendations: Recommendation[] = [
                    {
                        id: 'r1',
                        clinicianId: 'c1',
                        title: 'Adjust blood pressure medication dosage',
                        description: 'Based on your latest blood pressure readings, I recommend reducing your Lisinopril dosage from 20mg to 10mg daily. Monitor your blood pressure daily and report any readings below 110/70.',
                        date: '2023-12-02',
                        priority: 'high',
                        category: 'medication',
                        status: 'new',
                        hasAttachment: true,
                        attachmentType: 'pdf',
                        attachmentUrl: 'medication_adjustment.pdf'
                    },
                    {
                        id: 'r2',
                        clinicianId: 'c1',
                        title: 'Schedule follow-up echocardiogram',
                        description: 'Please schedule a follow-up echocardiogram in the next 2-3 weeks to assess how your heart function is responding to the new medication regimen.',
                        date: '2023-12-01',
                        priority: 'medium',
                        category: 'follow_up',
                        status: 'in_progress',
                        hasAttachment: false
                    },
                    {
                        id: 'r3',
                        clinicianId: 'c2',
                        title: 'Adjust diet plan for better glucose control',
                        description: 'Your recent glucose readings show elevated levels in the mornings. I recommend adjusting your evening meal to include more protein and fewer carbohydrates. See the attached meal plan for guidance.',
                        date: '2023-11-28',
                        priority: 'medium',
                        category: 'lifestyle',
                        status: 'in_progress',
                        hasAttachment: true,
                        attachmentType: 'pdf',
                        attachmentUrl: 'revised_meal_plan.pdf'
                    },
                    {
                        id: 'r4',
                        clinicianId: 'c3',
                        title: 'Begin low-impact exercise routine',
                        description: 'To help manage your blood pressure and improve cardiovascular health, I recommend beginning a low-impact exercise routine. Start with 15 minutes of walking daily, gradually increasing to 30 minutes 5 times per week.',
                        date: '2023-11-25',
                        priority: 'medium',
                        category: 'lifestyle',
                        status: 'in_progress',
                        hasAttachment: true,
                        attachmentType: 'link',
                        attachmentUrl: 'https://example.com/exercise-program'
                    },
                    {
                        id: 'r5',
                        clinicianId: 'c1',
                        title: 'Complete lipid panel blood test',
                        description: 'Please complete a fasting lipid panel blood test within the next 7 days at any LabCorp location. Fast for 12 hours before the test (water is okay).',
                        date: '2023-11-22',
                        priority: 'high',
                        category: 'test',
                        status: 'completed',
                        hasAttachment: false
                    },
                    {
                        id: 'r6',
                        clinicianId: 'c3',
                        title: 'Reduce sodium intake',
                        description: 'Your blood pressure remains elevated. Please limit sodium intake to less than 1,500mg per day. See the attached guide for low-sodium food alternatives.',
                        date: '2023-11-15',
                        priority: 'medium',
                        category: 'lifestyle',
                        status: 'completed',
                        hasAttachment: true,
                        attachmentType: 'pdf',
                        attachmentUrl: 'low_sodium_guide.pdf'
                    },
                ];

                setRecommendations(mockRecommendations);
                setClinicians(mockClinicians);

                await AsyncStorage.setItem('clinicianRecommendations', JSON.stringify(mockRecommendations));
                await AsyncStorage.setItem('clinicians', JSON.stringify(mockClinicians));
            }
        } catch (error) {
            console.error('Error loading recommendations:', error);
            Alert.alert('Error', 'Failed to load clinician recommendations');
        } finally {
            setIsLoading(false);
        }
    };

    const updateRecommendationStatus = async (id: string, newStatus: Recommendation['status']) => {
        try {
            const updatedRecommendations = recommendations.map(rec => {
                if (rec.id === id) {
                    return { ...rec, status: newStatus };
                }
                return rec;
            });

            setRecommendations(updatedRecommendations);
            await AsyncStorage.setItem('clinicianRecommendations', JSON.stringify(updatedRecommendations));

            if (newStatus === 'completed') {
                Alert.alert('Success', 'Recommendation marked as completed');
            } else if (newStatus === 'dismissed') {
                Alert.alert('Dismissed', 'Recommendation has been dismissed');
            }
        } catch (error) {
            console.error('Error updating recommendation status:', error);
            Alert.alert('Error', 'Failed to update recommendation status');
        }
    };

    const getFilteredRecommendations = () => {
        if (activeFilter === 'all') {
            return recommendations;
        } else if (activeFilter === 'active') {
            return recommendations.filter(rec => ['new', 'in_progress'].includes(rec.status));
        } else if (activeFilter === 'completed') {
            return recommendations.filter(rec => rec.status === 'completed');
        } else if (activeFilter === 'high_priority') {
            return recommendations.filter(rec => rec.priority === 'high');
        } else {
            // Filter by category
            return recommendations.filter(rec => rec.category === activeFilter);
        }
    };

    const getPriorityStyles = (priority: string) => {
        switch (priority) {
            case 'high':
                return { color: '#DE350B', backgroundColor: '#FFEBE6' };
            case 'medium':
                return { color: '#FF8B00', backgroundColor: '#FFFAE6' };
            case 'low':
                return { color: '#006644', backgroundColor: '#E3FCEF' };
            default:
                return { color: '#5E6C84', backgroundColor: '#F4F5F7' };
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'medication':
                return 'medkit-outline';
            case 'lifestyle':
                return 'leaf-outline';
            case 'follow_up':
                return 'calendar-outline';
            case 'test':
                return 'flask-outline';
            default:
                return 'document-text-outline';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'new':
                return 'New';
            case 'in_progress':
                return 'In Progress';
            case 'completed':
                return 'Completed';
            case 'dismissed':
                return 'Dismissed';
            default:
                return status;
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const renderFilters = () => {
        const filters = [
            { id: 'all', label: 'All' },
            { id: 'active', label: 'Active' },
            { id: 'high_priority', label: 'High Priority' },
            { id: 'medication', label: 'Medication' },
            { id: 'lifestyle', label: 'Lifestyle' },
            { id: 'follow_up', label: 'Follow-up' },
            { id: 'test', label: 'Tests' },
            { id: 'completed', label: 'Completed' }
        ];

        return (
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filtersContainer}
            >
                {filters.map(filter => (
                    <TouchableOpacity
                        key={filter.id}
                        style={[
                            styles.filterChip,
                            activeFilter === filter.id && styles.activeFilterChip
                        ]}
                        onPress={() => setActiveFilter(filter.id)}
                    >
                        <Text
                            style={[
                                styles.filterText,
                                activeFilter === filter.id && styles.activeFilterText
                            ]}
                        >
                            {filter.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        );
    };

    const renderRecommendationItem = ({ item }: { item: Recommendation }) => {
        const clinician = clinicians[item.clinicianId];
        const priorityStyle = getPriorityStyles(item.priority);

        return (
            <View style={styles.recommendationCard}>
                <View style={styles.recommendationHeader}>
                    <View style={styles.clinicianInfo}>
                        <Image
                            source={{ uri: clinician?.photoUrl }}
                            style={styles.clinicianPhoto}
                        />
                        <View>
                            <Text style={styles.clinicianName}>{clinician?.name}</Text>
                            <Text style={styles.clinicianSpecialty}>{clinician?.specialty}</Text>
                        </View>
                    </View>
                    <Text style={styles.dateText}>{formatDate(item.date)}</Text>
                </View>

                <View style={styles.recommendationContent}>
                    <View style={styles.titleRow}>
                        <View style={[styles.priorityBadge, { backgroundColor: priorityStyle.backgroundColor }]}>
                            <Text style={[styles.priorityText, { color: priorityStyle.color }]}>
                                {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                            </Text>
                        </View>
                        <View style={styles.categoryBadge}>
                            <Ionicons name={getCategoryIcon(item.category)} size={14} color="#5E6C84" />
                            <Text style={styles.categoryText}>
                                {item.category.replace('_', ' ').charAt(0).toUpperCase() + item.category.replace('_', ' ').slice(1)}
                            </Text>
                        </View>
                    </View>

                    <Text style={styles.recommendationTitle}>{item.title}</Text>
                    <Text style={styles.recommendationDescription}>{item.description}</Text>

                    {item.hasAttachment && (
                        <TouchableOpacity
                            style={styles.attachmentButton}
                            onPress={() => Alert.alert('View Attachment', 'This would open the attachment in a real app.')}
                        >
                            <Ionicons
                                name={item.attachmentType === 'pdf' ? 'document-text' :
                                    item.attachmentType === 'image' ? 'image' : 'link'}
                                size={18}
                                color="#2684FF"
                            />
                            <Text style={styles.attachmentText}>
                                View {item.attachmentType === 'pdf' ? 'Document' :
                                    item.attachmentType === 'image' ? 'Image' : 'Link'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.recommendationFooter}>
                    <View style={styles.statusContainer}>
                        <View style={[
                            styles.statusIndicator,
                            item.status === 'new' ? styles.newStatus :
                                item.status === 'in_progress' ? styles.inProgressStatus :
                                    item.status === 'completed' ? styles.completedStatus :
                                        styles.dismissedStatus
                        ]} />
                        <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
                    </View>

                    <View style={styles.actionsContainer}>
                        {(item.status === 'new' || item.status === 'in_progress') && (
                            <>
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={() => updateRecommendationStatus(item.id, 'completed')}
                                >
                                    <Ionicons name="checkmark-circle-outline" size={20} color="#36B37E" />
                                    <Text style={[styles.actionText, { color: '#36B37E' }]}>Complete</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={() => updateRecommendationStatus(item.id, 'dismissed')}
                                >
                                    <Ionicons name="close-circle-outline" size={20} color="#97A0AF" />
                                    <Text style={styles.actionText}>Dismiss</Text>
                                </TouchableOpacity>
                            </>
                        )}

                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => navigation.navigate('MessagingScreen', { clinicianId: item.clinicianId })}
                        >
                            <Ionicons name="chatbubbles-outline" size={20} color="#2684FF" />
                            <Text style={[styles.actionText, { color: '#2684FF' }]}>Message</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="clipboard-outline" size={64} color="#97A0AF" />
            <Text style={styles.emptyTitle}>No recommendations found</Text>
            <Text style={styles.emptySubtitle}>
                {activeFilter === 'all'
                    ? "You don't have any recommendations from your clinicians yet."
                    : `You don't have any ${activeFilter.replace('_', ' ')} recommendations.`}
            </Text>
        </View>
    );

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2684FF" />
                <Text style={styles.loadingText}>Loading recommendations...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Recommendations</Text>
                    <Text style={styles.headerSubtitle}>
                        Health guidance from your providers
                    </Text>
                </View>
            </View>

            <View style={styles.contentContainer}>
                <View style={styles.filtersContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                    >
                        {[
                            { id: 'all', label: 'All' },
                            { id: 'active', label: 'Active' },
                            { id: 'high_priority', label: 'High Priority' },
                            { id: 'medication', label: 'Medication' },
                            { id: 'lifestyle', label: 'Lifestyle' },
                            { id: 'follow_up', label: 'Follow-up' },
                            { id: 'test', label: 'Tests' },
                            { id: 'completed', label: 'Completed' }
                        ].map((filter) => (
                            <TouchableOpacity
                                key={filter.id}
                                style={[
                                    styles.filterChip,
                                    activeFilter === filter.id && styles.activeFilterChip
                                ]}
                                onPress={() => setActiveFilter(filter.id)}
                            >
                                <Text
                                    style={[
                                        styles.filterText,
                                        activeFilter === filter.id && styles.activeFilterText
                                    ]}
                                >
                                    {filter.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <FlatList
                    data={getFilteredRecommendations()}
                    renderItem={renderRecommendationItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.recommendationsList}
                    ListEmptyComponent={renderEmptyState}
                    showsVerticalScrollIndicator={false}
                    style={styles.recommendationsListContainer}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F4F5F7',
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
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#091E42',
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#5E6C84',
        marginTop: 4,
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F4F5F7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentContainer: {
        flex: 1,
    },
    filtersContainer: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F4F5F7',
        height: 52,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#F4F5F7',
        borderRadius: 20,
        marginRight: 8,
        height: 36,
        minWidth: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeFilterChip: {
        backgroundColor: '#DEEBFF',
    },
    filterText: {
        fontSize: 14,
        color: '#5E6C84',
        fontWeight: '500',
        textAlign: 'center',
    },
    activeFilterText: {
        color: '#2684FF',
        fontWeight: '600',
    },
    recommendationsListContainer: {
        flex: 1,
        alignSelf: 'stretch',
        width: '100%',
    },
    recommendationsList: {
        paddingTop: 8,
        paddingBottom: 20,
        paddingHorizontal: 16,
        alignItems: 'flex-start',
    },
    recommendationCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
        overflow: 'hidden',
        alignSelf: 'stretch',
        width: '100%',
    },
    recommendationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F4F5F7',
    },
    clinicianInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    clinicianPhoto: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 8,
    },
    clinicianName: {
        fontSize: 14,
        fontWeight: '500',
        color: '#091E42',
    },
    clinicianSpecialty: {
        fontSize: 12,
        color: '#5E6C84',
    },
    dateText: {
        fontSize: 12,
        color: '#97A0AF',
    },
    recommendationContent: {
        padding: 16,
    },
    titleRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    priorityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginRight: 8,
    },
    priorityText: {
        fontSize: 12,
        fontWeight: '600',
    },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F4F5F7',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    categoryText: {
        fontSize: 12,
        color: '#5E6C84',
        marginLeft: 4,
    },
    recommendationTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#091E42',
        marginBottom: 8,
    },
    recommendationDescription: {
        fontSize: 14,
        color: '#253858',
        lineHeight: 20,
        marginBottom: 12,
    },
    attachmentButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    attachmentText: {
        fontSize: 14,
        color: '#2684FF',
        marginLeft: 4,
    },
    recommendationFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: '#F4F5F7',
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    newStatus: {
        backgroundColor: '#2684FF',
    },
    inProgressStatus: {
        backgroundColor: '#FFAB00',
    },
    completedStatus: {
        backgroundColor: '#36B37E',
    },
    dismissedStatus: {
        backgroundColor: '#97A0AF',
    },
    statusText: {
        fontSize: 12,
        color: '#5E6C84',
    },
    actionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 12,
    },
    actionText: {
        fontSize: 12,
        color: '#5E6C84',
        marginLeft: 4,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#5E6C84',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#091E42',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#5E6C84',
        textAlign: 'center',
        lineHeight: 20,
    },
});

export default ClinicianRecommendationsScreen; 