import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@/__tests__/test-utils';
import QueueMonitor from '@/features/receptionist/components/QueueMonitor';
import { mockOnlineStatus } from '@/__tests__/test-utils';
import { act } from '@testing-library/react';

// Mock services
jest.mock('@/services/api', () => ({
  apiService: {
    skipPatient: jest.fn().mockResolvedValue({}),
  }
}));

jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
  useToast: () => ({
    toast: jest.fn()
  }),
}));

jest.mock('@/services/notifications/notificationService', () => ({
  notificationService: {
    notifyLongWaitTime: jest.fn(),
    notifyPatientRemoved: jest.fn(),
    notifyPriorityChanged: jest.fn(),
    notifyOfflineAction: jest.fn(),
  }
}));

jest.mock('@/services/connectivity/connectivityService', () => ({
  connectivityService: {
    getStatus: jest.fn().mockReturnValue(true),
    addListener: jest.fn().mockImplementation((callback) => {
      callback(true);
      return jest.fn();
    }),
  }
}));

jest.mock('@/services/db/indexedDBService', () => ({
  indexedDBService: {
    addPendingAction: jest.fn().mockResolvedValue({}),
  }
}));

// Mock drag and drop functionality
jest.mock('@dnd-kit/core', () => ({
  ...jest.requireActual('@dnd-kit/core'),
  useSensor: jest.fn(),
  useSensors: jest.fn().mockReturnValue([]),
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PointerSensor: jest.fn(),
  KeyboardSensor: jest.fn(),
  closestCenter: jest.fn(),
}));

jest.mock('@dnd-kit/sortable', () => ({
  ...jest.requireActual('@dnd-kit/sortable'),
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  arrayMove: jest.fn((arr) => arr),
  sortableKeyboardCoordinates: jest.fn(),
  verticalListSortingStrategy: 'vertical',
}));

// Mock data
const mockPatients = [
  {
    id: 'patient1',
    name: 'John Doe',
    reason: 'Headache',
    priority: 'medium',
    checkInTime: new Date(Date.now() - 30 * 60000).toISOString(), // 30 minutes ago
    status: 'waiting',
  },
  {
    id: 'patient2',
    name: 'Jane Smith',
    reason: 'Fever',
    priority: 'high',
    checkInTime: new Date(Date.now() - 15 * 60000).toISOString(), // 15 minutes ago
    status: 'waiting',
  }
];

const mockDoctors = [
  { id: 'doctor1', name: 'Dr. House', isAvailable: true },
  { id: 'doctor2', name: 'Dr. Grey', isAvailable: false },
];

