import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    FlatList
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

type RecommendationsScreenNavigationProp = StackNavigationProp<any, 'Recommendations'>;

interface RecommendationCategory {
    id: string;
    title: string;
}

interface RecommendationItem {
    id: string;
    title: string;
    description: string;
    category: string;
    impact: 'high' | 'medium' | 'low';
    progress: number;
    dueDate?: string;
    isCompleted: boolean;
}

const RecommendationsScreen: React.FC = () => {
    const navigation = useNavigation<RecommendationsScreenNavigationProp>();
    const [isLoading, setIsLoading] = useState(true);
    const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
    const [categories, setCategories] = useState<RecommendationCategory[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [view, setView] = useState<'all' | 'active' | 'completed'>('all');

    useEffect(() => {
        fetchRecommendations();
    }, []);

    const fetchRecommendations = async () => {
        setIsLoading(true);
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Mock categories
            const mockCategories: RecommendationCategory[] = [
                { id: 'all', title: 'All' },
                { id: 'lifestyle', title: 'Lifestyle' },
                { id: 'diet', title: 'Diet' },
                { id: 'exercise', title: 'Exercise' },
                { id: 'medication', title: 'Medication' }
            ];

            // Mock recommendations
            const mockRecommendations: RecommendationItem[] = [
                {
                    id: '1',
                    title: 'Reduce sodium intake',
                    description: 'Limit your daily sodium intake to less than 2,300mg to help lower blood pressure.',
                    category: 'diet',
                    impact: 'high',
                    progress: 65,
                    dueDate: '2023-12-15',
                    isCompleted: false
                },
                {
                    id: '2',
                    title: 'Regular aerobic exercise',
                    description: 'Complete at least 150 minutes of moderate-intensity aerobic activity per week.',
                    category: 'exercise',
                    impact: 'high',
                    progress: 40,
                    dueDate: '2023-12-20',
                    isCompleted: false
                },
                {
                    id: '3',
                    title: 'Take prescribed medications',
                    description: 'Take your blood pressure medication daily as prescribed by your physician.',
                    category: 'medication',
                    impact: 'high',
                    progress: 90,
                    dueDate: '2023-12-10',
                    isCompleted: false
                },
                {
                    id: '4',
                    title: 'Increase fruit and vegetable intake',
                    description: 'Eat at least 5 servings of fruits and vegetables daily.',
                    category: 'diet',
                    impact: 'medium',
                    progress: 50,
                    dueDate: '2023-12-15',
                    isCompleted: false
                },
                {
                    id: '5',
                    title: 'Limit alcohol consumption',
                    description: 'Limit alcohol to no more than one drink per day for women and two for men.',
                    category: 'lifestyle',
                    impact: 'medium',
                    progress: 75,
                    dueDate: '2023-12-18',
                    isCompleted: false
                },
                {
                    id: '6',
                    title: 'Practice stress management',
                    description: 'Spend 15 minutes daily on stress reduction activities like meditation or deep breathing.',
                    category: 'lifestyle',
                    impact: 'medium',
                    progress: 30,
                    dueDate: '2023-12-25',
                    isCompleted: false
                },
                {
                    id: '7',
                    title: 'Get adequate sleep',
                    description: 'Aim for 7-8 hours of quality sleep each night.',
                    category: 'lifestyle',
                    impact: 'medium',
                    progress: 80,
                    dueDate: '2023-12-15',
                    isCompleted: false
                },
                {
                    id: '8',
                    title: 'Quit smoking',
                    description: 'Complete smoking cessation program and remain smoke-free.',
                    category: 'lifestyle',
                    impact: 'high',
                    progress: 100,
                    dueDate: '2023-11-30',
                    isCompleted: true
                },
                {
                    id: '9',
                    title: 'Reduce saturated fat intake',
                    description: 'Limit saturated fat to less than 7% of daily calories.',
                    category: 'diet',
                    impact: 'medium',
                    progress: 100,
                    dueDate: '2023-11-25',
                    isCompleted: true
                }
            ];

            setCategories(mockCategories);
            setRecommendations(mockRecommendations);
            setSelectedCategory('all');
        } catch (error) {
            console.error('Error fetching recommendations:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getFilteredRecommendations = () => {
        let filtered = recommendations;

        // Filter by category
        if (selectedCategory && selectedCategory !== 'all') {
            filtered = filtered.filter(item => item.category === selectedCategory);
        }

        // Filter by status
        switch (view) {
            case 'active':
                return filtered.filter(item => !item.isCompleted);
            case 'completed':
                return filtered.filter(item => item.isCompleted);
            default:
                return filtered;
        }
    };

    const getImpactColor = (impact: string) => {
        switch (impact) {
            case 'high':
                return '#FF5630';
            case 'medium':
                return '#FFAB00';
            case 'low':
                return '#36B37E';
            default:
                return '#6554C0';
        }
    };

    const getProgressColor = (progress: number) => {
        if (progress < 30) return '#FF5630';
        if (progress < 70) return '#FFAB00';
        return '#36B37E';
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const calculateOverallProgress = () => {
        if (recommendations.length === 0) return 0;

        const totalProgress = recommendations.reduce((sum, rec) => sum + rec.progress, 0);
        return Math.round(totalProgress / recommendations.length);
    };

    const renderCategoryTab = ({ item }: { item: RecommendationCategory }) => (
        <TouchableOpacity
            style={[
                styles.categoryTab,
                selectedCategory === item.id && styles.activeCategoryTab
            ]}
            onPress={() => setSelectedCategory(item.id)}
        >
            <Text
                style={[
                    styles.categoryTitle,
                    selectedCategory === item.id && styles.activeCategoryTitle
                ]}
            >
                {item.title}
            </Text>
        </TouchableOpacity>
    );

    const renderRecommendationItem = ({ item }: { item: RecommendationItem }) => (
        <TouchableOpacity
            style={styles.recommendationCard}
            onPress={() => navigation.navigate('RecommendationDetail', { id: item.id })}
        >
            <View style={styles.recommendationHeader}>
                <View
                    style={[
                        styles.impactIndicator,
                        { backgroundColor: getImpactColor(item.impact) }
                    ]}
                />
                <Text style={styles.recommendationTitle}>{item.title}</Text>
                <Ionicons
                    name={item.isCompleted ? "checkmark-circle" : "time-outline"}
                    size={20}
                    color={item.isCompleted ? "#36B37E" : "#5E6C84"}
                />
            </View>

            <Text style={styles.recommendationDescription}>{item.description}</Text>

            <View style={styles.recommendationFooter}>
                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <View
                            style={[
                                styles.progressFill,
                                { width: `${item.progress}%`, backgroundColor: getProgressColor(item.progress) }
                            ]}
                        />
                    </View>
                    <Text style={styles.progressText}>{item.progress}%</Text>
                </View>

                {item.dueDate && (
                    <Text style={styles.dueDate}>
                        Due: {formatDate(item.dueDate)}
                    </Text>
                )}
            </View>
        </TouchableOpacity>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={60} color="#DFE1E6" />
            <Text style={styles.emptyStateTitle}>No Recommendations Found</Text>
            <Text style={styles.emptyStateText}>
                There are no recommendations matching your current filters.
            </Text>
        </View>
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
                <View style={styles.progressSummary}>
                    <Text style={styles.progressTitle}>Your Progress</Text>
                    <View style={styles.overallProgressContainer}>
                        <View style={styles.overallProgressBar}>
                            <View
                                style={[
                                    styles.overallProgressFill,
                                    { width: `${calculateOverallProgress()}%` }
                                ]}
                            />
                        </View>
                        <Text style={styles.overallProgressText}>{calculateOverallProgress()}%</Text>
                    </View>
                </View>

                <View style={styles.viewToggleContainer}>
                    <TouchableOpacity
                        style={[styles.viewToggle, view === 'all' && styles.activeViewToggle]}
                        onPress={() => setView('all')}
                    >
                        <Text style={[styles.viewToggleText, view === 'all' && styles.activeViewToggleText]}>
                            All
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.viewToggle, view === 'active' && styles.activeViewToggle]}
                        onPress={() => setView('active')}
                    >
                        <Text style={[styles.viewToggleText, view === 'active' && styles.activeViewToggleText]}>
                            Active
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.viewToggle, view === 'completed' && styles.activeViewToggle]}
                        onPress={() => setView('completed')}
                    >
                        <Text style={[styles.viewToggleText, view === 'completed' && styles.activeViewToggleText]}>
                            Completed
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.categoriesContainer}>
                <FlatList
                    data={categories}
                    renderItem={renderCategoryTab}
                    keyExtractor={item => item.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoriesList}
                />
            </View>

            <FlatList
                data={getFilteredRecommendations()}
                renderItem={renderRecommendationItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.recommendationsList}
                ListEmptyComponent={renderEmptyState}
            />

            <View style={styles.actionButtonContainer}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('AddCustomRecommendation')}
                >
                    <Ionicons name="add" size={24} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Add Custom Goal</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F4F5F7'
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F4F5F7'
    },
    header: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#DFE1E6'
    },
    progressSummary: {
        marginBottom: 16
    },
    progressTitle: {
        fontSize: 16,
        color: '#5E6C84',
        marginBottom: 8
    },
    overallProgressContainer: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    overallProgressBar: {
        flex: 1,
        height: 8,
        backgroundColor: '#F4F5F7',
        borderRadius: 4,
        marginRight: 8
    },
    overallProgressFill: {
        height: '100%',
        backgroundColor: '#36B37E',
        borderRadius: 4
    },
    overallProgressText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#172B4D',
        width: 40,
        textAlign: 'right'
    },
    viewToggleContainer: {
        flexDirection: 'row',
        borderWidth: 1,
        borderColor: '#DFE1E6',
        borderRadius: 4,
        overflow: 'hidden'
    },
    viewToggle: {
        flex: 1,
        padding: 8,
        alignItems: 'center'
    },
    activeViewToggle: {
        backgroundColor: '#2684FF'
    },
    viewToggleText: {
        fontSize: 14,
        color: '#172B4D'
    },
    activeViewToggleText: {
        color: '#FFFFFF',
        fontWeight: '500'
    },
    categoriesContainer: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#DFE1E6'
    },
    categoriesList: {
        paddingHorizontal: 16
    },
    categoryTab: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginRight: 8,
        borderRadius: 16,
        backgroundColor: '#F4F5F7'
    },
    activeCategoryTab: {
        backgroundColor: '#E6EFFC'
    },
    categoryTitle: {
        fontSize: 14,
        color: '#5E6C84'
    },
    activeCategoryTitle: {
        color: '#2684FF',
        fontWeight: '500'
    },
    recommendationsList: {
        padding: 16
    },
    recommendationCard: {
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
    recommendationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8
    },
    impactIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 8
    },
    recommendationTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        color: '#172B4D'
    },
    recommendationDescription: {
        fontSize: 14,
        color: '#5E6C84',
        marginBottom: 16
    },
    recommendationFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    progressContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16
    },
    progressBar: {
        flex: 1,
        height: 6,
        backgroundColor: '#F4F5F7',
        borderRadius: 3,
        marginRight: 8
    },
    progressFill: {
        height: '100%',
        borderRadius: 3
    },
    progressText: {
        fontSize: 12,
        color: '#5E6C84',
        width: 30
    },
    dueDate: {
        fontSize: 12,
        color: '#5E6C84'
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32
    },
    emptyStateTitle: {
        fontSize: 18,
        fontWeight: '500',
        color: '#172B4D',
        marginTop: 16,
        marginBottom: 8
    },
    emptyStateText: {
        fontSize: 14,
        color: '#5E6C84',
        textAlign: 'center'
    },
    actionButtonContainer: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#DFE1E6',
        backgroundColor: '#FFFFFF'
    },
    actionButton: {
        backgroundColor: '#2684FF',
        borderRadius: 4,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '500',
        marginLeft: 8
    }
});

export default RecommendationsScreen; 