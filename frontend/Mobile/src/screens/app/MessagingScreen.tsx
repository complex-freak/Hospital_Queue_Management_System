import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Image,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute, NavigationProp, ParamListBase } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

interface Message {
    id: string;
    text: string;
    timestamp: number;
    sender: 'patient' | 'clinician';
    read: boolean;
    attachment?: {
        type: 'image' | 'document';
        uri: string;
        filename: string;
    };
}

interface Conversation {
    id: string;
    clinicianId: string;
    clinicianName: string;
    avatar: string | null;
    lastMessage: string;
    lastMessageTime: number;
    unreadCount: number;
    messages: Message[];
}

// Mock clinicians data
const mockClinicians = [
    {
        id: 'c1',
        name: 'Dr. Sarah Johnson',
        specialty: 'Cardiologist',
        avatar: null,
        available: true,
    },
    {
        id: 'c2',
        name: 'Dr. Michael Chen',
        specialty: 'General Practitioner',
        avatar: null,
        available: true,
    },
    {
        id: 'c3',
        name: 'Dr. Jessica Williams',
        specialty: 'Endocrinologist',
        avatar: null,
        available: false,
    }
];

// Generate mock conversation if none exists
const generateMockConversation = (clinicianId: string): Conversation => {
    const clinician = mockClinicians.find(c => c.id === clinicianId) || mockClinicians[0];

    return {
        id: `conv-${clinicianId}`,
        clinicianId: clinician.id,
        clinicianName: clinician.name,
        avatar: clinician.avatar,
        lastMessage: 'Hello, how can I help you today?',
        lastMessageTime: Date.now() - 24 * 60 * 60 * 1000, // 1 day ago
        unreadCount: 0,
        messages: [
            {
                id: '1',
                text: 'Hello, I\'m Dr. ' + clinician.name.split(' ')[1] + '. How can I help you today?',
                timestamp: Date.now() - 24 * 60 * 60 * 1000,
                sender: 'clinician',
                read: true
            }
        ]
    };
};

