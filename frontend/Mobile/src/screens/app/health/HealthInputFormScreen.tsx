import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Switch,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Slider from '@react-native-community/slider';
import DateTimePicker from '@react-native-community/datetimepicker';

// Define types for our form data
interface HealthData {
    systolicBP: string;
    diastolicBP: string;
    heartRate: string;
    weight: string;
    height: string;
    glucoseLevel: string;
    cholesterolTotal: string;
    cholesterolLDL: string;
    cholesterolHDL: string;
    triglycerides: string;
    medication: string;
    smokingStatus: boolean;
    alcoholConsumption: string;
    physicalActivity: number; // hours per week
    lastCheckupDate: Date;
    symptoms: string;
}

const HealthInputFormScreen: React.FC = () => {
    const navigation = useNavigation();
    const [currentTab, setCurrentTab] = useState<'vitals' | 'lifestyle' | 'medical'>('vitals');
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Initialize form data with empty values
    const [healthData, setHealthData] = useState<HealthData>({
        systolicBP: '',
        diastolicBP: '',
        heartRate: '',
        weight: '',
        height: '',
        glucoseLevel: '',
        cholesterolTotal: '',
        cholesterolLDL: '',
        cholesterolHDL: '',
        triglycerides: '',
        medication: '',
        smokingStatus: false,
        alcoholConsumption: '',
        physicalActivity: 2.5,
        lastCheckupDate: new Date(),
        symptoms: '',
    });

    // Handle form changes
    const handleInputChange = (field: keyof HealthData, value: string | boolean | number | Date) => {
        setHealthData(prevData => ({
            ...prevData,
            [field]: value
        }));
    };

    // Submit form data
    const handleSubmit = () => {
        // Validate form data
        if (!validateForm()) {
            return;
        }

        // In a real app, this would send the data to your backend
        console.log('Submitting health data:', healthData);

        // Show success message
        Alert.alert(
            'Data Saved',
            'Your health data has been successfully recorded.',
            [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]
        );
    };

    // Form validation
    const validateForm = () => {
        // Basic validation example - would be more robust in production
        if (!healthData.systolicBP || !healthData.diastolicBP) {
            Alert.alert('Missing Data', 'Please enter your blood pressure readings.');
            return false;
        }

        // Add more validation as needed
        return true;
    };

    // Render input field with label
    const renderInputField = (label: string, field: keyof HealthData, placeholder: string, keyboardType: 'default' | 'numeric' = 'numeric', unit?: string) => {
        return (
            <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{label}</Text>
                <View style={styles.inputWrapper}>
                    <TextInput
                        style={styles.textInput}
                        value={healthData[field] as string}
                        onChangeText={(text) => handleInputChange(field, text)}
                        placeholder={placeholder}
                        keyboardType={keyboardType}
                        returnKeyType="next"
                        placeholderTextColor="#97A0AF"
                    />
                    {unit && <Text style={styles.unitText}>{unit}</Text>}
                </View>
            </View>
        );
    };

    // Render date picker
    const renderDatePicker = () => {
        return (
            <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Last Medical Checkup</Text>
                <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setShowDatePicker(true)}
                >
                    <Text style={styles.dateText}>
                        {healthData.lastCheckupDate.toLocaleDateString()}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color="#2684FF" />
                </TouchableOpacity>

                {showDatePicker && (
                    <DateTimePicker
                        value={healthData.lastCheckupDate}
                        mode="date"
                        display="default"
                        onChange={(event, selectedDate) => {
                            setShowDatePicker(false);
                            if (selectedDate) {
                                handleInputChange('lastCheckupDate', selectedDate);
                            }
                        }}
                    />
                )}
            </View>
        );
    };

    // Render vitals tab content
    const renderVitalsTab = () => {
        return (
            <View>
                <View style={styles.inputRow}>
                    {renderInputField('Systolic BP', 'systolicBP', '120', 'numeric', 'mmHg')}
                    {renderInputField('Diastolic BP', 'diastolicBP', '80', 'numeric', 'mmHg')}
                </View>
                {renderInputField('Heart Rate', 'heartRate', '75', 'numeric', 'bpm')}
                <View style={styles.inputRowWithGap}>
                    {renderInputField('Weight', 'weight', '70', 'numeric', 'kg')}
                    {renderInputField('Height', 'height', '170', 'numeric', 'cm')}
                </View>
                {renderInputField('Blood Glucose', 'glucoseLevel', '100', 'numeric', 'mg/dL')}
            </View>
        );
    };

    // Render lifestyle tab content
    const renderLifestyleTab = () => {
        return (
            <View>
                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Do you smoke?</Text>
                    <Switch
                        value={healthData.smokingStatus}
                        onValueChange={(value) => handleInputChange('smokingStatus', value)}
                        trackColor={{ false: '#D8D8D8', true: '#2684FF' }}
                        thumbColor={healthData.smokingStatus ? '#FFFFFF' : '#FFFFFF'}
                    />
                </View>

                {renderInputField('Alcohol Consumption', 'alcoholConsumption', 'Drinks per week', 'numeric')}

                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Physical Activity (hours/week): {healthData.physicalActivity}</Text>
                    <Slider
                        style={styles.slider}
                        minimumValue={0}
                        maximumValue={14}
                        step={0.5}
                        value={healthData.physicalActivity}
                        onValueChange={(value) => handleInputChange('physicalActivity', value)}
                        minimumTrackTintColor="#2684FF"
                        maximumTrackTintColor="#D8D8D8"
                    />
                    <View style={styles.sliderLabels}>
                        <Text style={styles.sliderLabel}>Low</Text>
                        <Text style={styles.sliderLabel}>High</Text>
                    </View>
                </View>
            </View>
        );
    };

    // Render medical tab content
    const renderMedicalTab = () => {
        return (
            <View>
                {renderInputField('Total Cholesterol', 'cholesterolTotal', '200', 'numeric', 'mg/dL')}
                {renderInputField('LDL Cholesterol', 'cholesterolLDL', '100', 'numeric', 'mg/dL')}
                {renderInputField('HDL Cholesterol', 'cholesterolHDL', '50', 'numeric', 'mg/dL')}
                {renderInputField('Triglycerides', 'triglycerides', '150', 'numeric', 'mg/dL')}
                {renderInputField('Current Medications', 'medication', 'List medications...', 'default')}
                {renderDatePicker()}
                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Symptoms (if any)</Text>
                    <TextInput
                        style={[styles.textInput, styles.textArea]}
                        value={healthData.symptoms}
                        onChangeText={(text) => handleInputChange('symptoms', text)}
                        placeholder="Describe any symptoms you're experiencing..."
                        multiline={true}
                        numberOfLines={4}
                        textAlignVertical="top"
                        placeholderTextColor="#97A0AF"
                    />
                </View>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={100}
        >
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <Text style={styles.title}>Health Data Input</Text>
                <Text style={styles.subtitle}>Enter your health metrics for accurate cardiovascular risk assessment</Text>

                {/* Tab navigation */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, currentTab === 'vitals' && styles.activeTab]}
                        onPress={() => setCurrentTab('vitals')}
                    >
                        <Ionicons
                            name="heart"
                            size={20}
                            color={currentTab === 'vitals' ? '#2684FF' : '#5E6C84'}
                        />
                        <Text style={[styles.tabText, currentTab === 'vitals' && styles.activeTabText]}>
                            Vitals
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tab, currentTab === 'lifestyle' && styles.activeTab]}
                        onPress={() => setCurrentTab('lifestyle')}
                    >
                        <Ionicons
                            name="bicycle"
                            size={20}
                            color={currentTab === 'lifestyle' ? '#2684FF' : '#5E6C84'}
                        />
                        <Text style={[styles.tabText, currentTab === 'lifestyle' && styles.activeTabText]}>
                            Lifestyle
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tab, currentTab === 'medical' && styles.activeTab]}
                        onPress={() => setCurrentTab('medical')}
                    >
                        <Ionicons
                            name="medical"
                            size={20}
                            color={currentTab === 'medical' ? '#2684FF' : '#5E6C84'}
                        />
                        <Text style={[styles.tabText, currentTab === 'medical' && styles.activeTabText]}>
                            Medical
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Tab content */}
                <View style={styles.formContainer}>
                    {currentTab === 'vitals' && renderVitalsTab()}
                    {currentTab === 'lifestyle' && renderLifestyleTab()}
                    {currentTab === 'medical' && renderMedicalTab()}
                </View>

                {/* Submit button */}
                <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                    <Text style={styles.submitButtonText}>Save Health Data</Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F4F5F7',
    },
    scrollContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#091E42',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#5E6C84',
        marginBottom: 20,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: '#2684FF',
    },
    tabText: {
        marginLeft: 4,
        fontSize: 14,
        color: '#5E6C84',
        fontWeight: '500',
    },
    activeTabText: {
        color: '#2684FF',
    },
    formContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    inputContainer: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        color: '#5E6C84',
        marginBottom: 8,
        fontWeight: '500',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    textInput: {
        flex: 1,
        height: 48,
        borderWidth: 1,
        borderColor: '#DFE1E6',
        borderRadius: 4,
        paddingHorizontal: 12,
        backgroundColor: '#FFFFFF',
        fontSize: 16,
        color: '#091E42',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
        paddingTop: 12,
    },
    unitText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#5E6C84',
    },
    inputRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    inputRowWithGap: {
        flexDirection: 'row',
        gap: 12,
    },
    datePickerButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 48,
        borderWidth: 1,
        borderColor: '#DFE1E6',
        borderRadius: 4,
        paddingHorizontal: 12,
        backgroundColor: '#FFFFFF',
    },
    dateText: {
        fontSize: 16,
        color: '#091E42',
    },
    slider: {
        width: '100%',
        height: 40,
    },
    sliderLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 10,
    },
    sliderLabel: {
        fontSize: 12,
        color: '#5E6C84',
    },
    submitButton: {
        backgroundColor: '#2684FF',
        borderRadius: 4,
        paddingVertical: 16,
        alignItems: 'center',
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default HealthInputFormScreen; 