import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import authService, { AuthError } from '../../services/authService';

// Step indicator component
interface StepIndicatorProps {
    currentStep: number;
    totalSteps: number;
}

const StepIndicator = ({ currentStep, totalSteps }: StepIndicatorProps) => {
    return (
        <View style={styles.stepIndicatorContainer}>
            {Array.from({ length: totalSteps }).map((_, index) => (
                <View
                    key={index}
                    style={[
                        styles.stepDot,
                        currentStep === index + 1 ? styles.activeDot : {}
                    ]}
                />
            ))}
        </View>
    );
};

const RegistrationScreen = () => {
    const navigation = useNavigation();
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        dateOfBirth: '',
        gender: '',
        phone: '',
    });

    // Error state
    const [errors, setErrors] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        dateOfBirth: '',
        gender: '',
        phone: '',
    });

    // Define form field type
    type FormField = keyof typeof formData;

    // Update form data
    const handleChange = (field: FormField, value: string) => {
        setFormData({
            ...formData,
            [field]: value
        });

        // Clear error when user types
        if (errors[field]) {
            setErrors({
                ...errors,
                [field]: ''
            });
        }
    };

    // Validate step 1: basic information
    const validateStep1 = () => {
        const newErrors = { ...errors };
        let isValid = true;

        if (!formData.firstName.trim()) {
            newErrors.firstName = 'First name is required';
            isValid = false;
        }

        if (!formData.lastName.trim()) {
            newErrors.lastName = 'Last name is required';
            isValid = false;
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
            isValid = false;
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email)) {
                newErrors.email = 'Please enter a valid email address';
                isValid = false;
            }
        }

        setErrors(newErrors);
        return isValid;
    };

    // Validate step 2: security information
    const validateStep2 = () => {
        const newErrors = { ...errors };
        let isValid = true;

        if (!formData.password) {
            newErrors.password = 'Password is required';
            isValid = false;
        } else if (formData.password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters';
            isValid = false;
        }

        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password';
            isValid = false;
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    // Validate step 3: personal details
    const validateStep3 = () => {
        const newErrors = { ...errors };
        let isValid = true;

        if (!formData.dateOfBirth) {
            newErrors.dateOfBirth = 'Date of birth is required';
            isValid = false;
        }

        if (!formData.gender) {
            newErrors.gender = 'Please select a gender';
            isValid = false;
        }

        // Phone is optional
        if (formData.phone && !/^\+?[0-9]{10,15}$/.test(formData.phone)) {
            newErrors.phone = 'Please enter a valid phone number';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    // Handle next step
    const handleNextStep = () => {
        if (currentStep === 1 && validateStep1()) {
            setCurrentStep(2);
        } else if (currentStep === 2 && validateStep2()) {
            setCurrentStep(3);
        }
    };

    // Handle previous step
    const handlePreviousStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    // Handle form submission
    const handleSubmit = async () => {
        if (validateStep3()) {
            setIsLoading(true);

            try {
                // Submit registration data using authService
                await authService.register({
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    email: formData.email,
                    password: formData.password,
                    dateOfBirth: formData.dateOfBirth,
                    gender: formData.gender,
                    phone: formData.phone
                });

                setIsLoading(false);
                
                // Show success message
                Alert.alert(
                    'Registration Successful',
                    'Your account has been created successfully. You can now log in with your credentials.',
                    [{
                        text: 'OK',
                        onPress: () => navigation.navigate('Login' as never)
                    }]
                );
            } catch (error) {
                setIsLoading(false);
                
                // Handle different registration errors
                const authError = error as AuthError;
                
                if (authError.message.includes('Email already registered')) {
                    setErrors({
                        ...errors,
                        email: 'This email is already registered. Please use a different email or try to log in.'
                    });
                    // Go back to step 1 to fix email
                    setCurrentStep(1);
                } else if (authError.message.includes('network')) {
                    Alert.alert(
                        'Network Error',
                        'Unable to connect to the server. Please check your internet connection and try again.',
                        [{ text: 'OK' }]
                    );
                } else {
                    Alert.alert(
                        'Registration Failed',
                        authError.message || 'An unexpected error occurred. Please try again.',
                        [{ text: 'OK' }]
                    );
                }
            }
        }
    };

    // Render step 1: basic information
    const renderStep1 = () => (
        <>
            <Text style={styles.stepTitle}>Create Your Account</Text>
            <Text style={styles.stepSubtitle}>Let's start with your basic information</Text>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>First Name</Text>
                <TextInput
                    style={[styles.input, errors.firstName ? styles.inputError : null]}
                    placeholder="John"
                    placeholderTextColor="#A5ADBA"
                    value={formData.firstName}
                    onChangeText={(text) => handleChange('firstName', text)}
                />
                {errors.firstName ? <Text style={styles.errorText}>{errors.firstName}</Text> : null}
            </View>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>Last Name</Text>
                <TextInput
                    style={[styles.input, errors.lastName ? styles.inputError : null]}
                    placeholder="Doe"
                    placeholderTextColor="#A5ADBA"
                    value={formData.lastName}
                    onChangeText={(text) => handleChange('lastName', text)}
                />
                {errors.lastName ? <Text style={styles.errorText}>{errors.lastName}</Text> : null}
            </View>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                    style={[styles.input, errors.email ? styles.inputError : null]}
                    placeholder="john.doe@example.com"
                    placeholderTextColor="#A5ADBA"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={formData.email}
                    onChangeText={(text) => handleChange('email', text)}
                />
                {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
            </View>
        </>
    );

    // Render step 2: security information
    const renderStep2 = () => (
        <>
            <Text style={styles.stepTitle}>Secure Your Account</Text>
            <Text style={styles.stepSubtitle}>Create a strong password to protect your account</Text>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                    style={[styles.input, errors.password ? styles.inputError : null]}
                    placeholder="Create a password"
                    placeholderTextColor="#A5ADBA"
                    secureTextEntry
                    value={formData.password}
                    onChangeText={(text) => handleChange('password', text)}
                />
                {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
                <Text style={styles.passwordHint}>Password must be at least 8 characters long</Text>
            </View>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>Confirm Password</Text>
                <TextInput
                    style={[styles.input, errors.confirmPassword ? styles.inputError : null]}
                    placeholder="Confirm your password"
                    placeholderTextColor="#A5ADBA"
                    secureTextEntry
                    value={formData.confirmPassword}
                    onChangeText={(text) => handleChange('confirmPassword', text)}
                />
                {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
            </View>
        </>
    );

    // Render step 3: personal details
    const renderStep3 = () => (
        <>
            <Text style={styles.stepTitle}>Personal Details</Text>
            <Text style={styles.stepSubtitle}>Tell us a bit more about yourself</Text>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>Date of Birth</Text>
                <TextInput
                    style={[styles.input, errors.dateOfBirth ? styles.inputError : null]}
                    placeholder="MM/DD/YYYY"
                    placeholderTextColor="#A5ADBA"
                    value={formData.dateOfBirth}
                    onChangeText={(text) => handleChange('dateOfBirth', text)}
                />
                {errors.dateOfBirth ? <Text style={styles.errorText}>{errors.dateOfBirth}</Text> : null}
            </View>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>Gender</Text>
                <View style={styles.genderContainer}>
                    {['Male', 'Female', 'Other'].map((gender) => (
                        <TouchableOpacity
                            key={gender}
                            style={[
                                styles.genderOption,
                                formData.gender === gender ? styles.genderOptionSelected : null
                            ]}
                            onPress={() => handleChange('gender', gender)}
                        >
                            <Text
                                style={[
                                    styles.genderText,
                                    formData.gender === gender ? styles.genderTextSelected : null
                                ]}
                            >
                                {gender}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                {errors.gender ? <Text style={styles.errorText}>{errors.gender}</Text> : null}
            </View>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>Phone Number (Optional)</Text>
                <TextInput
                    style={[styles.input, errors.phone ? styles.inputError : null]}
                    placeholder="+1 (123) 456-7890"
                    placeholderTextColor="#A5ADBA"
                    keyboardType="phone-pad"
                    value={formData.phone}
                    onChangeText={(text) => handleChange('phone', text)}
                />
                {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
            </View>
        </>
    );

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={currentStep === 1 ?
                            () => navigation.navigate('Login' as never) :
                            handlePreviousStep
                        }
                    >
                        <Text style={styles.backButtonText}>Back</Text>
                    </TouchableOpacity>
                    <StepIndicator currentStep={currentStep} totalSteps={3} />
                </View>

                <View style={styles.formContainer}>
                    {currentStep === 1 && renderStep1()}
                    {currentStep === 2 && renderStep2()}
                    {currentStep === 3 && renderStep3()}

                    <View style={styles.buttonContainer}>
                        {currentStep < 3 ? (
                            <TouchableOpacity
                                style={styles.primaryButton}
                                onPress={handleNextStep}
                            >
                                <Text style={styles.primaryButtonText}>Next</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
                                onPress={handleSubmit}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                ) : (
                                    <Text style={styles.primaryButtonText}>Create Account</Text>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>

                    {currentStep === 1 && (
                        <View style={styles.loginContainer}>
                            <Text style={styles.loginText}>Already have an account?</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Login' as never)}>
                                <Text style={styles.loginLink}>Log In</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F4F5F7',
    },
    scrollContent: {
        flexGrow: 1,
        padding: 20,
        justifyContent: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        width: '100%',
        maxWidth: 500,
        alignSelf: 'center',
    },
    backButton: {
        padding: 8,
    },
    backButtonText: {
        color: '#2684FF',
        fontSize: 16,
        fontWeight: '500',
    },
    stepIndicatorContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        flexGrow: 1,
    },
    stepDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#DFE1E6',
        marginHorizontal: 4,
    },
    activeDot: {
        backgroundColor: '#2684FF',
        width: 10,
        height: 10,
    },
    formContainer: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        alignSelf: 'center',
        width: '100%',
        maxWidth: 500,
    },
    stepTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#091E42',
        marginBottom: 8,
        textAlign: 'center',
    },
    stepSubtitle: {
        fontSize: 16,
        color: '#5E6C84',
        marginBottom: 24,
        textAlign: 'center',
    },
    inputContainer: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#42526E',
        marginBottom: 6,
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderColor: '#DFE1E6',
        borderRadius: 6,
        paddingHorizontal: 12,
        fontSize: 16,
        color: '#091E42',
        backgroundColor: '#FAFBFC',
    },
    inputError: {
        borderColor: '#FF5630',
    },
    errorText: {
        color: '#FF5630',
        fontSize: 12,
        marginTop: 4,
    },
    passwordHint: {
        color: '#5E6C84',
        fontSize: 12,
        marginTop: 4,
    },
    genderContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    genderOption: {
        flex: 1,
        height: 50,
        borderWidth: 1,
        borderColor: '#DFE1E6',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 6,
        marginHorizontal: 4,
    },
    genderOptionSelected: {
        borderColor: '#2684FF',
        backgroundColor: '#F0F7FF',
    },
    genderText: {
        color: '#42526E',
        fontSize: 16,
    },
    genderTextSelected: {
        color: '#2684FF',
        fontWeight: '500',
    },
    buttonContainer: {
        marginTop: 24,
        alignItems: 'center',
    },
    primaryButton: {
        backgroundColor: '#2684FF',
        height: 50,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        maxWidth: 300,
    },
    primaryButtonDisabled: {
        backgroundColor: '#4C9AFF',
    },
    primaryButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 24,
    },
    loginText: {
        color: '#5E6C84',
        fontSize: 14,
    },
    loginLink: {
        color: '#2684FF',
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 4,
    },
});

export default RegistrationScreen; 