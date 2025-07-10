import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
    ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const ForgotPasswordScreen = () => {
    const navigation = useNavigation();
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    // Form state
    const [email, setEmail] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Error state
    const [emailError, setEmailError] = useState('');
    const [codeError, setCodeError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [confirmPasswordError, setConfirmPasswordError] = useState('');

    // Validate email
    const validateEmail = () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email.trim()) {
            setEmailError('Email is required');
            return false;
        } else if (!emailRegex.test(email)) {
            setEmailError('Please enter a valid email address');
            return false;
        }
        setEmailError('');
        return true;
    };

    // Validate verification code
    const validateCode = () => {
        if (!verificationCode.trim()) {
            setCodeError('Verification code is required');
            return false;
        } else if (verificationCode.length !== 6) {
            setCodeError('Verification code must be 6 digits');
            return false;
        }
        setCodeError('');
        return true;
    };

    // Validate new password
    const validatePassword = () => {
        if (!newPassword) {
            setPasswordError('New password is required');
            return false;
        } else if (newPassword.length < 8) {
            setPasswordError('Password must be at least 8 characters');
            return false;
        }
        setPasswordError('');
        return true;
    };

    // Validate confirm password
    const validateConfirmPassword = () => {
        if (!confirmPassword) {
            setConfirmPasswordError('Please confirm your password');
            return false;
        } else if (newPassword !== confirmPassword) {
            setConfirmPasswordError('Passwords do not match');
            return false;
        }
        setConfirmPasswordError('');
        return true;
    };

    // Request password reset
    const handleRequestReset = async () => {
        if (validateEmail()) {
            setIsLoading(true);

            // Simulating API call
            setTimeout(() => {
                setIsLoading(false);
                setCurrentStep(2);
                Alert.alert(
                    'Verification Code Sent',
                    `A verification code has been sent to ${email}. Please check your email.`
                );
            }, 1500);

            // Actual implementation would be:
            // try {
            //   await authService.requestPasswordReset(email);
            //   setIsLoading(false);
            //   setCurrentStep(2);
            //   Alert.alert(
            //     'Verification Code Sent',
            //     `A verification code has been sent to ${email}. Please check your email.`
            //   );
            // } catch (error) {
            //   setIsLoading(false);
            //   Alert.alert('Error', error.message);
            // }
        }
    };

    // Verify code
    const handleVerifyCode = async () => {
        if (validateCode()) {
            setIsLoading(true);

            // Simulating API call
            setTimeout(() => {
                setIsLoading(false);
                setCurrentStep(3);
            }, 1500);

            // Actual implementation would be:
            // try {
            //   const isValid = await authService.verifyResetCode(email, verificationCode);
            //   setIsLoading(false);
            //   if (isValid) {
            //     setCurrentStep(3);
            //   } else {
            //     setCodeError('Invalid verification code');
            //   }
            // } catch (error) {
            //   setIsLoading(false);
            //   Alert.alert('Error', error.message);
            // }
        }
    };

    // Reset password
    const handleResetPassword = async () => {
        if (validatePassword() && validateConfirmPassword()) {
            setIsLoading(true);

            // Simulating API call
            setTimeout(() => {
                setIsLoading(false);
                Alert.alert(
                    'Password Reset Successful',
                    'Your password has been reset successfully. You can now log in with your new password.',
                    [
                        {
                            text: 'OK',
                            onPress: () => navigation.navigate('Login' as never)
                        }
                    ]
                );
            }, 1500);

            // Actual implementation would be:
            // try {
            //   await authService.resetPassword({
            //     email,
            //     code: verificationCode,
            //     newPassword
            //   });
            //   setIsLoading(false);
            //   Alert.alert(
            //     'Password Reset Successful',
            //     'Your password has been reset successfully. You can now log in with your new password.',
            //     [
            //       {
            //         text: 'OK',
            //         onPress: () => navigation.navigate('Login')
            //       }
            //     ]
            //   );
            // } catch (error) {
            //   setIsLoading(false);
            //   Alert.alert('Error', error.message);
            // }
        }
    };

    // Render step 1: Email input
    const renderEmailStep = () => (
        <>
            <Text style={styles.title}>Forgot Password</Text>
            <Text style={styles.subtitle}>
                Enter your email address and we'll send you a verification code to reset your password.
            </Text>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                    style={[styles.input, emailError ? styles.inputError : null]}
                    placeholder="your.email@example.com"
                    placeholderTextColor="#A5ADBA"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={(text) => {
                        setEmail(text);
                        if (emailError) validateEmail();
                    }}
                />
                {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
            </View>

            <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleRequestReset}
                disabled={isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                    <Text style={styles.buttonText}>Send Verification Code</Text>
                )}
            </TouchableOpacity>
        </>
    );

    // Render step 2: Verification code input
    const renderVerificationStep = () => (
        <>
            <Text style={styles.title}>Verify Code</Text>
            <Text style={styles.subtitle}>
                Enter the 6-digit verification code sent to {email}.
            </Text>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>Verification Code</Text>
                <TextInput
                    style={[styles.input, codeError ? styles.inputError : null]}
                    placeholder="123456"
                    placeholderTextColor="#A5ADBA"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={verificationCode}
                    onChangeText={(text) => {
                        setVerificationCode(text);
                        if (codeError) validateCode();
                    }}
                />
                {codeError ? <Text style={styles.errorText}>{codeError}</Text> : null}
            </View>

            <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleVerifyCode}
                disabled={isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                    <Text style={styles.buttonText}>Verify Code</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.resendContainer}
                onPress={handleRequestReset}
            >
                <Text style={styles.resendText}>Didn't receive a code? Resend</Text>
            </TouchableOpacity>
        </>
    );

    // Render step 3: New password input
    const renderNewPasswordStep = () => (
        <>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
                Create a new password for your account.
            </Text>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>New Password</Text>
                <TextInput
                    style={[styles.input, passwordError ? styles.inputError : null]}
                    placeholder="Enter new password"
                    placeholderTextColor="#A5ADBA"
                    secureTextEntry
                    value={newPassword}
                    onChangeText={(text) => {
                        setNewPassword(text);
                        if (passwordError) validatePassword();
                    }}
                />
                {passwordError ? (
                    <Text style={styles.errorText}>{passwordError}</Text>
                ) : (
                    <Text style={styles.hint}>Password must be at least 8 characters</Text>
                )}
            </View>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>Confirm New Password</Text>
                <TextInput
                    style={[styles.input, confirmPasswordError ? styles.inputError : null]}
                    placeholder="Confirm new password"
                    placeholderTextColor="#A5ADBA"
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={(text) => {
                        setConfirmPassword(text);
                        if (confirmPasswordError) validateConfirmPassword();
                    }}
                />
                {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}
            </View>

            <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleResetPassword}
                disabled={isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                    <Text style={styles.buttonText}>Reset Password</Text>
                )}
            </TouchableOpacity>
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
                        onPress={() => {
                            if (currentStep === 1) {
                                navigation.navigate('Login' as never);
                            } else {
                                setCurrentStep(currentStep - 1);
                            }
                        }}
                    >
                        <Text style={styles.backButtonText}>Back</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.cardContainer}>
                    {currentStep === 1 && renderEmailStep()}
                    {currentStep === 2 && renderVerificationStep()}
                    {currentStep === 3 && renderNewPasswordStep()}
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
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    backButton: {
        padding: 8,
    },
    backButtonText: {
        color: '#2684FF',
        fontSize: 16,
        fontWeight: '500',
    },
    cardContainer: {
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
    title: {
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
    hint: {
        color: '#5E6C84',
        fontSize: 12,
        marginTop: 4,
    },
    button: {
        backgroundColor: '#2684FF',
        height: 50,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    buttonDisabled: {
        backgroundColor: '#4C9AFF',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    resendContainer: {
        marginTop: 16,
        alignItems: 'center',
    },
    resendText: {
        color: '#2684FF',
        fontSize: 14,
        fontWeight: '500',
    },
});

export default ForgotPasswordScreen; 