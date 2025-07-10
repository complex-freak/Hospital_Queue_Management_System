import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Path, Text as SvgText, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

// Type cast components to avoid TypeScript errors
const TypedSvg = Svg as any;
const TypedCircle = Circle as any;
const TypedPath = Path as any;
const TypedSvgText = SvgText as any;
const TypedSvgGradient = SvgGradient as any;
const TypedStop = Stop as any;

type RiskVisualizationScreenNavigationProp = StackNavigationProp<any, 'RiskVisualization'>;

interface RiskFactor {
    id: string;
    name: string;
    value: number | string;
    unit?: string;
    normalRange?: string;
    riskLevel: 'low' | 'moderate' | 'high';
    impactPercent: number;
}

interface RiskScore {
    current: number;
    lastMeasurement?: {
        value: number;
        date: string;
    };
    projected?: {
        value: number;
        date: string;
        description: string;
    };
}

const RiskVisualizationScreen: React.FC = () => {
    const navigation = useNavigation<RiskVisualizationScreenNavigationProp>();
    const [isLoading, setIsLoading] = useState(true);
    const [riskScore, setRiskScore] = useState<RiskScore>({ current: 0 });
    const [riskFactors, setRiskFactors] = useState<RiskFactor[]>([]);
    const [expandedFactor, setExpandedFactor] = useState<string | null>(null);

    // Set up the header with settings button
    React.useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <TouchableOpacity
                    style={styles.headerButton}
                    onPress={() => navigation.navigate('RiskSettings')}
                >
                    <Ionicons name="settings-outline" size={24} color="#172B4D" />
                </TouchableOpacity>
            ),
        });
    }, [navigation]);

    useEffect(() => {
        fetchRiskData();
    }, []);

    const fetchRiskData = async () => {
        setIsLoading(true);

        try {
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Mock data for development
            const mockRiskScore: RiskScore = {
                current: 17.8,
                lastMeasurement: {
                    value: 22.3,
                    date: '2023-09-15'
                },
                projected: {
                    value: 12.6,
                    date: '2024-03-15',
                    description: 'Based on current progress and recommended actions'
                }
            };

            const mockRiskFactors: RiskFactor[] = [
                {
                    id: '1',
                    name: 'Blood Pressure',
                    value: '135/85',
                    unit: 'mmHg',
                    normalRange: '< 120/80 mmHg',
                    riskLevel: 'moderate',
                    impactPercent: 25
                },
                {
                    id: '2',
                    name: 'Total Cholesterol',
                    value: 210,
                    unit: 'mg/dL',
                    normalRange: '< 200 mg/dL',
                    riskLevel: 'moderate',
                    impactPercent: 20
                },
                {
                    id: '3',
                    name: 'HDL Cholesterol',
                    value: 42,
                    unit: 'mg/dL',
                    normalRange: '> 60 mg/dL',
                    riskLevel: 'moderate',
                    impactPercent: 15
                },
                {
                    id: '4',
                    name: 'Smoking Status',
                    value: 'Former',
                    riskLevel: 'moderate',
                    impactPercent: 30
                },
                {
                    id: '5',
                    name: 'Physical Activity',
                    value: 'Insufficient',
                    normalRange: '≥ 150 min/week',
                    riskLevel: 'high',
                    impactPercent: 10
                }
            ];

            setRiskScore(mockRiskScore);
            setRiskFactors(mockRiskFactors);
        } catch (error) {
            console.error('Error fetching risk data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleFactorExpansion = (factorId: string) => {
        if (expandedFactor === factorId) {
            setExpandedFactor(null);
        } else {
            setExpandedFactor(factorId);
        }
    };

    const getRiskLevelColor = (riskLevel: string) => {
        switch (riskLevel) {
            case 'low':
                return '#36B37E'; // Green
            case 'moderate':
                return '#FFAB00'; // Amber
            case 'high':
                return '#FF5630'; // Red
            default:
                return '#6554C0'; // Purple (unknown)
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // Calculate the position on the gauge based on the risk score
    const calculateRiskPosition = (score: number) => {
        // Assuming score range is 0-100
        // Convert to a 0-180 degree angle for the gauge
        const angle = (score / 100) * 180;
        // Convert angle to radians
        const rad = (angle - 90) * Math.PI / 180;
        // Calculate x and y coordinates on a circle
        const radius = 80;
        const x = radius * Math.cos(rad) + radius;
        const y = radius * Math.sin(rad) + radius;

        return { x, y };
    };

    const renderRiskGauge = () => {
        const { current } = riskScore;
        const position = calculateRiskPosition(current);
        const width = Dimensions.get('window').width - 40;
        const height = 200;
        const radius = 80;
        const strokeWidth = 12;
        const fontSize = 24;

        // Create the gauge path (semicircle)
        const gaugePath = `
      M ${strokeWidth / 2} ${radius}
      A ${radius} ${radius} 0 0 1 ${radius * 2 - strokeWidth / 2} ${radius}
    `;

        return (
            <View style={[styles.riskGaugeContainer, { width }]}>
                <TypedSvg width={width} height={height}>
                    {/* Background arc */}
                    <TypedSvgGradient
                        id="gradient"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="0%"
                    >
                        <TypedStop offset="0%" stopColor="#36B37E" />
                        <TypedStop offset="50%" stopColor="#FFAB00" />
                        <TypedStop offset="100%" stopColor="#FF5630" />
                    </TypedSvgGradient>

                    <TypedPath
                        d={gaugePath}
                        stroke="url(#gradient)"
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        fill="none"
                    />

                    {/* Indicator circle */}
                    <TypedCircle
                        cx={position.x}
                        cy={position.y}
                        r={10}
                        fill="#172B4D"
                    />

                    {/* Risk score text */}
                    <TypedSvgText
                        x={radius}
                        y={radius + 20}
                        textAnchor="middle"
                        fill="#172B4D"
                        fontSize={fontSize}
                        fontWeight="bold"
                    >
                        {current.toFixed(1)}%
                    </TypedSvgText>

                    <TypedSvgText
                        x={radius}
                        y={radius + 45}
                        textAnchor="middle"
                        fill="#5E6C84"
                        fontSize={14}
                    >
                        10-Year Risk
                    </TypedSvgText>

                    {/* Risk level labels */}
                    <TypedSvgText x="5%" y={radius + 80} textAnchor="start" fill="#36B37E" fontSize={12}>Low Risk</TypedSvgText>
                    <TypedSvgText x="50%" y={radius + 80} textAnchor="middle" fill="#FFAB00" fontSize={12}>Moderate Risk</TypedSvgText>
                    <TypedSvgText x="95%" y={radius + 80} textAnchor="end" fill="#FF5630" fontSize={12}>High Risk</TypedSvgText>
                </TypedSvg>
            </View>
        );
    };

    const renderTrend = () => {
        if (!riskScore.lastMeasurement) return null;

        const { current, lastMeasurement } = riskScore;
        const difference = lastMeasurement.value - current;
        const isImproved = difference > 0;

        return (
            <View style={styles.trendContainer}>
                <View style={styles.trendRow}>
                    <Text style={styles.trendLabel}>Previous Risk Score:</Text>
                    <Text style={styles.trendValue}>{lastMeasurement.value.toFixed(1)}%</Text>
                </View>
                <View style={styles.trendRow}>
                    <Text style={styles.trendLabel}>Measured on:</Text>
                    <Text style={styles.trendValue}>{formatDate(lastMeasurement.date)}</Text>
                </View>
                <View style={styles.trendRow}>
                    <Text style={styles.trendLabel}>Change:</Text>
                    <View style={styles.trendChangeContainer}>
                        <Ionicons
                            name={isImproved ? 'trending-down' : 'trending-up'}
                            size={20}
                            color={isImproved ? '#36B37E' : '#FF5630'}
                        />
                        <Text style={[
                            styles.trendChangeValue,
                            { color: isImproved ? '#36B37E' : '#FF5630' }
                        ]}>
                            {Math.abs(difference).toFixed(1)}%
                        </Text>
                    </View>
                </View>

                {riskScore.projected && (
                    <>
                        <View style={styles.divider} />
                        <View style={styles.trendRow}>
                            <Text style={styles.trendLabel}>Projected Risk:</Text>
                            <Text style={styles.trendValue}>{riskScore.projected.value.toFixed(1)}%</Text>
                        </View>
                        <View style={styles.trendRow}>
                            <Text style={styles.trendLabel}>By:</Text>
                            <Text style={styles.trendValue}>{formatDate(riskScore.projected.date)}</Text>
                        </View>
                        <Text style={styles.projectionNote}>{riskScore.projected.description}</Text>
                    </>
                )}
            </View>
        );
    };

    const renderRiskFactors = () => {
        return (
            <View style={styles.riskFactorsContainer}>
                <Text style={styles.sectionTitle}>Risk Factors</Text>
                {riskFactors.map(factor => (
                    <TouchableOpacity
                        key={factor.id}
                        style={styles.factorCard}
                        onPress={() => toggleFactorExpansion(factor.id)}
                    >
                        <View style={styles.factorHeader}>
                            <View style={styles.factorHeaderLeft}>
                                <View
                                    style={[
                                        styles.riskLevelIndicator,
                                        { backgroundColor: getRiskLevelColor(factor.riskLevel) }
                                    ]}
                                />
                                <Text style={styles.factorName}>{factor.name}</Text>
                            </View>
                            <View style={styles.factorHeaderRight}>
                                <Text style={styles.factorValue}>
                                    {`${factor.value}${factor.unit ? ' ' + factor.unit : ''}`}
                                </Text>
                                <Ionicons
                                    name={expandedFactor === factor.id ? "chevron-up" : "chevron-down"}
                                    size={16}
                                    color="#5E6C84"
                                />
                            </View>
                        </View>

                        {expandedFactor === factor.id && (
                            <View style={styles.factorDetails}>
                                {factor.normalRange && (
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Normal Range:</Text>
                                        <Text style={styles.detailValue}>{factor.normalRange}</Text>
                                    </View>
                                )}
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Risk Level:</Text>
                                    <View style={styles.riskLevelContainer}>
                                        <View
                                            style={[
                                                styles.riskLevelDot,
                                                { backgroundColor: getRiskLevelColor(factor.riskLevel) }
                                            ]}
                                        />
                                        <Text style={styles.detailValue}>
                                            {factor.riskLevel.charAt(0).toUpperCase() + factor.riskLevel.slice(1)}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Impact on Risk:</Text>
                                    <Text style={styles.detailValue}>{factor.impactPercent}%</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.learnMoreButton}
                                    onPress={() => navigation.navigate('RiskFactorDetail', { factorId: factor.id })}
                                >
                                    <Text style={styles.learnMoreText}>Learn More</Text>
                                    <Ionicons name="arrow-forward" size={16} color="#2684FF" />
                                </TouchableOpacity>
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    const renderActionableRecommendations = () => {
        return (
            <View style={styles.recommendationsContainer}>
                <View style={styles.recommendationsHeader}>
                    <Text style={styles.sectionTitle}>Recommendations</Text>
                    <TouchableOpacity
                        style={styles.viewAllButton}
                        onPress={() => navigation.navigate('Recommendations')}
                    >
                        <Text style={styles.viewAllText}>View All</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={styles.recommendationCard}
                    onPress={() => navigation.navigate('RecommendationDetail', { id: '1' })}
                >
                    <View style={styles.recommendationIconContainer}>
                        <Ionicons name="heart" size={24} color="#FF5630" />
                    </View>
                    <View style={styles.recommendationContent}>
                        <Text style={styles.recommendationTitle}>Lower Blood Pressure</Text>
                        <Text style={styles.recommendationDescription}>
                            Reducing sodium intake and increasing physical activity can help lower your blood pressure.
                        </Text>
                        <View style={styles.recommendationProgressContainer}>
                            <View style={styles.progressBar}>
                                <View style={[styles.progressFill, { width: '35%' }]} />
                            </View>
                            <Text style={styles.progressText}>35% Complete</Text>
                        </View>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.recommendationCard}
                    onPress={() => navigation.navigate('RecommendationDetail', { id: '2' })}
                >
                    <View style={styles.recommendationIconContainer}>
                        <Ionicons name="walk" size={24} color="#36B37E" />
                    </View>
                    <View style={styles.recommendationContent}>
                        <Text style={styles.recommendationTitle}>Increase Physical Activity</Text>
                        <Text style={styles.recommendationDescription}>
                            Aim for 150 minutes of moderate activity per week to improve your cardiovascular health.
                        </Text>
                        <View style={styles.recommendationProgressContainer}>
                            <View style={styles.progressBar}>
                                <View style={[styles.progressFill, { width: '20%' }]} />
                            </View>
                            <Text style={styles.progressText}>20% Complete</Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </View>
        );
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2684FF" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Your CVD Risk Score</Text>
                {renderRiskGauge()}
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Risk Trend</Text>
                {renderTrend()}
            </View>

            {renderRiskFactors()}

            {renderActionableRecommendations()}

            <TouchableOpacity
                style={styles.callToActionButton}
                onPress={() => navigation.navigate('Recommendations')}
            >
                <Text style={styles.callToActionText}>View All Recommendations</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F4F5F7'
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 32
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F4F5F7'
    },
    headerButton: {
        padding: 8,
        marginRight: 16
    },
    card: {
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
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#172B4D',
        marginBottom: 16
    },
    riskGaugeContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 8
    },
    trendContainer: {
        marginVertical: 8
    },
    trendRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 4
    },
    trendLabel: {
        fontSize: 14,
        color: '#5E6C84'
    },
    trendValue: {
        fontSize: 14,
        fontWeight: '500',
        color: '#172B4D'
    },
    trendChangeContainer: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    trendChangeValue: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 4
    },
    divider: {
        height: 1,
        backgroundColor: '#DFE1E6',
        marginVertical: 12
    },
    projectionNote: {
        fontSize: 12,
        color: '#5E6C84',
        marginTop: 8,
        fontStyle: 'italic'
    },
    riskFactorsContainer: {
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
        fontSize: 18,
        fontWeight: '600',
        color: '#172B4D',
        marginBottom: 16
    },
    factorCard: {
        borderWidth: 1,
        borderColor: '#DFE1E6',
        borderRadius: 8,
        marginBottom: 8
    },
    factorHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12
    },
    factorHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    riskLevelIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 8
    },
    factorName: {
        fontSize: 16,
        color: '#172B4D',
        fontWeight: '500'
    },
    factorHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    factorValue: {
        fontSize: 16,
        color: '#172B4D',
        fontWeight: '500',
        marginRight: 8
    },
    factorDetails: {
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: '#DFE1E6',
        backgroundColor: '#FAFBFC'
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 4
    },
    detailLabel: {
        fontSize: 14,
        color: '#5E6C84'
    },
    detailValue: {
        fontSize: 14,
        color: '#172B4D'
    },
    riskLevelContainer: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    riskLevelDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6
    },
    learnMoreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 8
    },
    learnMoreText: {
        fontSize: 14,
        color: '#2684FF',
        marginRight: 4
    },
    recommendationsContainer: {
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
    recommendationsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    viewAllButton: {
        padding: 4
    },
    viewAllText: {
        fontSize: 14,
        color: '#2684FF'
    },
    recommendationCard: {
        flexDirection: 'row',
        padding: 12,
        borderWidth: 1,
        borderColor: '#DFE1E6',
        borderRadius: 8,
        marginBottom: 8
    },
    recommendationIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F4F5F7',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
    },
    recommendationContent: {
        flex: 1
    },
    recommendationTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#172B4D',
        marginBottom: 4
    },
    recommendationDescription: {
        fontSize: 14,
        color: '#5E6C84',
        marginBottom: 8
    },
    recommendationProgressContainer: {
        flexDirection: 'row',
        alignItems: 'center'
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
        backgroundColor: '#36B37E',
        borderRadius: 3
    },
    progressText: {
        fontSize: 12,
        color: '#5E6C84',
        width: 80
    },
    callToActionButton: {
        backgroundColor: '#2684FF',
        borderRadius: 4,
        padding: 16,
        alignItems: 'center',
        marginBottom: 16
    },
    callToActionText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600'
    }
});

export default RiskVisualizationScreen; 