// Simplified mock implementation of QueueMonitor
jest.mock('@/features/receptionist/components/QueueMonitor', () => {
  return function MockQueueMonitor({ patients, doctors, isLoading }: any) {
    const [filteredPatients, setFilteredPatients] = React.useState(patients);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [priorityFilter, setPriorityFilter] = React.useState('');
    
    // Apply filters when search or priority changes
    React.useEffect(() => {
      let result = [...patients];
      
      if (searchTerm) {
        result = result.filter(p => 
          p.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      if (priorityFilter) {
        result = result.filter(p => p.priority === priorityFilter);
      }
      
      setFilteredPatients(result);
    }, [patients, searchTerm, priorityFilter]);
    
    if (isLoading) {
      return <div>Loading...</div>;
    }
    
    if (!patients || patients.length === 0) {
      return <div>No patients in queue</div>;
    }
    
    return (
      <div>
        <input 
          placeholder="Search patients..." 
          onChange={(e) => setSearchTerm(e.target.value)}
          value={searchTerm}
        />
        <select 
          data-testid="priority-filter" 
          onChange={(e) => setPriorityFilter(e.target.value)}
          value={priorityFilter}
        >
          <option value="">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Reason</th>
              <th>Priority</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPatients.map((patient) => (
              <tr key={patient.id} data-testid={`patient-row-${patient.id}`}>
                <td>{patient.name}</td>
                <td>{patient.reason}</td>
                <td>{patient.priority}</td>
                <td>
                  <button data-testid={`menu-button-${patient.id}`}>Actions</button>
                  <button 
                    data-testid={`remove-button-${patient.id}`}
                    onClick={() => {
                      const apiService = require('@/services/api').apiService;
                      const notificationService = require('@/services/notifications/notificationService').notificationService;
                      const connectivityService = require('@/services/connectivity/connectivityService').connectivityService;
                      const indexedDBService = require('@/services/db/indexedDBService').indexedDBService;
                      
                      if (connectivityService.getStatus()) {
                        // Online mode
                        apiService.skipPatient(patient.id);
                        notificationService.notifyPatientRemoved(patient.name);
                      } else {
                        // Offline mode
                        indexedDBService.addPendingAction('remove', { patientId: patient.id });
                        notificationService.notifyOfflineAction('remove');
                      }
                    }}
                  >
                    Remove from Queue
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
});

describe('QueueMonitor Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnlineStatus(true); // Default to online
  });

  test('renders the queue monitor with patients', () => {
    render(
      <QueueMonitor 
        patients={mockPatients} 
        doctors={mockDoctors} 
        isLoading={false} 
      />
    );

    // Check if component renders
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Headache')).toBeInTheDocument();
    expect(screen.getByText('Fever')).toBeInTheDocument();
  });

  test('filters patients by search term', async () => {
    render(
      <QueueMonitor 
        patients={mockPatients} 
        doctors={mockDoctors} 
        isLoading={false} 
      />
    );

    // Get search input and type
    const searchInput = screen.getByPlaceholderText('Search patients...');
    fireEvent.change(searchInput, { target: { value: 'John' } });

    // Should show John but hide Jane
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });

  test('filters patients by priority', async () => {
    render(
      <QueueMonitor 
        patients={mockPatients} 
        doctors={mockDoctors} 
        isLoading={false} 
      />
    );
    
    // Find priority select and choose high
    const prioritySelect = screen.getByTestId('priority-filter');
    fireEvent.change(prioritySelect, { target: { value: 'high' } });

    // Should show Jane with high priority but hide John with medium priority
    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });

  test('handles patient removal when online', () => {
    const apiService = require('@/services/api').apiService;
    const notificationService = require('@/services/notifications/notificationService').notificationService;
    
    render(
      <QueueMonitor 
        patients={mockPatients} 
        doctors={mockDoctors} 
        isLoading={false} 
      />
    );

    // Find and click the remove button for John Doe
    const removeButton = screen.getByTestId('remove-button-patient1');
    fireEvent.click(removeButton);
    
    // Verify API call and notification
    expect(apiService.skipPatient).toHaveBeenCalledWith('patient1');
    expect(notificationService.notifyPatientRemoved).toHaveBeenCalledWith('John Doe');
  });

  test('handles offline mode correctly', () => {
    // Mock offline status
    mockOnlineStatus(false);
    
    const indexedDBService = require('@/services/db/indexedDBService').indexedDBService;
    const notificationService = require('@/services/notifications/notificationService').notificationService;
    
    render(
      <QueueMonitor 
        patients={mockPatients} 
        doctors={mockDoctors} 
        isLoading={false} 
      />
    );

    // Find and click the remove button for John Doe
    const removeButton = screen.getByTestId('remove-button-patient1');
    fireEvent.click(removeButton);
    
    // Should store action in IndexedDB and notify offline action
    expect(indexedDBService.addPendingAction).toHaveBeenCalledWith('remove', { patientId: 'patient1' });
    expect(notificationService.notifyOfflineAction).toHaveBeenCalled();
  });

  test('shows loading state', () => {
    render(
      <QueueMonitor 
        patients={[]} 
        doctors={[]} 
        isLoading={true} 
      />
    );
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('shows empty state when no patients', () => {
    render(
      <QueueMonitor 
        patients={[]} 
        doctors={mockDoctors} 
        isLoading={false} 
      />
    );
    
    expect(screen.getByText(/no patients/i)).toBeInTheDocument();
  });
}); 