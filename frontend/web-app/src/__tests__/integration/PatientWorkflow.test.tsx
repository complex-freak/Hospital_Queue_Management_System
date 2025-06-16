import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueueContextProvider } from '../../contexts/QueueContext';
import { AuthContextProvider } from '../../contexts/AuthContext';
import { NotificationContextProvider } from '../../contexts/NotificationContext';
import { PatientForm } from '../../components/PatientForm';
import { DoctorDashboard } from '../../features/doctor/pages/Dashboard';
import { QueueMonitor } from '../../features/receptionist/components/QueueMonitor';
import { QueueService } from '../../services/queueService';
import { NotificationService } from '../../services/notificationService';
import { IndexedDBService } from '../../services/indexedDBService';
import { Role } from '../../types/user';

// Mock services
jest.mock('../../services/indexedDBService', () => ({
  IndexedDBService: {
    saveQueue: jest.fn(),
    getQueue: jest.fn(),
    saveNotifications: jest.fn(),
    getNotifications: jest.fn().mockResolvedValue([]),
    updatePatientStatus: jest.fn(),
  },
}));

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('Patient Registration to Doctor Workflow', () => {
  let queueService: QueueService;
  let notificationService: NotificationService;
  let savedQueue: any[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    savedQueue = [];
    queueService = new QueueService();
    notificationService = new NotificationService();

    // Mock IndexedDBService methods
    (IndexedDBService.saveQueue as jest.Mock).mockImplementation((queue) => {
      savedQueue = queue;
      return Promise.resolve();
    });
    
    (IndexedDBService.getQueue as jest.Mock).mockImplementation(() => {
      return Promise.resolve(savedQueue);
    });
    
    (IndexedDBService.updatePatientStatus as jest.Mock).mockImplementation((id, status) => {
      const patientIndex = savedQueue.findIndex(p => p.id === id);
      if (patientIndex !== -1) {
        savedQueue[patientIndex].status = status;
      }
      return Promise.resolve();
    });
  });

  test('should register patient and show in doctor queue', async () => {
    // 1. Render the registration component
    const { unmount: unmountRegistration } = render(
      <NotificationContextProvider notificationService={notificationService}>
        <QueueContextProvider queueService={queueService}>
          <MemoryRouter>
            <PatientForm 
              queueService={queueService} 
              notificationService={notificationService} 
            />
          </MemoryRouter>
        </QueueContextProvider>
      </NotificationContextProvider>
    );
    
    // 2. Register a new patient
    await userEvent.type(screen.getByLabelText(/name/i), 'Test Patient');
    fireEvent.change(screen.getByLabelText(/priority/i), { 
      target: { value: 'high' } 
    });
    fireEvent.change(screen.getByLabelText(/department/i), { 
      target: { value: 'cardiology' } 
    });
    
    // Submit the registration form
    await userEvent.click(screen.getByRole('button', { name: /register/i }));
    
    // Wait for registration to complete
    await waitFor(() => {
      expect(savedQueue.length).toBe(1);
      expect(savedQueue[0].name).toBe('Test Patient');
      expect(savedQueue[0].status).toBe('waiting');
    });
    
    unmountRegistration();
    
    // 3. Render doctor dashboard
    const mockUser = {
      id: 'doctor-123',
      name: 'Dr. Smith',
      role: Role.DOCTOR,
      department: 'cardiology'
    };
    
    render(
      <AuthContextProvider initialUser={mockUser}>
        <NotificationContextProvider notificationService={notificationService}>
          <QueueContextProvider queueService={queueService}>
            <MemoryRouter>
              <DoctorDashboard />
            </MemoryRouter>
          </QueueContextProvider>
        </NotificationContextProvider>
      </AuthContextProvider>
    );
    
    // 4. Verify that the patient appears in the queue
    await waitFor(() => {
      expect(screen.getByText('Test Patient')).toBeInTheDocument();
    });
    
    // 5. Check that doctor can change patient status
    const statusButton = await screen.findByRole('button', { name: /start consultation/i });
    await userEvent.click(statusButton);
    
    // 6. Verify that status is updated
    await waitFor(() => {
      expect(savedQueue[0].status).toBe('in-progress');
    });
    
    // 7. Check that "Complete" button appears after status change
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /complete/i })).toBeInTheDocument();
    });
    
    // 8. Complete the consultation
    await userEvent.click(screen.getByRole('button', { name: /complete/i }));
    
    // 9. Verify final status update
    await waitFor(() => {
      expect(savedQueue[0].status).toBe('completed');
    });
  });
  
  test('should handle drag-and-drop queue reordering', async () => {
    // 1. Setup multiple patients in the queue
    savedQueue = [
      {
        id: '1',
        name: 'Patient One',
        priority: 'medium',
        status: 'waiting',
        registeredTime: new Date(),
        department: 'general',
      },
      {
        id: '2',
        name: 'Patient Two',
        priority: 'high',
        status: 'waiting',
        registeredTime: new Date(),
        department: 'general',
      }
    ];
    
    // 2. Render the queue monitor component
    render(
      <NotificationContextProvider notificationService={notificationService}>
        <QueueContextProvider queueService={queueService}>
          <MemoryRouter>
            <QueueMonitor />
          </MemoryRouter>
        </QueueContextProvider>
      </NotificationContextProvider>
    );
    
    // 3. Verify initial queue order
    const patients = await screen.findAllByTestId('patient-item');
    expect(patients[0]).toHaveTextContent('Patient One');
    expect(patients[1]).toHaveTextContent('Patient Two');
    
    // 4. Simulate drag and drop - we'll directly call the reorderQueue method
    // since actual drag-and-drop is hard to test
    await queueService.reorderQueue([savedQueue[1], savedQueue[0]]);
    
    // 5. Verify the queue was reordered
    await waitFor(() => {
      const reorderedPatients = screen.getAllByTestId('patient-item');
      expect(reorderedPatients[0]).toHaveTextContent('Patient Two');
      expect(reorderedPatients[1]).toHaveTextContent('Patient One');
    });
    
    // 6. Verify backend storage was updated
    expect(IndexedDBService.saveQueue).toHaveBeenCalledWith([
      expect.objectContaining({ id: '2' }),
      expect.objectContaining({ id: '1' })
    ]);
  });
}); 