// Main messaging screen showing conversation list
export const MessagingListScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp<ParamListBase>>();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);

    // Load conversations from storage
    useEffect(() => {
        const loadConversations = async () => {
            try {
                const storedConversations = await AsyncStorage.getItem('conversations');

                if (storedConversations) {
                    setConversations(JSON.parse(storedConversations));
                } else {
                    // Create initial mock conversations
                    const initialConversations = mockClinicians.map(clinician =>
                        generateMockConversation(clinician.id)
                    );

                    setConversations(initialConversations);
                    await AsyncStorage.setItem('conversations', JSON.stringify(initialConversations));
                }
            } catch (error) {
                console.error('Error loading conversations:', error);
                Alert.alert('Error', 'Failed to load your conversations.');
            } finally {
                setLoading(false);
            }
        };

        loadConversations();
    }, []);

    // Format timestamp to readable time
    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();

        // If today, show time only
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        // If this year, show month and day
        if (date.getFullYear() === now.getFullYear()) {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }

        // Otherwise show date
        return date.toLocaleDateString();
    };

    // Open conversation
    const openConversation = (conversation: Conversation) => {
        // Mark messages as read
        const updatedConversation = {
            ...conversation,
            unreadCount: 0,
            messages: conversation.messages.map(msg => ({
                ...msg,
                read: true
            }))
        };

        // Update conversation list
        const updatedConversations = conversations.map(conv =>
            conv.id === conversation.id ? updatedConversation : conv
        );

        setConversations(updatedConversations);
        AsyncStorage.setItem('conversations', JSON.stringify(updatedConversations));

        // Navigate to conversation screen
        navigation.navigate('ConversationScreen', { conversationId: conversation.id });
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2684FF" />
                <Text style={styles.loadingText}>Loading messages...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Messages</Text>
                    <Text style={styles.headerSubtitle}>
                        Securely message your healthcare providers
                    </Text>
                </View>
                <TouchableOpacity style={styles.headerButton}>
                    <Ionicons name="information-circle-outline" size={24} color="#2684FF" />
                </TouchableOpacity>
            </View>

            <Text style={styles.subheaderText}>
                Securely message your healthcare providers about non-urgent matters.
                Expect responses within 24-48 hours.
            </Text>

            {conversations.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="chatbubble-ellipses-outline" size={64} color="#97A0AF" />
                    <Text style={styles.emptyTitle}>No Messages</Text>
                    <Text style={styles.emptyText}>
                        You don't have any messages yet. Start a conversation with your healthcare provider.
                    </Text>
                    <TouchableOpacity style={styles.newMessageButton}>
                        <Text style={styles.newMessageButtonText}>New Message</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={conversations}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.conversationItem}
                            onPress={() => openConversation(item)}
                        >
                            <View style={styles.avatarContainer}>
                                {item.avatar ? (
                                    <Image source={{ uri: item.avatar }} style={styles.avatar} />
                                ) : (
                                    <View style={styles.avatarPlaceholder}>
                                        <Text style={styles.avatarInitial}>
                                            {item.clinicianName.charAt(0)}
                                        </Text>
                                    </View>
                                )}
                                <View style={[
                                    styles.statusDot,
                                    mockClinicians.find(c => c.id === item.clinicianId)?.available
                                        ? styles.statusOnline
                                        : styles.statusOffline
                                ]} />
                            </View>

                            <View style={styles.conversationInfo}>
                                <View style={styles.conversationHeader}>
                                    <Text style={styles.conversationName}>{item.clinicianName}</Text>
                                    <Text style={styles.conversationTime}>{formatTime(item.lastMessageTime)}</Text>
                                </View>
                                <View style={styles.conversationFooter}>
                                    <Text
                                        style={styles.conversationPreview}
                                        numberOfLines={1}
                                        ellipsizeMode="tail"
                                    >
                                        {item.lastMessage}
                                    </Text>
                                    {item.unreadCount > 0 && (
                                        <View style={styles.unreadBadge}>
                                            <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={styles.conversationsList}
                />
            )}

            <TouchableOpacity style={styles.fab} onPress={() => {
                Alert.alert(
                    'Start New Conversation',
                    'Select a healthcare provider to message:',
                    [
                        ...mockClinicians.map(clinician => ({
                        text: clinician.name,
                        onPress: () => openConversation(generateMockConversation(clinician.id))
                        })),
                        { text: 'Cancel', style: 'cancel' as 'cancel' }
                    ]
                );
            }}>
                <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
        </View>
    );
};

