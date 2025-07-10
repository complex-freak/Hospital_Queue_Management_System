import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
    ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

// Import auth service
import authService, { AuthError } from '../../services/authService';

const LoginScreen = () => {
    const navigation = useNavigation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [generalError, setGeneralError] = useState('');

    // For demo purposes, auto-fill with test credentials
    const fillTestCredentials = () => {
        setEmail('witnessreuben6@gmail.com');
        setPassword('password123');
        // Clear any errors
        setEmailError('');
        setPasswordError('');
        setGeneralError('');
    };

    const validateEmail = (email: string): boolean => {
        const re = /\S+@\S+\.\S+/;
        const isValid = re.test(email);
        setEmailError(isValid ? '' : 'Please enter a valid email address');
        return isValid;
    };

    const validatePassword = (password: string): boolean => {
        const isValid = password.length >= 6;
        setPasswordError(isValid ? '' : 'Password must be at least 6 characters');
        return isValid;
    };

    const handleLogin = async () => {
        // Clear any previous general error
        setGeneralError('');
        
        // Validate inputs
        const isEmailValid = validateEmail(email);
        const isPasswordValid = validatePassword(password);

        if (!isEmailValid || !isPasswordValid) {
            return;
        }

        setIsLoading(true);

        try {
            // Call the auth service login method
            await authService.login({ email, password });
            setIsLoading(false);
            
            // This will automatically switch to the main app flow
            // The parent navigator will detect authentication and show main tabs
            await authService.isAuthenticated(); // Refresh authentication state
        } catch (error) {
            setIsLoading(false);
            
            // Handle different types of errors
            const authError = error as AuthError;
            
            if (authError.message.includes('Invalid email or password')) {
                setGeneralError('Invalid email or password. Please try again.');
            } else if (authError.message.includes('network')) {
                setGeneralError('Network error. Please check your connection and try again.');
            } else {
                setGeneralError(authError.message || 'An unexpected error occurred. Please try again.');
            }
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.logoContainer}>
                    {/* App logo placeholder */}
                    <View style={styles.logoPlaceholder}>
                        <Text style={styles.logoText}>CVD</Text>
                    </View>
                    <Text style={styles.appName}>Cardiovascular Disease Diagnosis</Text>
                </View>

                <View style={styles.formContainer}>
                    <Text style={styles.welcomeText}>Welcome back!</Text>
                    <Text style={styles.subtitle}>Sign in to your patient account</Text>

                    {/* Display general error message if any */}
                    {generalError ? (
                        <View style={styles.errorContainer}>
                            <Text style={styles.generalErrorText}>{generalError}</Text>
                        </View>
                    ) : null}

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={[styles.input, emailError ? styles.inputError : null]}
                            placeholder="your.email@example.com"
                            placeholderTextColor="#A5ADBA"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            value={email}
                            onChangeText={(text) => {
                                setEmail(text);
                                if (emailError) validateEmail(text);
                                if (generalError) setGeneralError('');
                            }}
                            onBlur={() => validateEmail(email)}
                        />
                        {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            style={[styles.input, passwordError ? styles.inputError : null]}
                            placeholder="Your password"
                            placeholderTextColor="#A5ADBA"
                            secureTextEntry
                            value={password}
                            onChangeText={(text) => {
                                setPassword(text);
                                if (passwordError) validatePassword(text);
                                if (generalError) setGeneralError('');
                            }}
                            onBlur={() => validatePassword(password)}
                        />
                        {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
                    </View>

                    <TouchableOpacity
                        style={styles.forgotPasswordContainer}
                        onPress={() => navigation.navigate('ForgotPassword' as never)}
                    >
                        <Text style={styles.forgotPasswordText}>Forgot your password?</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                        onPress={handleLogin}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Text style={styles.loginButtonText}>Log In</Text>
                        )}
                    </TouchableOpacity>

                    {/* Test credentials button */}
                    {/* <TouchableOpacity
                        style={styles.testCredentialsButton}
                        onPress={fillTestCredentials}
                    >
                        <Text style={styles.testCredentialsText}>Use Test Credentials</Text>
                    </TouchableOpacity> */}

                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>or</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    <TouchableOpacity
                        style={styles.registerButton}
                        onPress={() => navigation.navigate('Registration' as never)}
                    >
                        <Text style={styles.registerButtonText}>Create a new account</Text>
                    </TouchableOpacity>
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
        justifyContent: 'center',
        padding: 20,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: '#2684FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    logoText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'white',
    },
    appName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#091E42',
        textAlign: 'center',
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
    },
    welcomeText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#091E42',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#5E6C84',
        marginBottom: 24,
    },
    errorContainer: {
        backgroundColor: '#FFEBE6',
        borderRadius: 3,
        padding: 12,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#FF5630',
    },
    generalErrorText: {
        color: '#DE350B',
        fontSize: 14,
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
    forgotPasswordContainer: {
        alignItems: 'flex-end',
        marginBottom: 24,
    },
    forgotPasswordText: {
        fontSize: 14,
        color: '#0052CC',
    },
    loginButton: {
        height: 50,
        backgroundColor: '#0052CC',
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loginButtonDisabled: {
        backgroundColor: '#4C9AFF',
    },
    loginButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    testCredentialsButton: {
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
    },
    testCredentialsText: {
        color: '#0052CC',
        fontSize: 14,
        fontWeight: '500',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#DFE1E6',
    },
    dividerText: {
        paddingHorizontal: 16,
        color: '#5E6C84',
        fontSize: 14,
    },
    registerButton: {
        height: 50,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#0052CC',
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    registerButtonText: {
        color: '#0052CC',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default LoginScreen; 