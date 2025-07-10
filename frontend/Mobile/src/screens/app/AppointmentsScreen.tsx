import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    FlatList,
    Alert,
    ActivityIndicator,
    Modal,
    TextInput,
    Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';

type AppointmentsScreenNavigationProp = StackNavigationProp<any, 'Appointments'>;

interface Appointment {
    id: string;
    title: string;
    doctorName: string;
    clinicName: string;
    clinicAddress: string;
    date: string;
    time: string;
    notes?: string;
    status: 'upcoming' | 'completed' | 'cancelled';
    reminderSet: boolean;
    notificationId?: string;
    videoCallLink?: string;
}

interface Doctor {
    id: string;
    name: string;
    specialty: string;
    clinicName: string;
    clinicAddress: string;
}

const mockDoctors: Doctor[] = [
    {
        id: 'd1',
        name: 'Dr. Sarah Johnson',
        specialty: 'Cardiologist',
        clinicName: 'HeartCare Clinic',
        clinicAddress: '123 Medical Center Dr, Suite 400'
    },
    {
        id: 'd2',
        name: 'Dr. Michael Chen',
        specialty: 'General Practitioner',
        clinicName: 'CardioHealth Partners',
        clinicAddress: '456 Health Parkway'
    },
    {
        id: 'd3',
        name: 'Dr. Lisa Patel',
        specialty: 'Primary Care',
        clinicName: 'Wellness Medical Center',
        clinicAddress: '789 Wellness Blvd'
    }
];