// Individual conversation screen
export const ConversationScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp<ParamListBase>>();
    const route = useRoute<any>();
    const { conversationId } = route.params || {};

    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [attachment, setAttachment] = useState<Message['attachment'] | null>(null);

    const flatListRef = useRef<FlatList>(null);

    // Load conversation from storage
    useEffect(() => {
        const loadConversation = async () => {
            try {
                const storedConversations = await AsyncStorage.getItem('conversations');

                if (storedConversations) {
                    const conversations = JSON.parse(storedConversations) as Conversation[];
                    const currentConversation = conversations.find(c => c.id === conversationId);

                    if (currentConversation) {
                        setConversation(currentConversation);
                    }
                }
            } catch (error) {
                console.error('Error loading conversation:', error);
                Alert.alert('Error', 'Failed to load conversation.');
            } finally {
                setLoading(false);
            }
        };

        loadConversation();

        // Set header title
        navigation.setOptions({
            title: conversation?.clinicianName || 'Conversation',
            headerRight: () => (
                <TouchableOpacity style={styles.headerButton} onPress={() => {
                    Alert.alert(
                        'Conversation Info',
                        `You are talking with ${conversation?.clinicianName}. All messages are end-to-end encrypted.`
                    );
                }}>
                    <Ionicons name="information-circle-outline" size={24} color="#2684FF" />
                </TouchableOpacity>
            )
        });
    }, [navigation, conversationId, conversation?.clinicianName]);

    // Scroll to bottom when new messages are added
    useEffect(() => {
        if (conversation?.messages.length && flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: true });
        }
    }, [conversation?.messages.length]);

    // Format timestamp to readable time
    const formatMessageTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Send message
    const sendMessage = async () => {
        if (!conversation || (!message.trim() && !attachment)) return;

        try {
            setSending(true);

            // Create new message
            const newMessage: Message = {
                id: Date.now().toString(),
                text: message.trim(),
                timestamp: Date.now(),
                sender: 'patient',
                read: false,
                ...(attachment && { attachment })
            };

            // Update conversation
            const updatedConversation = {
                ...conversation,
                lastMessage: attachment ? 'Attachment: ' + attachment.filename : message.trim(),
                lastMessageTime: Date.now(),
                messages: [...conversation.messages, newMessage]
            };

            // Simulate storing in secure storage
            await SecureStore.setItemAsync(`message_${newMessage.id}`, JSON.stringify(newMessage));

            // Update conversation list
            const storedConversations = await AsyncStorage.getItem('conversations');
            if (storedConversations) {
                const conversations = JSON.parse(storedConversations) as Conversation[];
                const updatedConversations = conversations.map(conv =>
                    conv.id === conversation.id ? updatedConversation : conv
                );

                await AsyncStorage.setItem('conversations', JSON.stringify(updatedConversations));
            }

            // Update local state
            setConversation(updatedConversation);
            setMessage('');
            setAttachment(null);

            // Simulate response after delay (in a real app, this would be a push notification)
            setTimeout(() => {
                // Generate mock response
                const responseMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    text: getRandomResponse(),
                    timestamp: Date.now() + 5000, // 5 seconds later
                    sender: 'clinician',
                    read: false
                };

                // Update conversation
                const respondedConversation = {
                    ...updatedConversation,
                    lastMessage: responseMessage.text,
                    lastMessageTime: responseMessage.timestamp,
                    unreadCount: updatedConversation.unreadCount + 1,
                    messages: [...updatedConversation.messages, responseMessage]
                };

                // Update storage and state
                const updateStorage = async () => {
                    const storedConversations = await AsyncStorage.getItem('conversations');
                    if (storedConversations) {
                        const conversations = JSON.parse(storedConversations) as Conversation[];
                        const updatedConversations = conversations.map(conv =>
                            conv.id === conversation.id ? respondedConversation : conv
                        );

                        await AsyncStorage.setItem('conversations', JSON.stringify(updatedConversations));
                    }
                };

                updateStorage();
                setConversation(respondedConversation);
            }, 5000); // Simulate 5-second delay for response

        } catch (error) {
            console.error('Error sending message:', error);
            Alert.alert('Error', 'Failed to send message.');
        } finally {
            setSending(false);
        }
    };

    // Handle attachment
    const handleAttachment = async () => {
        try {
            // Request permissions if needed
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (permissionResult.granted === false) {
                Alert.alert('Permission Required', 'Please allow access to your photos to attach images');
                return;
            }

            // Launch image picker
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.8,
                allowsEditing: true,
            });

            if (!result.canceled && result.assets && result.assets[0]) {
                // Create local copy of the image for "security"
                const secureUri = FileSystem.documentDirectory + 'secure_images/' + Date.now() + '.jpg';

                // Ensure directory exists
                await FileSystem.makeDirectoryAsync(
                    FileSystem.documentDirectory + 'secure_images/',
                    { intermediates: true }
                );

                // Copy file to secure location
                await FileSystem.copyAsync({
                    from: result.assets[0].uri,
                    to: secureUri
                });

                // Set attachment
                setAttachment({
                    type: 'image',
                    uri: secureUri,
                    filename: 'Image ' + new Date().toLocaleString()
                });
            }
        } catch (error) {
            console.error('Error handling attachment:', error);
            Alert.alert('Error', 'Failed to attach file.');
        }
    };

    // Random responses for demo
    const getRandomResponse = () => {
        const responses = [
            "Thank you for sharing this information. I'll review it and get back to you soon.",
            "I've noted your concerns. Let's discuss this further at your next appointment.",
            "Have you been taking your medication as prescribed?",
            "Your latest test results look good. Continue with the current treatment plan.",
            "Could you provide more details about your symptoms?",
            "I'd like to schedule a follow-up appointment to discuss this further."
        ];

        return responses[Math.floor(Math.random() * responses.length)];
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2684FF" />
                <Text style={styles.loadingText}>Loading conversation...</Text>
            </View>
        );
    }

    if (!conversation) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Conversation not found</Text>
                <TouchableOpacity
                    style={styles.errorButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.errorButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <FlatList
                ref={flatListRef}
                data={conversation.messages}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={[
                        styles.messageContainer,
                        item.sender === 'patient' ? styles.sentMessage : styles.receivedMessage
                    ]}>
                        {item.attachment && (
                            <TouchableOpacity
                                style={styles.attachmentContainer}
                                onPress={() => {
                                    Alert.alert('View Attachment', 'In a real app, this would open the attachment');
                                }}
                            >
                                {item.attachment.type === 'image' ? (
                                    <Image
                                        source={{ uri: item.attachment.uri }}
                                        style={styles.attachmentImage}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <View style={styles.documentAttachment}>
                                        <Ionicons name="document-outline" size={24} color="#5E6C84" />
                                        <Text style={styles.documentName}>{item.attachment.filename}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        )}
                        {item.text.length > 0 && (
                            <View style={[
                                styles.messageBubble,
                                item.sender === 'patient' ? styles.sentBubble : styles.receivedBubble
                            ]}>
                                <Text style={[
                                    styles.messageText,
                                    item.sender === 'patient' ? styles.sentMessageText : styles.receivedMessageText
                                ]}>
                                    {item.text}
                                </Text>
                            </View>
                        )}
                        <View style={[
                            styles.messageFooter,
                            item.sender === 'patient' ? styles.sentFooter : styles.receivedFooter
                        ]}>
                            <Text style={styles.messageTime}>
                                {formatMessageTime(item.timestamp)}
                            </Text>
                            {item.sender === 'patient' && (
                                <Ionicons
                                    name={item.read ? "checkmark-done" : "checkmark"}
                                    size={16}
                                    color="#97A0AF"
                                />
                            )}
                        </View>
                    </View>
                )}
                contentContainerStyle={styles.messagesList}
            />

            <View style={styles.encryptionNotice}>
                <Ionicons name="lock-closed" size={14} color="#5E6C84" />
                <Text style={styles.encryptionText}>End-to-end encrypted</Text>
            </View>

            {attachment && (
                <View style={styles.attachmentPreview}>
                    <View style={styles.attachmentPreviewContent}>
                        <Ionicons name="image-outline" size={20} color="#5E6C84" />
                        <Text style={styles.attachmentName} numberOfLines={1}>
                            {attachment.filename}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={() => setAttachment(null)}>
                        <Ionicons name="close-circle" size={20} color="#97A0AF" />
                    </TouchableOpacity>
                </View>
            )}

            <View style={styles.inputContainer}>
                <TouchableOpacity
                    style={styles.attachButton}
                    onPress={handleAttachment}
                >
                    <Ionicons name="attach" size={24} color="#5E6C84" />
                </TouchableOpacity>

                <TextInput
                    style={styles.input}
                    placeholder="Type a message..."
                    value={message}
                    onChangeText={setMessage}
                    multiline
                    maxLength={1000}
                />

                <TouchableOpacity
                    style={[
                        styles.sendButton,
                        (message.trim().length === 0 && !attachment) ? styles.sendButtonDisabled : {}
                    ]}
                    disabled={message.trim().length === 0 && !attachment}
                    onPress={sendMessage}
                >
                    {sending ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <Ionicons name="send" size={20} color="#FFFFFF" />
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
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
    subheaderText: {
        fontSize: 14,
        color: '#5E6C84',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    conversationsList: {
        flexGrow: 1,
        paddingHorizontal: 16,
    },
    conversationItem: {
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F4F5F7',
        backgroundColor: '#FFFFFF',
    },
    avatarContainer: {
        marginRight: 16,
        position: 'relative',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#DFE1E6',
    },
    avatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#DEEBFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitial: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#2684FF',
    },
    statusDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        position: 'absolute',
        bottom: 0,
        right: 0,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    statusOnline: {
        backgroundColor: '#36B37E',
    },
    statusOffline: {
        backgroundColor: '#97A0AF',
    },
    conversationInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    conversationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    conversationName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#091E42',
    },
    conversationTime: {
        fontSize: 12,
        color: '#97A0AF',
    },
    conversationFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    conversationPreview: {
        flex: 1,
        fontSize: 14,
        color: '#5E6C84',
    },
    unreadBadge: {
        backgroundColor: '#2684FF',
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    unreadBadgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    fab: {
        position: 'absolute',
        right: 16,
        bottom: 16,
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
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#091E42',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: '#5E6C84',
        textAlign: 'center',
        marginBottom: 24,
    },
    newMessageButton: {
        backgroundColor: '#2684FF',
        borderRadius: 4,
        paddingVertical: 12,
        paddingHorizontal: 24,
    },
    newMessageButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '500',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#5E6C84',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: '#5E6C84',
        marginBottom: 16,
    },
    errorButton: {
        backgroundColor: '#2684FF',
        borderRadius: 4,
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    errorButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '500',
    },
    messagesList: {
        flexGrow: 1,
        padding: 16,
    },
    messageContainer: {
        marginBottom: 16,
        maxWidth: '80%',
    },
    sentMessage: {
        alignSelf: 'flex-end',
    },
    receivedMessage: {
        alignSelf: 'flex-start',
    },
    messageBubble: {
        borderRadius: 18,
        padding: 12,
    },
    sentBubble: {
        backgroundColor: '#2684FF',
    },
    receivedBubble: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#DFE1E6',
    },
    messageText: {
        fontSize: 16,
        lineHeight: 20,
    },
    sentMessageText: {
        color: '#FFFFFF',
    },
    receivedMessageText: {
        color: '#091E42',
    },
    messageFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    sentFooter: {
        justifyContent: 'flex-end',
    },
    receivedFooter: {
        justifyContent: 'flex-start',
    },
    messageTime: {
        fontSize: 12,
        color: '#97A0AF',
        marginRight: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#DFE1E6',
    },
    attachButton: {
        padding: 8,
    },
    input: {
        flex: 1,
        minHeight: 40,
        maxHeight: 100,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#DFE1E6',
        backgroundColor: '#F4F5F7',
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginHorizontal: 8,
        fontSize: 16,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#2684FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#97A0AF',
    },
    attachmentPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 8,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#DFE1E6',
    },
    attachmentPreviewContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    attachmentName: {
        marginLeft: 8,
        fontSize: 14,
        color: '#091E42',
        maxWidth: 280,
    },
    attachmentContainer: {
        marginBottom: 8,
        borderRadius: 8,
        overflow: 'hidden',
    },
    attachmentImage: {
        width: 200,
        height: 150,
        borderRadius: 8,
        backgroundColor: '#DFE1E6',
    },
    documentAttachment: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#DFE1E6',
    },
    documentName: {
        marginLeft: 8,
        fontSize: 14,
        color: '#091E42',
    },
    encryptionNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
    },
    encryptionText: {
        fontSize: 12,
        color: '#5E6C84',
        marginLeft: 4,
    },
});

// Default export is the list screen
export default MessagingListScreen; 