import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';

type AppointmentDetailRouteProp = RouteProp<
  { 
    AppointmentDetail: { 
      id: string;
    }
  },
  'AppointmentDetail'
>;

type AppointmentDetailNavigationProp = StackNavigationProp<any>;

interface Appointment {
  id: string;
  title: string;
  doctorName: string;
  doctorSpecialty: string;
  clinicName: string;
  clinicAddress: string;
  date: string;
  time: string;
  duration: string;
  notes: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  reminderSet: boolean;
  videoCallLink?: string;
  preparationInstructions?: string;
}

const AppointmentDetailScreen: React.FC = () => {
  const navigation = useNavigation<AppointmentDetailNavigationProp>();
  const route = useRoute<AppointmentDetailRouteProp>();
  const { id } = route.params;
  
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // In a real app, this would fetch appointment details from an API
    // For now, we'll simulate loading with mock data
    const fetchAppointmentDetails = async () => {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock data based on the ID
        const mockAppointment: Appointment = {
          id,
          title: 'Annual Cardiovascular Checkup',
          doctorName: 'Dr. Sarah Johnson',
          doctorSpecialty: 'Cardiologist',
          clinicName: 'HeartCare Clinic',
          clinicAddress: '123 Medical Center Blvd, Suite 300',
          date: '2023-12-15',
          time: '10:00 AM',
          duration: '30 minutes',
          notes: 'Please bring your medication list and recent lab results if available.',
          status: 'upcoming',
          reminderSet: true,
          videoCallLink: 'https://example.com/video-call',
          preparationInstructions: 'Fast for 8 hours before the appointment. Continue taking regular medication except for diabetes medication.',
        };
        
        setAppointment(mockAppointment);
      } catch (error) {
        console.error('Error fetching appointment details:', error);
        Alert.alert('Error', 'Failed to load appointment details');
      } finally {
        setLoading(false);
      }
    };

    fetchAppointmentDetails();
  }, [id]);

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const handleReschedule = () => {
    Alert.alert('Reschedule', 'Reschedule functionality would be implemented here');
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Appointment',
      'Are you sure you want to cancel this appointment?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes', 
          style: 'destructive',
          onPress: () => {
            // In a real app, this would call an API to cancel the appointment
            Alert.alert('Cancelled', 'Your appointment has been cancelled');
            navigation.goBack();
          }
        }
      ]
    );
  };

  const handleVideoCall = () => {
    if (appointment?.videoCallLink) {
      Alert.alert(
        'Join Video Call',
        'This would launch the video call interface in a real app'
      );
    }
  };

  const toggleReminder = () => {
    if (appointment) {
      setAppointment({
        ...appointment,
        reminderSet: !appointment.reminderSet
      });
      
      Alert.alert(
        appointment.reminderSet ? 'Reminder Disabled' : 'Reminder Set',
        appointment.reminderSet 
          ? 'You will no longer receive a reminder for this appointment' 
          : 'You will receive a reminder before this appointment'
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2684FF" />
        <Text style={styles.loadingText}>Loading appointment details...</Text>
      </View>
    );
  }

  if (!appointment) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#FF5630" />
        <Text style={styles.errorText}>Appointment not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>{appointment.title}</Text>
          <View style={[
            styles.statusBadge,
            appointment.status === 'upcoming' ? styles.upcomingBadge :
            appointment.status === 'completed' ? styles.completedBadge :
            styles.cancelledBadge
          ]}>
            <Text style={styles.statusText}>
              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={20} color="#2684FF" />
            <Text style={styles.infoText}>{formatDate(appointment.date)}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color="#2684FF" />
            <Text style={styles.infoText}>{appointment.time} ({appointment.duration})</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="medical" size={20} color="#2684FF" />
            <View>
              <Text style={styles.infoText}>{appointment.doctorName}</Text>
              <Text style={styles.infoSubtext}>{appointment.doctorSpecialty}</Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color="#2684FF" />
            <View>
              <Text style={styles.infoText}>{appointment.clinicName}</Text>
              <Text style={styles.infoSubtext}>{appointment.clinicAddress}</Text>
            </View>
          </View>
        </View>

        {appointment.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.noteText}>{appointment.notes}</Text>
          </View>
        )}

        {appointment.preparationInstructions && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preparation Instructions</Text>
            <Text style={styles.preparationText}>{appointment.preparationInstructions}</Text>
          </View>
        )}

        {appointment.status === 'upcoming' && (
          <View style={styles.actionsContainer}>
            {appointment.videoCallLink && (
              <TouchableOpacity
                style={[styles.actionButton, styles.videoCallButton]}
                onPress={handleVideoCall}
              >
                <Ionicons name="videocam" size={20} color="#FFFFFF" />
                <Text style={styles.videoCallText}>Join Video Call</Text>
              </TouchableOpacity>
            )}
            
            <View style={styles.actionRow}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.reminderButton, appointment.reminderSet && styles.activeReminderButton]}
                onPress={toggleReminder}
              >
                <Ionicons 
                  name={appointment.reminderSet ? "notifications" : "notifications-outline"} 
                  size={20} 
                  color={appointment.reminderSet ? "#2684FF" : "#5E6C84"} 
                />
                <Text style={[styles.actionText, appointment.reminderSet && styles.activeActionText]}>
                  {appointment.reminderSet ? "Reminder Set" : "Set Reminder"}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.rescheduleButton]}
                onPress={handleReschedule}
              >
                <Ionicons name="calendar-outline" size={20} color="#5E6C84" />
                <Text style={styles.actionText}>Reschedule</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={handleCancel}
            >
              <Ionicons name="close-circle-outline" size={20} color="#FF5630" />
              <Text style={styles.cancelText}>Cancel Appointment</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F5F7',
    padding: 16,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F4F5F7',
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: '#091E42',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#2684FF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#091E42',
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
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
    color: '#091E42',
  },
  section: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F5F7',
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#091E42',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoText: {
    fontSize: 16,
    color: '#091E42',
    marginLeft: 10,
  },
  infoSubtext: {
    fontSize: 14,
    color: '#5E6C84',
    marginLeft: 10,
  },
  noteText: {
    fontSize: 16,
    color: '#091E42',
    lineHeight: 22,
  },
  preparationText: {
    fontSize: 16,
    color: '#091E42',
    lineHeight: 22,
    padding: 10,
    backgroundColor: '#FFFAE6',
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#FFAB00',
  },
  actionsContainer: {
    gap: 12,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DFE1E6',
  },
  videoCallButton: {
    backgroundColor: '#2684FF',
    borderColor: '#2684FF',
    marginBottom: 8,
  },
  videoCallText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  reminderButton: {
    flex: 1,
    justifyContent: 'center',
  },
  activeReminderButton: {
    borderColor: '#DEEBFF',
    backgroundColor: '#DEEBFF',
  },
  rescheduleButton: {
    flex: 1,
    justifyContent: 'center',
  },
  cancelButton: {
    justifyContent: 'center',
    borderColor: '#FFEBE6',
    backgroundColor: '#FFEBE6',
  },
  actionText: {
    color: '#5E6C84',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  activeActionText: {
    color: '#2684FF',
  },
  cancelText: {
    color: '#FF5630',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
});

export default AppointmentDetailScreen; 