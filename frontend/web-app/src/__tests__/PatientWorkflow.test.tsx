import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import { apiService } from '../services/api';

// Mock the API service
jest.mock('../services/api', () => ({
  apiService: {
    getQueue: jest.fn(),
    markPatientSeen: jest.fn(),
    skipPatient: jest.fn(),
    sendNotification: jest.fn(),
    getPatientDetails: jest.fn(),
    savePatientNotes: jest.fn(),
    getNoteHistory: jest.fn(),
    saveNoteVersion: jest.fn(),
    submitConsultation: jest.fn(),
  },
}));

// Mock the auth hook
jest.mock('../hooks/use-auth-context', () => ({
  useAuth: () => ({
    user: { name: 'Dr. Test User', email: 'test@example.com' },
    logout: jest.fn(),
  }),
}));

// Mock rich text editor
jest.mock('../components/dashboard/RichTextEditor', () => {
  return function MockRichTextEditor({ initialValue, onChange }: any) {
    return (
      <div data-testid="mock-rich-text">
        <textarea
          data-testid="mock-rich-text-editor"
          value={initialValue}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  };
});

// Mock Dialog components
jest.mock('@radix-ui/react-dialog', () => {
  return {
    Root: ({ children }: any) => <div data-testid="dialog-root">{children}</div>,
    Trigger: ({ children }: any) => <div data-testid="dialog-trigger">{children}</div>,
    Portal: ({ children }: any) => <div data-testid="dialog-portal">{children}</div>,
    Overlay: ({ children }: any) => <div data-testid="dialog-overlay">{children}</div>,
    Content: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
    Title: ({ children }: any) => <div data-testid="dialog-title">{children}</div>,
    Description: ({ children }: any) => <div data-testid="dialog-description">{children}</div>,
    Close: ({ children }: any) => <div data-testid="dialog-close">{children}</div>,
  };
});

describe('Patient Workflow Integration Tests', () => {
  const mockPatients = [
    {
      id: 'P001',
      name: 'John Doe',
      reason: 'Fever and headache',
      checkInTime: new Date(Date.now() - 3600000).toISOString(),
      priority: 'Medium',
      notes: '<p>Previous notes</p>',
    },
    {
      id: 'P002',
      name: 'Jane Smith',
      reason: 'Annual checkup',
      checkInTime: new Date(Date.now() - 7200000).toISOString(),
      priority: 'Low',
      notes: '',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (apiService.getQueue as jest.Mock).mockResolvedValue({
      success: true,
      data: mockPatients,
    });
  });

  test('should load and display the patient queue', async () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    // Wait for queue to load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Check patients are displayed correctly
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Fever and headache')).toBeInTheDocument();
    expect(screen.getByText('Annual checkup')).toBeInTheDocument();
    
    // Verify API was called
    expect(apiService.getQueue).toHaveBeenCalled();
  });
}); 