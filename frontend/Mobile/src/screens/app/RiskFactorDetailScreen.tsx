import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    Dimensions,
    Image
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Path, Line } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    interpolate,
    Extrapolate
} from 'react-native-reanimated';

// Type cast components to avoid TypeScript errors
const TypedSvg = Svg as any;
const TypedCircle = Circle as any;
const TypedPath = Path as any;
const TypedLine = Line as any;
const TypedLinearGradient = LinearGradient as any;

type RiskFactorDetailRouteProp = RouteProp<{
    RiskFactorDetail: { factorId: string };
}, 'RiskFactorDetail'>;

type RiskFactorDetailNavigationProp = StackNavigationProp<any, 'RiskFactorDetail'>;

interface FactorData {
    id: string;
    name: string;
    description: string;
    currentValue: string;
    unit?: string;
    normalRange: string;
    riskLevel: 'low' | 'moderate' | 'high';
    lastUpdated: string;
    impactDescription: string;
    recommendedActions: string[];
    resources: {
        title: string;
        url: string;
    }[];
}

const RiskFactorDetailScreen: React.FC = () => {
    const route = useRoute<RiskFactorDetailRouteProp>();
    const navigation = useNavigation<RiskFactorDetailNavigationProp>();
    const { factorId } = route.params;
    const [isLoading, setIsLoading] = useState(true);
    const [factorData, setFactorData] = useState<FactorData | null>(null);
    const [activeTab, setActiveTab] = useState('about');

    const animatedHeight = useSharedValue(0);
    const sliderPosition = useSharedValue(50); // Start in the middle (50%)

    useEffect(() => {
        fetchFactorData();
    }, [factorId]);

    const fetchFactorData = async () => {
        setIsLoading(true);
        try {
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Mock data based on factorId
            let mockFactorData: FactorData;

            switch (factorId) {
                case '1': // Blood Pressure
                    mockFactorData = {
                        id: '1',
                        name: 'Blood Pressure',
                        description: 'Blood pressure is the force of blood pushing against the walls of your arteries. High blood pressure (hypertension) can lead to serious health problems like heart disease and stroke.',
                        currentValue: '135/85',
                        unit: 'mmHg',
                        normalRange: '< 120/80 mmHg',
                        riskLevel: 'moderate',
                        lastUpdated: '2023-11-15',
                        impactDescription: 'Your current blood pressure reading puts you at increased risk for cardiovascular disease. Each 10 mmHg increase in systolic blood pressure is associated with a 17% increased risk of cardiovascular disease.',
                        recommendedActions: [
                            'Reduce sodium intake to less than 2,300 mg per day',
                            'Exercise regularly, aim for at least 150 minutes per week',
                            'Maintain a healthy weight',
                            'Limit alcohol consumption',
                            'Consider blood pressure medication as prescribed by your healthcare provider'
                        ],
                        resources: [
                            {
                                title: 'American Heart Association - Blood Pressure',
                                url: 'https://www.heart.org/en/health-topics/high-blood-pressure'
                            },
                            {
                                title: 'DASH Diet for Hypertension',
                                url: 'https://www.nhlbi.nih.gov/education/dash-eating-plan'
                            }
                        ]
                    };
                    break;
                case '2': // Total Cholesterol
                    mockFactorData = {
                        id: '2',
                        name: 'Total Cholesterol',
                        description: 'Cholesterol is a waxy substance found in your blood. While your body needs cholesterol to build healthy cells, high levels can increase your risk of heart disease.',
                        currentValue: '210',
                        unit: 'mg/dL',
                        normalRange: '< 200 mg/dL',
                        riskLevel: 'moderate',
                        lastUpdated: '2023-10-20',
                        impactDescription: 'Your total cholesterol level is borderline high. For every 10% increase in total cholesterol, there is approximately a 20% increase in coronary heart disease risk.',
                        recommendedActions: [
                            'Eat a heart-healthy diet low in saturated and trans fats',
                            'Increase consumption of fruits, vegetables, and whole grains',
                            'Exercise regularly',
                            'Maintain a healthy weight',
                            'Consider statin therapy if recommended by your healthcare provider'
                        ],
                        resources: [
                            {
                                title: 'American Heart Association - Cholesterol',
                                url: 'https://www.heart.org/en/health-topics/cholesterol'
                            },
                            {
                                title: 'NIH - Lowering Your Cholesterol',
                                url: 'https://www.nhlbi.nih.gov/health-topics/all-publications-and-resources/high-blood-cholesterol-what-you-need-know'
                            }
                        ]
                    };
                    break;
                case '4': // Smoking Status
                    mockFactorData = {
                        id: '4',
                        name: 'Smoking Status',
                        description: 'Smoking damages nearly every organ in the body and is a major risk factor for cardiovascular disease, cancer, and respiratory diseases.',
                        currentValue: 'Former Smoker',
                        normalRange: 'Non-smoker',
                        riskLevel: 'moderate',
                        lastUpdated: '2023-09-30',
                        impactDescription: 'As a former smoker, your risk for cardiovascular disease is lower than current smokers but still elevated compared to those who have never smoked. Risk decreases over time after quitting.',
                        recommendedActions: [
                            'Maintain your smoke-free status',
                            'Avoid secondhand smoke exposure',
                            'Consider regular lung function testing',
                            'Stay vigilant about other cardiovascular risk factors'
                        ],
                        resources: [
                            {
                                title: 'CDC - Benefits of Quitting',
                                url: 'https://www.cdc.gov/tobacco/quit_smoking/how_to_quit/benefits/index.htm'
                            },
                            {
                                title: 'Smokefree.gov',
                                url: 'https://smokefree.gov/'
                            }
                        ]
                    };
                    break;
                default:
                    mockFactorData = {
                        id: '5',
                        name: 'Physical Activity',
                        description: 'Regular physical activity helps strengthen your heart, lower blood pressure, reduce LDL cholesterol, and improve your overall cardiovascular health.',
                        currentValue: 'Insufficient',
                        normalRange: '≥ 150 min/week',
                        riskLevel: 'high',
                        lastUpdated: '2023-11-02',
                        impactDescription: 'Your current activity level puts you at higher risk for cardiovascular disease. Regular physical activity can reduce your risk by up to 30%.',
                        recommendedActions: [
                            'Gradually increase physical activity to 150 minutes of moderate-intensity exercise per week',
                            'Include both aerobic activity and strength training',
                            'Start with short 10-minute sessions if you are currently inactive',
                            'Choose activities you enjoy to help maintain consistency',
                            'Consider walking, swimming, or cycling as low-impact options'
                        ],
                        resources: [
                            {
                                title: 'American Heart Association - Physical Activity',
                                url: 'https://www.heart.org/en/healthy-living/fitness/fitness-basics/aha-recs-for-physical-activity-in-adults'
                            },
                            {
                                title: 'CDC - Physical Activity Guidelines',
                                url: 'https://www.cdc.gov/physicalactivity/basics/adults/index.htm'
                            }
                        ]
                    };
            }

            setFactorData(mockFactorData);
        } catch (error) {
            console.error('Error fetching factor data:', error);
        } finally {
            setIsLoading(false);
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
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    };

    const handleSliderChange = (newPosition: number) => {
        sliderPosition.value = newPosition;
    };

    const sliderStyle = useAnimatedStyle(() => {
        return {
            left: `${sliderPosition.value}%`,
            transform: [{ translateX: -15 }], // half the width of the handle
        };
    });

    const leftTextStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            sliderPosition.value,
            [0, 50],
            [1, 0.5],
            Extrapolate.CLAMP
        );

        return {
            opacity,
        };
    });

    const rightTextStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            sliderPosition.value,
            [50, 100],
            [0.5, 1],
            Extrapolate.CLAMP
        );

        return {
            opacity,
        };
    });

    const renderInteractiveRiskSlider = () => {
        const width = Dimensions.get('window').width - 32;

        return (
            <View style={styles.sliderContainer}>
                <Text style={styles.sliderTitle}>See How Your Risk Changes</Text>
                <Text style={styles.sliderSubtitle}>Drag the slider to see how changes affect your risk</Text>

                <View style={styles.sliderSection}>
                    <Animated.Text style={[styles.sliderEndText, leftTextStyle]}>Lower</Animated.Text>

                    <View style={[styles.sliderTrack, { width: width - 100 }]}>
                        <TypedLinearGradient
                            style={styles.sliderGradient}
                            colors={['#36B37E', '#FFAB00', '#FF5630']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        />
                        <Animated.View style={[styles.sliderHandle, sliderStyle]} />
                    </View>

                    <Animated.Text style={[styles.sliderEndText, rightTextStyle]}>Higher</Animated.Text>
                </View>

                <View style={styles.sliderInfo}>
                    {sliderPosition.value < 33 && (
                        <View style={styles.sliderInfoContent}>
                            <Text style={[styles.sliderInfoTitle, { color: '#36B37E' }]}>Lower Risk</Text>
                            <Text style={styles.sliderInfoText}>{factorData?.impactDescription}</Text>
                        </View>
                    )}

                    {sliderPosition.value >= 33 && sliderPosition.value <= 66 && (
                        <View style={styles.sliderInfoContent}>
                            <Text style={[styles.sliderInfoTitle, { color: '#FFAB00' }]}>Current Risk</Text>
                            <Text style={styles.sliderInfoText}>{factorData?.impactDescription}</Text>
                        </View>
                    )}

                    {sliderPosition.value > 66 && (
                        <View style={styles.sliderInfoContent}>
                            <Text style={[styles.sliderInfoTitle, { color: '#FF5630' }]}>Higher Risk</Text>
                            <Text style={styles.sliderInfoText}>{factorData?.impactDescription}</Text>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    const renderHistoryChart = () => {
        if (!factorData?.resources || factorData.resources.length === 0) {
            return null;
        }

        const width = Dimensions.get('window').width - 32;
        const height = 200;
        const padding = 30;
        const chartWidth = width - (padding * 2);
        const chartHeight = height - (padding * 2);

        // Calculate data points positions
        const dataPoints = factorData.resources.map((resource: any, index: number) => {
            const x = padding + ((index / (factorData.resources.length - 1)) * chartWidth);

            // Handle different data types (numbers vs strings like blood pressure)
            let value: number;
            if (typeof resource.value === 'number') {
                value = resource.value;
            } else if (typeof resource.value === 'string' && resource.value.includes('/')) {
                // For blood pressure "120/80", use the systolic (first number)
                value = parseInt(resource.value.split('/')[0], 10);
            } else {
                value = 0; // Fallback
            }

            // Find min and max values for scaling
            const allValues = factorData.resources.map((d: any) => {
                if (typeof d.value === 'number') {
                    return d.value;
                } else if (typeof d.value === 'string' && d.value.includes('/')) {
                    return parseInt(d.value.split('/')[0], 10);
                }
                return 0;
            });

            const minValue = Math.min(...allValues);
            const maxValue = Math.max(...allValues);
            const valueRange = maxValue - minValue;

            // Calculate y position
            const normalizedValue = (value - minValue) / (valueRange || 1);
            const y = height - padding - (normalizedValue * chartHeight);

            return { x, y, value: resource.value, date: resource.date };
        });

        // Create path for the line
        const linePath = dataPoints.reduce((path: string, point: any, i: number) => {
            return path + `${i === 0 ? 'M' : 'L'}${point.x},${point.y}`;
        }, '');

        return (
            <View style={styles.historyContainer}>
                <Text style={styles.historyTitle}>Additional Resources</Text>

                <TypedSvg width={width} height={height}>
                    {/* Horizontal grid lines */}
                    <TypedLine x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#DFE1E6" strokeWidth="1" />
                    <TypedLine x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#DFE1E6" strokeWidth="1" />
                    <TypedLine x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#DFE1E6" strokeWidth="1" />

                    {/* Y-axis */}
                    <TypedLine x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#5E6C84" strokeWidth="1" />

                    {/* X-axis */}
                    <TypedLine x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#5E6C84" strokeWidth="1" />

                    {/* Line graph */}
                    <TypedPath
                        d={linePath}
                        stroke="#2684FF"
                        strokeWidth="2"
                        fill="none"
                    />

                    {/* Data points */}
                    {dataPoints.map((point: any, index: number) => (
                        <TypedCircle
                            key={index}
                            cx={point.x}
                            cy={point.y}
                            r={5}
                            fill="#FFFFFF"
                            stroke="#2684FF"
                            strokeWidth="2"
                        />
                    ))}
                </TypedSvg>

                {/* X-axis labels (dates) */}
                <View style={styles.chartLabels}>
                    {dataPoints.map((point: any, index: number) => (
                        <Text key={index} style={styles.dateLabel}>{formatDate(point.date).split(' ')[0]}</Text>
                    ))}
                </View>
            </View>
        );
    };

    const renderRecommendations = () => {
        if (!factorData?.recommendedActions || factorData.recommendedActions.length === 0) {
            return null;
        }

        return (
            <View style={styles.recommendationsContainer}>
                <Text style={styles.recommendationsTitle}>Recommended Actions</Text>

                {factorData.recommendedActions.map((action, index) => (
                    <View key={index} style={styles.recommendationItem}>
                        <View style={styles.recommendationBullet}>
                            <Text style={styles.bulletText}>{index + 1}</Text>
                        </View>
                        <Text style={styles.recommendationText}>{action}</Text>
                    </View>
                ))}
            </View>
        );
    };

    const renderAboutTab = () => {
        return (
            <View style={styles.tabContent}>
                <View style={styles.infoContainer}>
                    <Text style={styles.description}>{factorData?.description}</Text>
                </View>

                {renderInteractiveRiskSlider()}
            </View>
        );
    };

    const renderHistoryTab = () => {
        return (
            <View style={styles.tabContent}>
                {renderHistoryChart()}
            </View>
        );
    };

    const renderActionTab = () => {
        return (
            <View style={styles.tabContent}>
                {renderRecommendations()}

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('HealthDataInput', { factorId: factorData?.id })}
                >
                    <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Add New Measurement</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('RiskActionPlan', { factorId: factorData?.id })}
                >
                    <Ionicons name="list" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>View Action Plan</Text>
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

    if (!factorData) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Error loading risk factor data</Text>
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
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <View style={[
                    styles.riskBadge,
                    { backgroundColor: getRiskLevelColor(factorData.riskLevel) }
                ]}>
                    <Text style={styles.riskBadgeText}>
                        {factorData.riskLevel.charAt(0).toUpperCase() + factorData.riskLevel.slice(1)} Risk
                    </Text>
                </View>
                <Text style={styles.headerTitle}>{factorData.name}</Text>
                <Text style={styles.headerSubtitle}>Last updated: {formatDate(factorData.lastUpdated)}</Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.sectionTitle}>About This Factor</Text>
                <Text style={styles.description}>{factorData.description}</Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Your Status</Text>
                <View style={styles.statusContainer}>
                    <View style={styles.statusItem}>
                        <Text style={styles.statusLabel}>Current Value</Text>
                        <Text style={styles.statusValue}>
                            {factorData.currentValue}
                            {factorData.unit ? ` ${factorData.unit}` : ''}
                        </Text>
                    </View>
                    <View style={styles.statusDivider} />
                    <View style={styles.statusItem}>
                        <Text style={styles.statusLabel}>Normal Range</Text>
                        <Text style={styles.statusValue}>{factorData.normalRange}</Text>
                    </View>
                </View>
                <View style={styles.impactContainer}>
                    <Ionicons name="information-circle" size={20} color="#2684FF" />
                    <Text style={styles.impactText}>{factorData.impactDescription}</Text>
                </View>
            </View>

            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Recommended Actions</Text>
                {factorData.recommendedActions.map((action, index) => (
                    <View key={index} style={styles.actionItem}>
                        <View style={styles.actionBullet}>
                            <Text style={styles.actionNumber}>{index + 1}</Text>
                        </View>
                        <Text style={styles.actionText}>{action}</Text>
                    </View>
                ))}
            </View>

            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Additional Resources</Text>
                {factorData.resources.map((resource, index) => (
                    <TouchableOpacity 
                        key={index}
                        style={styles.resourceItem}
                        onPress={() => console.log(`Opening URL: ${resource.url}`)}
                    >
                        <Ionicons name="link" size={20} color="#2684FF" />
                        <Text style={styles.resourceText}>{resource.title}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity
                style={styles.trackButton}
                onPress={() => navigation.navigate('HealthDataTab')}
            >
                <Text style={styles.trackButtonText}>Track This Measurement</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F4F5F7',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F4F5F7',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#F4F5F7',
    },
    errorText: {
        fontSize: 16,
        color: '#5E6C84',
        marginBottom: 20,
    },
    header: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        paddingTop: 60,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#DFE1E6',
    },
    riskBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginBottom: 16,
    },
    riskBadgeText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#172B4D',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#5E6C84',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
        margin: 16,
        marginTop: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#172B4D',
        marginBottom: 16,
    },
    description: {
        fontSize: 16,
        lineHeight: 24,
        color: '#172B4D',
    },
    statusContainer: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    statusItem: {
        flex: 1,
        alignItems: 'center',
    },
    statusDivider: {
        width: 1,
        backgroundColor: '#DFE1E6',
        marginHorizontal: 16,
    },
    statusLabel: {
        fontSize: 14,
        color: '#5E6C84',
        marginBottom: 8,
    },
    statusValue: {
        fontSize: 18,
        fontWeight: '600',
        color: '#172B4D',
    },
    impactContainer: {
        backgroundColor: '#DEEBFF',
        borderRadius: 8,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    impactText: {
        flex: 1,
        fontSize: 14,
        color: '#172B4D',
        marginLeft: 8,
        lineHeight: 20,
    },
    actionItem: {
        flexDirection: 'row',
        marginBottom: 16,
        alignItems: 'flex-start',
    },
    actionBullet: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#DEEBFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        marginTop: 2,
    },
    actionNumber: {
        fontSize: 12,
        fontWeight: '600',
        color: '#2684FF',
    },
    actionText: {
        flex: 1,
        fontSize: 16,
        color: '#172B4D',
        lineHeight: 24,
    },
    resourceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#F4F5F7',
        borderRadius: 8,
        marginBottom: 8,
    },
    resourceText: {
        flex: 1,
        fontSize: 14,
        color: '#2684FF',
        marginLeft: 8,
    },
    trackButton: {
        backgroundColor: '#2684FF',
        borderRadius: 4,
        padding: 16,
        margin: 16,
        marginTop: 8,
        alignItems: 'center',
    },
    trackButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    button: {
        backgroundColor: '#2684FF',
        borderRadius: 4,
        padding: 12,
        width: 120,
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '500',
    },
    sliderContainer: {
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
    sliderTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#172B4D',
        marginBottom: 8
    },
    sliderSubtitle: {
        fontSize: 14,
        color: '#5E6C84',
        marginBottom: 16
    },
    sliderSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16
    },
    sliderTrack: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
        position: 'relative'
    },
    sliderGradient: {
        height: '100%',
        width: '100%',
        borderRadius: 4
    },
    sliderHandle: {
        position: 'absolute',
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#2684FF',
        top: -11,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3
    },
    sliderEndText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#5E6C84',
        width: 50,
        textAlign: 'center'
    },
    sliderInfo: {
        minHeight: 80,
        padding: 12,
        backgroundColor: '#F4F5F7',
        borderRadius: 4,
    },
    sliderInfoContent: {
        alignItems: 'center'
    },
    sliderInfoTitle: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 8,
        textAlign: 'center'
    },
    sliderInfoText: {
        fontSize: 14,
        lineHeight: 20,
        color: '#172B4D',
        textAlign: 'center'
    },
    historyContainer: {
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
    historyTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#172B4D',
        marginBottom: 16
    },
    chartLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 30,
        marginTop: 4
    },
    dateLabel: {
        fontSize: 12,
        color: '#5E6C84',
        textAlign: 'center'
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
    recommendationsTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#172B4D',
        marginBottom: 16
    },
    recommendationItem: {
        flexDirection: 'row',
        marginBottom: 12
    },
    bulletText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600'
    },
    recommendationText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
        color: '#172B4D'
    },
    actionButton: {
        backgroundColor: '#2684FF',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 4,
        paddingVertical: 12,
        marginBottom: 12
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '500',
        marginLeft: 8
    },
});

export default RiskFactorDetailScreen; 