import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    ScrollView,
    Alert,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// Import Camera only for type checking
import * as CameraModule from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

interface ScannedDocument {
    id: string;
    uri: string;
    name: string;
    date: Date;
    type: 'prescription' | 'labReport' | 'medicalRecord' | 'other';
}

const DocumentScannerScreen: React.FC = () => {
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [cameraVisible, setCameraVisible] = useState(false);
    const [type, setCameraType] = useState('back');
    const [flash, setFlash] = useState('off');
    const [capturing, setCapturing] = useState(false);
    const [scannedDocuments, setScannedDocuments] = useState<ScannedDocument[]>([]);
    const [currentDocumentType, setCurrentDocumentType] = useState<ScannedDocument['type']>('other');
    const [documentName, setDocumentName] = useState('');
    const [processing, setProcessing] = useState(false);

    const cameraRef = useRef<any>(null);

    // Request permissions on component mount
    useEffect(() => {
        (async () => {
            const { status: cameraStatus } = await CameraModule.Camera.requestCameraPermissionsAsync();
            const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();
            setHasPermission(cameraStatus === 'granted' && mediaStatus === 'granted');
        })();
    }, []);

    // Handle document type selection
    const selectDocumentType = (type: ScannedDocument['type']) => {
        setCurrentDocumentType(type);

        // Set a default name based on type
        switch (type) {
            case 'prescription':
                setDocumentName('Prescription');
                break;
            case 'labReport':
                setDocumentName('Lab Report');
                break;
            case 'medicalRecord':
                setDocumentName('Medical Record');
                break;
            default:
                setDocumentName('Medical Document');
        }

        setCameraVisible(true);
    };

    // Handle image capture
    const takePicture = async () => {
        if (!cameraRef.current) return;

        try {
            setCapturing(true);
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.8,
                skipProcessing: false,
            });

            // Process the image
            await processImage(photo.uri);
            setCameraVisible(false);
        } catch (error) {
            console.error('Error taking picture:', error);
            Alert.alert('Error', 'Failed to capture image. Please try again.');
        } finally {
            setCapturing(false);
        }
    };

    // Handle image processing
    const processImage = async (uri: string) => {
        try {
            setProcessing(true);

            // Apply image enhancement
            const enhancedImage = await manipulateAsync(
                uri,
                [{ resize: { width: 1000 } }],
                { compress: 0.8, format: SaveFormat.JPEG }
            );

            // In a real app, you might want to:
            // 1. Apply OCR to extract text
            // 2. Use ML to detect document edges and crop
            // 3. Apply contrast enhancement for text readability

            // For now, we'll just save the image
            const newDoc: ScannedDocument = {
                id: Date.now().toString(),
                uri: enhancedImage.uri,
                name: documentName || `Document-${new Date().toLocaleDateString()}`,
                date: new Date(),
                type: currentDocumentType,
            };

            setScannedDocuments(prev => [newDoc, ...prev]);

            // Save to media library
            if (Platform.OS !== 'web') {
                await MediaLibrary.saveToLibraryAsync(enhancedImage.uri);
            }

            Alert.alert('Success', 'Document scanned and saved successfully');
        } catch (error) {
            console.error('Error processing image:', error);
            Alert.alert('Error', 'Failed to process document. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    // Handle image picking from gallery
    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.8,
                allowsEditing: true,
            });

            if (!result.canceled && result.assets && result.assets[0]) {
                await processImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to select image. Please try again.');
        }
    };

    // Delete a document
    const deleteDocument = (id: string) => {
        Alert.alert(
            'Delete Document',
            'Are you sure you want to delete this document?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        setScannedDocuments(prev => prev.filter(doc => doc.id !== id));
                    }
                }
            ]
        );
    };

    // Get icon by document type
    const getDocumentTypeIcon = (type: ScannedDocument['type']) => {
        switch (type) {
            case 'prescription': return 'medical-outline';
            case 'labReport': return 'flask-outline';
            case 'medicalRecord': return 'document-text-outline';
            default: return 'document-outline';
        }
    };

    // Handle permissions not granted
    if (hasPermission === null) {
        return (
            <View style={styles.centeredContainer}>
                <ActivityIndicator size="large" color="#2684FF" />
                <Text style={styles.permissionText}>Requesting camera permissions...</Text>
            </View>
        );
    }

    if (hasPermission === false) {
        return (
            <View style={styles.centeredContainer}>
                <Ionicons name="camera-outline" size={64} color="#5E6C84" />
                <Text style={styles.permissionText}>
                    Camera access is required to scan documents.
                </Text>
                <TouchableOpacity
                    style={styles.permissionButton}
                    onPress={() => CameraModule.Camera.requestCameraPermissionsAsync()}
                >
                    <Text style={styles.permissionButtonText}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Camera view
    if (cameraVisible) {
        return (
            <View style={styles.cameraContainer}>
                <View style={styles.camera}>
                    <View style={styles.cameraControls}>
                        <TouchableOpacity
                            style={styles.cameraButton}
                            onPress={() => {
                                setCameraVisible(false);
                            }}
                        >
                            <Ionicons name="close" size={24} color="#FFFFFF" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.cameraButton}
                            onPress={() => {
                                setFlash(
                                    flash === 'off'
                                        ? 'on'
                                        : 'off'
                                );
                            }}
                        >
                            <Ionicons
                                name={flash === 'off' ? "flash-off" : "flash"}
                                size={24}
                                color="#FFFFFF"
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Document frame overlay */}
                    <View style={styles.documentOverlay}>
                        <View style={styles.documentCorner} />
                        <View style={[styles.documentCorner, styles.topRight]} />
                        <View style={[styles.documentCorner, styles.bottomLeft]} />
                        <View style={[styles.documentCorner, styles.bottomRight]} />
                    </View>

                    <View style={styles.cameraBottomControls}>
                        <TouchableOpacity
                            style={styles.cameraCaptureButton}
                            onPress={() => Alert.alert("Camera", "Camera functionality needs to be fixed")}
                            disabled={capturing}
                        >
                            {capturing ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <View style={styles.captureButtonInner} />
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.cameraButton} onPress={pickImage}>
                            <Ionicons name="images-outline" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    // Main document scanner screen
    return (
        <View style={styles.container}>
            {processing && (
                <View style={styles.processingOverlay}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                    <Text style={styles.processingText}>Processing document...</Text>
                </View>
            )}

            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <Text style={styles.title}>Scan Medical Documents</Text>
                <Text style={styles.subtitle}>
                    Use your camera to scan and store important medical documents
                </Text>

                {/* Document type selection */}
                <View style={styles.documentTypesContainer}>
                    <Text style={styles.sectionTitle}>Select Document Type to Scan</Text>

                    <View style={styles.documentTypeRow}>
                        {[
                            { type: 'prescription', label: 'Prescription', icon: 'medical-outline' },
                            { type: 'labReport', label: 'Lab Report', icon: 'flask-outline' },
                            { type: 'medicalRecord', label: 'Medical Record', icon: 'document-text-outline' },
                            { type: 'other', label: 'Other', icon: 'document-outline' }
                        ].map((item) => (
                            <TouchableOpacity
                                key={item.type}
                                style={styles.documentTypeButton}
                                onPress={() => selectDocumentType(item.type as ScannedDocument['type'])}
                            >
                                <View style={styles.documentTypeIcon}>
                                    <Ionicons name={item.icon as any} size={24} color="#2684FF" />
                                </View>
                                <Text style={styles.documentTypeLabel}>{item.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Scanned documents list */}
                <View style={styles.documentsContainer}>
                    <Text style={styles.sectionTitle}>Your Scanned Documents</Text>

                    {scannedDocuments.length === 0 ? (
                        <View style={styles.emptyDocuments}>
                            <Ionicons name="document-outline" size={48} color="#97A0AF" />
                            <Text style={styles.emptyDocumentsText}>
                                No documents scanned yet
                            </Text>
                            <Text style={styles.emptyDocumentsSubtext}>
                                Tap on a document type above to start scanning
                            </Text>
                        </View>
                    ) : (
                        scannedDocuments.map((doc) => (
                            <View key={doc.id} style={styles.documentItem}>
                                <Image source={{ uri: doc.uri }} style={styles.documentThumbnail} />
                                <View style={styles.documentInfo}>
                                    <Text style={styles.documentName}>{doc.name}</Text>
                                    <Text style={styles.documentDate}>
                                        {doc.date.toLocaleDateString()}
                                    </Text>
                                    <View style={styles.documentTypeTag}>
                                        <Ionicons
                                            name={getDocumentTypeIcon(doc.type)}
                                            size={14}
                                            color="#2684FF"
                                        />
                                        <Text style={styles.documentTypeText}>
                                            {doc.type.charAt(0).toUpperCase() + doc.type.slice(1)}
                                        </Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    style={styles.documentDeleteButton}
                                    onPress={() => deleteDocument(doc.id)}
                                >
                                    <Ionicons name="trash-outline" size={20} color="#FF5630" />
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>

            {!cameraVisible && (
                <TouchableOpacity
                    style={styles.floatingButton}
                    onPress={() => selectDocumentType('other')}
                >
                    <Ionicons name="camera" size={24} color="#FFFFFF" />
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F4F5F7',
    },
    scrollContainer: {
        padding: 20,
        paddingBottom: 100,
    },
    centeredContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    permissionText: {
        fontSize: 16,
        color: '#5E6C84',
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 24,
    },
    permissionButton: {
        backgroundColor: '#2684FF',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 4,
    },
    permissionButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '500',
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
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#091E42',
        marginBottom: 16,
    },
    documentTypesContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    documentTypeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
    },
    documentTypeButton: {
        alignItems: 'center',
        width: '22%',
    },
    documentTypeIcon: {
        width: 56,
        height: 56,
        borderRadius: 8,
        backgroundColor: '#DEEBFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    documentTypeLabel: {
        fontSize: 12,
        color: '#091E42',
        textAlign: 'center',
    },
    documentsContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    emptyDocuments: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    emptyDocumentsText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#091E42',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyDocumentsSubtext: {
        fontSize: 14,
        color: '#5E6C84',
        textAlign: 'center',
    },
    documentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F4F5F7',
    },
    documentThumbnail: {
        width: 56,
        height: 70,
        borderRadius: 4,
        backgroundColor: '#DFE1E6',
        marginRight: 16,
    },
    documentInfo: {
        flex: 1,
    },
    documentName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#091E42',
        marginBottom: 4,
    },
    documentDate: {
        fontSize: 14,
        color: '#5E6C84',
        marginBottom: 8,
    },
    documentTypeTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#DEEBFF',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    documentTypeText: {
        fontSize: 12,
        color: '#0052CC',
        marginLeft: 4,
    },
    documentDeleteButton: {
        padding: 8,
    },
    floatingButton: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#2684FF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    cameraContainer: {
        flex: 1,
    },
    camera: {
        flex: 1,
    },
    cameraControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 20,
    },
    cameraBottomControls: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        bottom: 30,
        left: 0,
        right: 0,
    },
    cameraButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        margin: 8,
    },
    cameraCaptureButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 30,
    },
    captureButtonInner: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: '#FFFFFF',
    },
    documentOverlay: {
        position: 'absolute',
        top: 100,
        left: 40,
        right: 40,
        bottom: 100,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        borderStyle: 'dashed',
        backgroundColor: 'transparent',
    },
    documentCorner: {
        position: 'absolute',
        top: -5,
        left: -5,
        width: 20,
        height: 20,
        borderTopWidth: 2,
        borderLeftWidth: 2,
        borderColor: '#FFFFFF',
    },
    topRight: {
        left: undefined,
        right: -5,
        borderLeftWidth: 0,
        borderRightWidth: 2,
    },
    bottomLeft: {
        top: undefined,
        bottom: -5,
        borderTopWidth: 0,
        borderBottomWidth: 2,
    },
    bottomRight: {
        top: undefined,
        left: undefined,
        bottom: -5,
        right: -5,
        borderTopWidth: 0,
        borderLeftWidth: 0,
        borderBottomWidth: 2,
        borderRightWidth: 2,
    },
    processingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    processingText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '500',
        marginTop: 16,
    },
});

export default DocumentScannerScreen; 