const AppointmentsScreen: React.FC = () => {
    const navigation = useNavigation<AppointmentsScreenNavigationProp>();
    const [isLoading, setIsLoading] = useState(true);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('upcoming');
    
    // Scheduling modal state
    const [schedulingModalVisible, setSchedulingModalVisible] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedTime, setSelectedTime] = useState(new Date());
    const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
    const [appointmentTitle, setAppointmentTitle] = useState('');
    const [appointmentNotes, setAppointmentNotes] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    useEffect(() => {
        fetchAppointments();
        checkNotificationPermissions();
    }, []);

    const checkNotificationPermissions = async () => {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(
                'Permission Required',
                'Enable notifications to receive appointment reminders',
                [
                    { text: 'Later' },
                    { text: 'Settings', onPress: () => Notifications.requestPermissionsAsync() }
                ]
            );
        }
    };

    const fetchAppointments = async () => {
        setIsLoading(true);
        try {
            // In a real app, this would be an API call
            const savedAppointments = await AsyncStorage.getItem('appointments');

            if (savedAppointments) {
                setAppointments(JSON.parse(savedAppointments));
            } else {
                // Mock data
                const mockAppointments: Appointment[] = [
                    {
                        id: '1',
                        title: 'Annual Cardiovascular Checkup',
                        doctorName: 'Dr. Sarah Johnson',
                        clinicName: 'HeartCare Clinic',
                        clinicAddress: '123 Medical Center Dr, Suite 400',
                        date: '2023-12-15',
                        time: '10:00 AM',
                        notes: 'Bring previous test results and medication list',
                        status: 'upcoming',
                        reminderSet: true,
                        notificationId: 'appt-reminder-1',
                    },
                    {
                        id: '2',
                        title: 'Blood Pressure Follow-up',
                        doctorName: 'Dr. Michael Chen',
                        clinicName: 'CardioHealth Partners',
                        clinicAddress: '456 Health Parkway',
                        date: '2023-12-28',
                        time: '2:30 PM',
                        status: 'upcoming',
                        reminderSet: false,
                        videoCallLink: 'https://teleconsult.example.com/dr-chen',
                    },
                    {
                        id: '3',
                        title: 'Medication Review',
                        doctorName: 'Dr. Sarah Johnson',
                        clinicName: 'HeartCare Clinic',
                        clinicAddress: '123 Medical Center Dr, Suite 400',
                        date: '2023-11-05',
                        time: '9:15 AM',
                        notes: 'Discuss side effects of new medication',
                        status: 'completed',
                        reminderSet: false,
                    },
                    {
                        id: '4',
                        title: 'Nutrition Consultation',
                        doctorName: 'Lisa Wong, RD',
                        clinicName: 'Nutritional Health Center',
                        clinicAddress: '789 Wellness Blvd',
                        date: '2023-11-20',
                        time: '1:00 PM',
                        notes: 'Bring food diary from the last week',
                        status: 'completed',
                        reminderSet: false,
                    },
                    {
                        id: '5',
                        title: 'Stress Test',
                        doctorName: 'Dr. Robert Martinez',
                        clinicName: 'CardioHealth Partners',
                        clinicAddress: '456 Health Parkway',
                        date: '2023-10-17',
                        time: '11:00 AM',
                        notes: 'Wear comfortable clothing and athletic shoes',
                        status: 'cancelled',
                        reminderSet: false,
                    }
                ];

                setAppointments(mockAppointments);
                await AsyncStorage.setItem('appointments', JSON.stringify(mockAppointments));
            }
        } catch (error) {
            console.error('Error fetching appointments:', error);
            Alert.alert('Error', 'Failed to load appointments');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleReminder = async (appointment: Appointment) => {
        try {
            if (appointment.reminderSet && appointment.notificationId) {
                // Cancel existing reminder
                await Notifications.cancelScheduledNotificationAsync(appointment.notificationId);

                const updatedAppointments = appointments.map(appt =>
                    appt.id === appointment.id ? { ...appt, reminderSet: false, notificationId: undefined } : appt
                );
                setAppointments(updatedAppointments);
                await AsyncStorage.setItem('appointments', JSON.stringify(updatedAppointments));

                Alert.alert('Success', 'Appointment reminder removed');
            } else {
                // Schedule new reminder
                const appointmentDate = new Date(`${appointment.date}T${appointment.time}`);
                const reminderDate = new Date(appointmentDate.getTime() - 24 * 60 * 60 * 1000); // 24 hours before

                const notificationId = await Notifications.scheduleNotificationAsync({
                    content: {
                        title: 'Appointment Reminder',
                        body: `You have an appointment with ${appointment.doctorName} tomorrow at ${appointment.time}`,
                        data: { appointmentId: appointment.id }
                    },
                    trigger: {
                        channelId: 'appointment-reminders',
                        seconds: Math.floor((reminderDate.getTime() - Date.now()) / 1000)
                    },
                });

                const updatedAppointments = appointments.map(appt =>
                    appt.id === appointment.id ? { ...appt, reminderSet: true, notificationId } : appt
                );
                setAppointments(updatedAppointments);
                await AsyncStorage.setItem('appointments', JSON.stringify(updatedAppointments));

                Alert.alert('Success', 'Appointment reminder set for 24 hours before your appointment');
            }
        } catch (error) {
            console.error('Error toggling reminder:', error);
            Alert.alert('Error', 'Failed to set appointment reminder');
        }
    };

    const getFilteredAppointments = () => {
        switch (filter) {
            case 'upcoming':
                return appointments.filter(appt => appt.status === 'upcoming');
            case 'completed':
                return appointments.filter(appt => appt.status === 'completed');
            default:
                return appointments;
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    };
    
    const formatTimeDisplay = (date: Date) => {
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    };
    
    const formatDateDisplay = (date: Date) => {
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    };

    const handleScheduleAppointment = async () => {
        if (!selectedDoctor) {
            Alert.alert('Error', 'Please select a doctor');
            return;
        }

        if (!appointmentTitle.trim()) {
            Alert.alert('Error', 'Please enter a reason for your appointment');
            return;
        }

        try {
            // Format date and time
            const dateStr = selectedDate.toISOString().split('T')[0];
            const timeStr = formatTimeDisplay(selectedTime);

            // Create new appointment
            const newAppointment: Appointment = {
                id: Date.now().toString(),
                title: appointmentTitle,
                doctorName: selectedDoctor.name,
                clinicName: selectedDoctor.clinicName,
                clinicAddress: selectedDoctor.clinicAddress,
                date: dateStr,
                time: timeStr,
                notes: appointmentNotes,
                status: 'upcoming',
                reminderSet: false
            };

            // Add to appointments array
            const updatedAppointments = [...appointments, newAppointment];
            setAppointments(updatedAppointments);
            await AsyncStorage.setItem('appointments', JSON.stringify(updatedAppointments));

            // Reset form and close modal
            setAppointmentTitle('');
            setAppointmentNotes('');
            setSelectedDoctor(null);
            setSelectedDate(new Date());
            setSelectedTime(new Date());
            setSchedulingModalVisible(false);

            Alert.alert('Success', 'Appointment scheduled successfully');
        } catch (error) {
            console.error('Error scheduling appointment:', error);
            Alert.alert('Error', 'Failed to schedule appointment');
        }
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        const currentDate = selectedDate || new Date();
        setShowDatePicker(Platform.OS === 'ios');
        setSelectedDate(currentDate);
    };

    const handleTimeChange = (event: any, selectedTime?: Date) => {
        const currentTime = selectedTime || new Date();
        setShowTimePicker(Platform.OS === 'ios');
        setSelectedTime(currentTime);
    };

    const renderFilterTabs = () => (
        <View style={styles.filterContainer}>
            <TouchableOpacity
                style={[styles.filterTab, filter === 'upcoming' && styles.activeFilterTab]}
                onPress={() => setFilter('upcoming')}
            >
                <Text style={[styles.filterText, filter === 'upcoming' && styles.activeFilterText]}>
                    Upcoming
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.filterTab, filter === 'completed' && styles.activeFilterTab]}
                onPress={() => setFilter('completed')}
            >
                <Text style={[styles.filterText, filter === 'completed' && styles.activeFilterText]}>
                    Past
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.filterTab, filter === 'all' && styles.activeFilterTab]}
                onPress={() => setFilter('all')}
            >
                <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>
                    All
                </Text>
            </TouchableOpacity>
        </View>
    );

    const renderDoctorOption = (doctor: Doctor) => (
        <TouchableOpacity
            key={doctor.id}
            style={[
                styles.doctorOption,
                selectedDoctor?.id === doctor.id && styles.selectedDoctorOption
            ]}
            onPress={() => setSelectedDoctor(doctor)}
        >
            <View style={styles.doctorOptionContent}>
                <Text style={styles.doctorName}>{doctor.name}</Text>
                <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>
                <Text style={styles.clinicName}>{doctor.clinicName}</Text>
            </View>
            {selectedDoctor?.id === doctor.id && (
                <Ionicons name="checkmark-circle" size={24} color="#2684FF" />
            )}
        </TouchableOpacity>
    );

    const renderSchedulingModal = () => (
        <Modal
            visible={schedulingModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setSchedulingModalVisible(false)}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Schedule Appointment</Text>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setSchedulingModalVisible(false)}
                        >
                            <Ionicons name="close" size={24} color="#5E6C84" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView>
                        <View style={styles.formSection}>
                            <Text style={styles.sectionTitle}>Appointment Type</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter reason for visit (e.g. Annual Checkup)"
                                value={appointmentTitle}
                                onChangeText={setAppointmentTitle}
                            />
                        </View>

                        <View style={styles.formSection}>
                            <Text style={styles.sectionTitle}>Date & Time</Text>
                            
                            <TouchableOpacity
                                style={styles.dateTimeSelector}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Ionicons name="calendar-outline" size={20} color="#5E6C84" />
                                <Text style={styles.dateTimeText}>
                                    {formatDateDisplay(selectedDate)}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.dateTimeSelector}
                                onPress={() => setShowTimePicker(true)}
                            >
                                <Ionicons name="time-outline" size={20} color="#5E6C84" />
                                <Text style={styles.dateTimeText}>
                                    {formatTimeDisplay(selectedTime)}
                                </Text>
                            </TouchableOpacity>

                            {showDatePicker && (
                                <DateTimePicker
                                    value={selectedDate}
                                    mode="date"
                                    display="default"
                                    onChange={handleDateChange}
                                    minimumDate={new Date()}
                                />
                            )}

                            {showTimePicker && (
                                <DateTimePicker
                                    value={selectedTime}
                                    mode="time"
                                    display="default"
                                    onChange={handleTimeChange}
                                />
                            )}
                        </View>

                        <View style={styles.formSection}>
                            <Text style={styles.sectionTitle}>Select Doctor</Text>
                            {mockDoctors.map(renderDoctorOption)}
                        </View>

                        <View style={styles.formSection}>
                            <Text style={styles.sectionTitle}>Notes</Text>
                            <TextInput
                                style={[styles.input, styles.notesInput]}
                                placeholder="Add any additional notes or information"
                                value={appointmentNotes}
                                onChangeText={setAppointmentNotes}
                                multiline={true}
                                numberOfLines={4}
                                textAlignVertical="top"
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.scheduleButton}
                            onPress={handleScheduleAppointment}
                        >
                            <Text style={styles.scheduleButtonText}>Schedule Appointment</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    const renderAppointmentCard = ({ item }: { item: Appointment }) => (
        <TouchableOpacity
            style={[styles.appointmentCard,
            item.status === 'cancelled' && styles.cancelledAppointment
            ]}
            onPress={() => navigation.navigate('AppointmentDetail', { id: item.id })}
        >
            <View style={styles.appointmentHeader}>
                <View style={styles.dateTimeContainer}>
                    <Text style={styles.dateText}>{formatDate(item.date)}</Text>
                    <Text style={styles.timeText}>{item.time}</Text>
                </View>
                <View style={styles.statusContainer}>
                    {item.status === 'upcoming' && (
                        <View style={[styles.statusBadge, styles.upcomingBadge]}>
                            <Text style={styles.statusText}>Upcoming</Text>
                        </View>
                    )}
                    {item.status === 'completed' && (
                        <View style={[styles.statusBadge, styles.completedBadge]}>
                            <Text style={styles.statusText}>Completed</Text>
                        </View>
                    )}
                    {item.status === 'cancelled' && (
                        <View style={[styles.statusBadge, styles.cancelledBadge]}>
                            <Text style={styles.statusText}>Cancelled</Text>
                        </View>
                    )}
                </View>
            </View>

            <Text style={styles.appointmentTitle}>{item.title}</Text>
            <Text style={styles.doctorName}>with {item.doctorName}</Text>
            <Text style={styles.clinicName}>{item.clinicName}</Text>
            <Text style={styles.clinicAddress}>{item.clinicAddress}</Text>

            {item.status === 'upcoming' && (
                <View style={styles.actionsContainer}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => toggleReminder(item)}
                    >
                        <Ionicons
                            name={item.reminderSet ? "notifications" : "notifications-outline"}
                            size={20}
                            color={item.reminderSet ? "#2684FF" : "#5E6C84"}
                        />
                        <Text style={[styles.actionText, item.reminderSet && styles.activeActionText]}>
                            {item.reminderSet ? "Reminder Set" : "Set Reminder"}
                        </Text>
                    </TouchableOpacity>

                    {item.videoCallLink && (
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => Alert.alert('Video Call', 'This would open a video call interface in a real app.')}
                        >
                            <Ionicons name="videocam-outline" size={20} color="#5E6C84" />
                            <Text style={styles.actionText}>Video Call</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => Alert.alert('Reschedule', 'This would open a reschedule interface in a real app.')}
                    >
                        <Ionicons name="calendar-outline" size={20} color="#5E6C84" />
                        <Text style={styles.actionText}>Reschedule</Text>
                    </TouchableOpacity>
                </View>
            )}
        </TouchableOpacity>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color="#97A0AF" />
            <Text style={styles.emptyTitle}>No {filter} appointments</Text>
            <Text style={styles.emptyText}>
                {filter === 'upcoming'
                    ? 'You have no upcoming appointments scheduled.'
                    : 'You have no past appointments.'}
            </Text>
            <TouchableOpacity
                style={styles.scheduleButton}
                onPress={() => setSchedulingModalVisible(true)}
            >
                <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.scheduleButtonText}>Schedule Appointment</Text>
            </TouchableOpacity>
        </View>
    );

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2684FF" />
                <Text style={styles.loadingText}>Loading appointments...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Appointments</Text>
                    <Text style={styles.headerSubtitle}>
                        Manage your healthcare visits
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setSchedulingModalVisible(true)}
                >
                    <Ionicons name="add" size={24} color="#2684FF" />
                </TouchableOpacity>
            </View>

            {renderFilterTabs()}

            {getFilteredAppointments().length > 0 ? (
                <FlatList
                    data={getFilteredAppointments()}
                    renderItem={renderAppointmentCard}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                renderEmptyState()
            )}
            
            {renderSchedulingModal()}
        </View>
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
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F4F5F7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterContainer: {
        flexDirection: 'row',
        backgroundColor: '#E9EBEE',
        borderRadius: 8,
        marginBottom: 16,
        marginHorizontal: 16,
        padding: 4,
    },
    filterTab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 6,
    },
    activeFilterTab: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    filterText: {
        fontSize: 14,
        color: '#5E6C84',
        fontWeight: '500',
    },
    activeFilterText: {
        color: '#091E42',
    },
    listContainer: {
        paddingBottom: 20,
        paddingHorizontal: 16,
    },
    appointmentCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    cancelledAppointment: {
        opacity: 0.7,
        borderLeftWidth: 4,
        borderLeftColor: '#97A0AF',
    },
    appointmentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    dateTimeContainer: {
        flexDirection: 'column',
    },
    dateText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#091E42',
    },
    timeText: {
        fontSize: 14,
        color: '#5E6C84',
        marginTop: 4,
    },
    statusContainer: {
        alignItems: 'flex-end',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    upcomingBadge: {
        backgroundColor: '#DEEBFF',
    },
    completedBadge: {
        backgroundColor: '#E3FCEF',
    },
    cancelledBadge: {
        backgroundColor: '#FFEBE6',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
    },
    appointmentTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#091E42',
        marginBottom: 8,
    },
    doctorName: {
        fontSize: 16,
        color: '#253858',
        marginBottom: 8,
    },
    clinicName: {
        fontSize: 14,
        color: '#5E6C84',
        marginBottom: 2,
    },
    clinicAddress: {
        fontSize: 14,
        color: '#97A0AF',
        marginBottom: 16,
    },
    actionsContainer: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#F4F5F7',
        paddingTop: 12,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16,
    },
    actionText: {
        fontSize: 14,
        color: '#5E6C84',
        marginLeft: 4,
    },
    activeActionText: {
        color: '#2684FF',
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
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#091E42',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 16,
        color: '#5E6C84',
        textAlign: 'center',
        marginBottom: 24,
    },
    scheduleButton: {
        flexDirection: 'row',
        backgroundColor: '#2684FF',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 4,
        alignItems: 'center',
    },
    scheduleButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '500',
        marginLeft: 8,
    },
    // Modal styles
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(9, 30, 66, 0.4)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingHorizontal: 16,
        paddingBottom: 24,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F4F5F7',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#091E42',
    },
    closeButton: {
        padding: 4,
    },
    formSection: {
        marginTop: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#091E42',
        marginBottom: 12,
    },
    input: {
        backgroundColor: '#F4F5F7',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        color: '#091E42',
        borderWidth: 1,
        borderColor: '#DFE1E6',
    },
    notesInput: {
        height: 100,
        paddingTop: 10,
    },
    dateTimeSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F4F5F7',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#DFE1E6',
    },
    dateTimeText: {
        fontSize: 16,
        color: '#091E42',
        marginLeft: 12,
    },
    doctorOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#F4F5F7',
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#DFE1E6',
    },
    selectedDoctorOption: {
        borderColor: '#2684FF',
        backgroundColor: '#DEEBFF',
    },
    doctorOptionContent: {
        flex: 1,
    },
    doctorSpecialty: {
        fontSize: 14,
        color: '#5E6C84',
        marginTop: 2,
    },
});

export default AppointmentsScreen; 