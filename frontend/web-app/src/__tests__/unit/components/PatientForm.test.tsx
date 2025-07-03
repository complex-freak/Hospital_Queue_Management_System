import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PatientForm } from '../../../components/PatientForm';
import { QueueService } from '../../../services/queueService';
import { NotificationService } from '../../../services/notificationService';
import { NotificationType } from '../../../types/notification';

// Mock services
jest.mock('../../../services/queueService');
jest.mock('../../../services/notificationService');

describe('PatientForm', () => {
  let mockQueueService: jest.Mocked<QueueService>;
  let mockNotificationService: jest.Mocked<NotificationService>;

  beforeEach(() => {
    // Set up mocks
    mockQueueService = {
      addPatient: jest.fn(),
    } as unknown as jest.Mocked<QueueService>;
    
    mockNotificationService = {
      createNotification: jest.fn(),
      addNotification: jest.fn(),
    } as unknown as jest.Mocked<NotificationService>;
    
    // Mock implementation for createNotification
    (mockNotificationService.createNotification as jest.Mock).mockImplementation((data) => ({
      id: '123',
      title: data.title,
      message: data.message,
      type: data.type,
      timestamp: new Date(),
      read: false,
    }));
  });

  test('renders all form fields', () => {
    render(
      <PatientForm 
        queueService={mockQueueService} 
        notificationService={mockNotificationService} 
      />
    );
    
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/department/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
  });

  test('submits patient data correctly', async () => {
    render(
      <PatientForm 
        queueService={mockQueueService} 
        notificationService={mockNotificationService} 
      />
    );
    
    // Fill in form fields
    await userEvent.type(screen.getByLabelText(/name/i), 'John Doe');
    
    // Select priority
    fireEvent.change(screen.getByLabelText(/priority/i), { 
      target: { value: 'high' } 
    });
    
    // Select department
    fireEvent.change(screen.getByLabelText(/department/i), { 
      target: { value: 'cardiology' } 
    });
    
    // Submit the form
    await userEvent.click(screen.getByRole('button', { name: /register/i }));
    
    // Check if addPatient was called with correct data
    await waitFor(() => {
      expect(mockQueueService.addPatient).toHaveBeenCalledWith(expect.objectContaining({
        name: 'John Doe',
        priority: 'high',
        department: 'cardiology',
        status: 'waiting'
      }));
    });
    
    // Check if notification was created and added
    expect(mockNotificationService.createNotification).toHaveBeenCalledWith(expect.objectContaining({
      title: expect.stringContaining('registered'),
      type: NotificationType.SUCCESS
    }));
    expect(mockNotificationService.addNotification).toHaveBeenCalled();
  });

  test('validates required fields', async () => {
    render(
      <PatientForm 
        queueService={mockQueueService} 
        notificationService={mockNotificationService} 
      />
    );
    
    // Submit form without filling required fields
    await userEvent.click(screen.getByRole('button', { name: /register/i }));
    
    // Check validation errors
    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
    expect(mockQueueService.addPatient).not.toHaveBeenCalled();
  });

  test('resets form after successful submission', async () => {
    render(
      <PatientForm 
        queueService={mockQueueService} 
        notificationService={mockNotificationService} 
      />
    );
    
    // Fill in form fields
    await userEvent.type(screen.getByLabelText(/name/i), 'John Doe');
    fireEvent.change(screen.getByLabelText(/priority/i), { 
      target: { value: 'medium' } 
    });
    fireEvent.change(screen.getByLabelText(/department/i), { 
      target: { value: 'general' } 
    });
    
    // Submit the form
    await userEvent.click(screen.getByRole('button', { name: /register/i }));
    
    // Wait for form reset
    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toHaveValue('');
    });
    
    expect(screen.getByLabelText(/priority/i)).toHaveValue('');
    expect(screen.getByLabelText(/department/i)).toHaveValue('');
  });

  test('handles submission errors', async () => {
    // Mock queue service to throw error
    mockQueueService.addPatient = jest.fn().mockRejectedValueOnce(new Error('Failed to add patient'));
    
    render(
      <PatientForm 
        queueService={mockQueueService} 
        notificationService={mockNotificationService} 
      />
    );
    
    // Fill in form fields
    await userEvent.type(screen.getByLabelText(/name/i), 'John Doe');
    fireEvent.change(screen.getByLabelText(/priority/i), { 
      target: { value: 'low' } 
    });
    fireEvent.change(screen.getByLabelText(/department/i), { 
      target: { value: 'orthopedics' } 
    });
    
    // Submit the form
    await userEvent.click(screen.getByRole('button', { name: /register/i }));
    
    // Check error notification
    await waitFor(() => {
      expect(mockNotificationService.createNotification).toHaveBeenCalledWith(expect.objectContaining({
        type: NotificationType.ERROR
      }));
    });
  });
}); 