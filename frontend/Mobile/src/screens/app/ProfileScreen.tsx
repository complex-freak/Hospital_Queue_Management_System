import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    TextInput,
    Alert,
    Platform,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Camera } from 'expo-camera';
import { CameraType } from 'expo-camera/build/Camera.types';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useNavigation } from '@react-navigation/native';
import authService from '../../services/authService';

// Add Camera constants for compatibility
const CameraConstants = {
    Type: {
        front: 'front' as const,
        back: 'back' as const
    }
};

interface UserProfile {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    dateOfBirth: string;
    gender: string;
    profilePicture: string | null;
    medicalId: string;
    emergencyContact: {
        name: string;
        relationship: string;
        phoneNumber: string;
    };
}

const ProfileScreen: React.FC = () => {
    const navigation = useNavigation();
    const [profile, setProfile] = useState<UserProfile>({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        dateOfBirth: '',
        gender: '',
        profilePicture: null,
        medicalId: '',
        emergencyContact: {
            name: '',
            relationship: '',
            phoneNumber: '',
        }
    });

    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [cameraVisible, setCameraVisible] = useState(false);
    const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
    const [mediaPermission, setMediaPermission] = useState<boolean | null>(null);
    const [cameraType, setCameraType] = useState<'front' | 'back'>('front');

    const cameraRef = React.useRef<any>(null);

    // Load user profile on component mount
    useEffect(() => {
        requestPermissions();
        loadUserProfile();
    }, []);

    // Request required permissions
    const requestPermissions = async () => {
        const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
        setCameraPermission(cameraStatus === 'granted');

        const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();
        setMediaPermission(mediaStatus === 'granted');
    };

    // Load user profile from storage
    const loadUserProfile = async () => {
        try {
            const savedProfile = await AsyncStorage.getItem('userProfile');

            if (savedProfile) {
                setProfile(JSON.parse(savedProfile));
            } else {
                // Mock data for demo purposes
                setProfile({
                    firstName: 'Witness',
                    lastName: 'Reuben',
                    email: 'witnessreuben@gmail.com',
                    phoneNumber: '+255 623 753 648',
                    dateOfBirth: '03/10/2001',
                    gender: 'Female',
                    profilePicture: null,
                    medicalId: 'MED12345',
                    emergencyContact: {
                        name: 'Zephlin Reuben',
                        relationship: 'Sibling',
                        phoneNumber: '+255 755 899 720',
                    }
                });
            }
            setIsLoading(false);
        } catch (error) {
            console.error('Error loading user profile:', error);
            setIsLoading(false);
        }
    };

    // Save user profile to storage
    const saveUserProfile = async (updatedProfile: UserProfile) => {
        try {
            await AsyncStorage.setItem('userProfile', JSON.stringify(updatedProfile));
            setProfile(updatedProfile);
        } catch (error) {
            console.error('Error saving user profile:', error);
            Alert.alert('Error', 'Failed to save profile changes.');
        }
    };

    // Handle input change
    const handleInputChange = (field: keyof UserProfile, value: string) => {
        setProfile(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Handle emergency contact input change
    const handleEmergencyContactChange = (field: keyof UserProfile['emergencyContact'], value: string) => {
        setProfile(prev => ({
            ...prev,
            emergencyContact: {
                ...prev.emergencyContact,
                [field]: value
            }
        }));
    };

    // Toggle edit mode
    const toggleEditMode = () => {
        if (isEditing) {
            // Save changes
            saveUserProfile(profile);
        }

        setIsEditing(!isEditing);
    };

    // Show photo options dialog
    const showPhotoOptions = () => {
        if (!cameraPermission || !mediaPermission) {
            Alert.alert(
                'Permission Required',
                'Camera and media library permissions are required to change your profile photo.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Settings', onPress: requestPermissions }
                ]
            );
            return;
        }

        Alert.alert(
            'Change Profile Photo',
            'Choose an option',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Take Photo', onPress: () => setCameraVisible(true) },
                { text: 'Choose from Library', onPress: pickImageFromLibrary }
            ]
        );
    };

    // Pick image from library
    const pickImageFromLibrary = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets[0]) {
                const manipResult = await manipulateAsync(
                    result.assets[0].uri,
                    [{ resize: { width: 300, height: 300 } }],
                    { format: SaveFormat.JPEG, compress: 0.8 }
                );

                setProfile(prev => ({
                    ...prev,
                    profilePicture: manipResult.uri
                }));

                // Save the updated profile
                saveUserProfile({
                    ...profile,
                    profilePicture: manipResult.uri
                });
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to select image.');
        }
    };

    // Capture photo from camera
    const takePicture = async () => {
        // Using ImagePicker instead since Camera component is having issues
        try {
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets[0]) {
            const manipResult = await manipulateAsync(
                    result.assets[0].uri,
                [{ resize: { width: 300, height: 300 } }],
                { format: SaveFormat.JPEG, compress: 0.8 }
            );

            setCameraVisible(false);

            setProfile(prev => ({
                ...prev,
                profilePicture: manipResult.uri
            }));

            // Save the updated profile
            saveUserProfile({
                ...profile,
                profilePicture: manipResult.uri
            });

            // Save to media library
            if (Platform.OS !== 'web' && mediaPermission) {
                await MediaLibrary.saveToLibraryAsync(manipResult.uri);
                }
            }
        } catch (error) {
            console.error('Error taking picture:', error);
            Alert.alert('Error', 'Failed to capture photo.');
        }
    };

    // Handle logout
    const handleLogout = async () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to log out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Show loading indicator
                            setIsLoading(true);
                            
                            // Call auth service to logout
                            await authService.logout();
                            
                            // The parent navigator will detect auth state change
                            // and automatically show login screen
                            setIsLoading(false);
                        } catch (error) {
                            console.error('Error logging out:', error);
                            Alert.alert('Error', 'Failed to log out. Please try again.');
                            setIsLoading(false);
                        }
                    }
                }
            ]
        );
    };

    // Render input field
    const renderInputField = (label: string, field: keyof UserProfile, placeholder: string, keyboardType: 'default' | 'email-address' | 'phone-pad' | 'numeric' = 'default') => {
        return (
            <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{label}</Text>
                {isEditing ? (
                    <TextInput
                        style={styles.textInput}
                        value={profile[field] as string}
                        onChangeText={(text) => handleInputChange(field, text)}
                        placeholder={placeholder}
                        keyboardType={keyboardType}
                        placeholderTextColor="#97A0AF"
                    />
                ) : (
                    <Text style={styles.infoText}>{profile[field] as string || 'Not provided'}</Text>
                )}
            </View>
        );
    };

    // Render emergency contact input field
    const renderEmergencyContactField = (label: string, field: keyof UserProfile['emergencyContact'], placeholder: string, keyboardType: 'default' | 'phone-pad' = 'default') => {
        return (
            <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{label}</Text>
                {isEditing ? (
                    <TextInput
                        style={styles.textInput}
                        value={profile.emergencyContact[field]}
                        onChangeText={(text) => handleEmergencyContactChange(field, text)}
                        placeholder={placeholder}
                        keyboardType={keyboardType}
                        placeholderTextColor="#97A0AF"
                    />
                ) : (
                    <Text style={styles.infoText}>{profile.emergencyContact[field] || 'Not provided'}</Text>
                )}
            </View>
        );
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2684FF" />
                <Text style={styles.loadingText}>Loading profile...</Text>
            </View>
        );
    }

    if (cameraVisible) {
        return (
            <View style={styles.cameraContainer}>
                <View style={styles.camera}>
                    <View style={styles.cameraControls}>
                        <TouchableOpacity
                            style={styles.cameraButton}
                            onPress={() => setCameraVisible(false)}
                        >
                            <Ionicons name="close" size={24} color="#FFFFFF" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.cameraButton}
                            onPress={() => {
                                setCameraType(
                                    cameraType === CameraConstants.Type.front
                                        ? CameraConstants.Type.back
                                        : CameraConstants.Type.front
                                );
                            }}
                        >
                            <Ionicons name="camera-reverse" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>

                    {/* Camera overlay */}
                    <View style={styles.cameraOverlay}>
                        <View style={styles.cameraFrame} />
                    </View>

                    <View style={styles.cameraBottomControls}>
                        <TouchableOpacity
                            style={styles.cameraCaptureButton}
                            onPress={() => Alert.alert("Camera", "Camera functionality needs to be fixed")}
                        >
                            <View style={styles.captureButtonInner} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>My Profile</Text>
                    <Text style={styles.headerSubtitle}>Manage your account information</Text>
                </View>
                <TouchableOpacity onPress={toggleEditMode} style={styles.editButton}>
                    <Ionicons name={isEditing ? "checkmark" : "create-outline"} size={20} color="#2684FF" />
                </TouchableOpacity>
            </View>

            <View style={styles.profileImageContainer}>
                <TouchableOpacity onPress={showPhotoOptions} disabled={!isEditing}>
                    {profile.profilePicture ? (
                        <Image
                            source={{ uri: profile.profilePicture }}
                            style={styles.profileImage}
                        />
                    ) : (
                        <View style={styles.profileImagePlaceholder}>
                            <Ionicons name="person" size={64} color="#97A0AF" />
                        </View>
                    )}
                    {isEditing && (
                        <View style={styles.cameraIconContainer}>
                            <Ionicons name="camera" size={20} color="#FFFFFF" />
                        </View>
                    )}
                </TouchableOpacity>
                <Text style={styles.userName}>
                    {profile.firstName} {profile.lastName}
                </Text>
                <Text style={styles.userMedicalId}>Medical ID: {profile.medicalId}</Text>
            </View>

            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Personal Information</Text>
                <View style={styles.infoContainer}>
                    {renderInputField('First Name', 'firstName', 'Enter first name')}
                    {renderInputField('Last Name', 'lastName', 'Enter last name')}
                    {renderInputField('Email', 'email', 'Enter email address', 'email-address')}
                    {renderInputField('Phone Number', 'phoneNumber', 'Enter phone number', 'phone-pad')}
                    {renderInputField('Date of Birth', 'dateOfBirth', 'MM/DD/YYYY')}
                    {renderInputField('Gender', 'gender', 'Enter gender')}
                </View>
            </View>

            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Emergency Contact</Text>
                <View style={styles.infoContainer}>
                    {renderEmergencyContactField('Name', 'name', 'Enter contact name')}
                    {renderEmergencyContactField('Relationship', 'relationship', 'Enter relationship')}
                    {renderEmergencyContactField('Phone Number', 'phoneNumber', 'Enter phone number', 'phone-pad')}
                </View>
            </View>

            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Account Settings</Text>
                <View style={styles.infoContainer}>
                    <TouchableOpacity style={styles.settingsButton}>
                        <Ionicons name="shield-checkmark-outline" size={24} color="#2684FF" style={styles.settingsIcon} />
                        <Text style={styles.settingsText}>Privacy Settings</Text>
                        <Ionicons name="chevron-forward" size={20} color="#97A0AF" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.settingsButton}>
                        <Ionicons name="notifications-outline" size={24} color="#2684FF" style={styles.settingsIcon} />
                        <Text style={styles.settingsText}>Notification Preferences</Text>
                        <Ionicons name="chevron-forward" size={20} color="#97A0AF" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.settingsButton}>
                        <Ionicons name="lock-closed-outline" size={24} color="#2684FF" style={styles.settingsIcon} />
                        <Text style={styles.settingsText}>Change Password</Text>
                        <Ionicons name="chevron-forward" size={20} color="#97A0AF" />
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.settingsButton, styles.logoutButton]}
                        onPress={handleLogout}
                    >
                        <Ionicons name="log-out-outline" size={24} color="#FF5630" style={styles.settingsIcon} />
                        <Text style={styles.logoutText}>Log Out</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F4F5F7',
    },
    contentContainer: {
        paddingBottom: 40,
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
    editButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F4F5F7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileImageContainer: {
        alignItems: 'center',
        marginBottom: 24,
        marginTop: 20,
        paddingHorizontal: 20,
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#DFE1E6',
    },
    profileImagePlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#DFE1E6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraIconContainer: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#2684FF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#091E42',
        marginTop: 12,
        marginBottom: 4,
    },
    userMedicalId: {
        fontSize: 14,
        color: '#5E6C84',
    },
    sectionContainer: {
        marginBottom: 24,
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#091E42',
        marginBottom: 12,
    },
    infoContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
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
        marginBottom: 6,
        fontWeight: '500',
    },
    textInput: {
        height: 48,
        borderWidth: 1,
        borderColor: '#DFE1E6',
        borderRadius: 4,
        paddingHorizontal: 12,
        backgroundColor: '#FFFFFF',
        fontSize: 16,
        color: '#091E42',
    },
    infoText: {
        fontSize: 16,
        color: '#091E42',
        paddingVertical: 4,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F4F5F7',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#5E6C84',
    },
    settingsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F4F5F7',
    },
    settingsIcon: {
        marginRight: 16,
    },
    settingsText: {
        flex: 1,
        fontSize: 16,
        color: '#091E42',
    },
    logoutButton: {
        borderBottomWidth: 0,
        marginTop: 8,
    },
    logoutText: {
        flex: 1,
        fontSize: 16,
        color: '#FF5630',
        fontWeight: '500',
    },
    cameraContainer: {
        flex: 1,
        backgroundColor: 'black',
    },
    camera: {
        flex: 1,
        justifyContent: 'space-between',
    },
    cameraControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 20,
    },
    cameraButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraBottomControls: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    cameraCaptureButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureButtonInner: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: '#FFFFFF',
    },
    cameraOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraFrame: {
        width: 250,
        height: 250,
        borderRadius: 125,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        borderStyle: 'dashed',
    },
});

export default ProfileScreen; 