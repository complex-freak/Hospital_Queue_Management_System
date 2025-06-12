
import { Patient, PriorityLevel } from '@/types/patient';

// Mock API calls for development
export const mockQueue: Patient[] = [
  {
    id: 'P001',
    name: 'John Doe',
    reason: 'Fever and headache',
    checkInTime: new Date(Date.now() - 50 * 60000).toISOString(), // 50 minutes ago
    priority: 'Medium' as PriorityLevel,
  },
  {
    id: 'P002',
    name: 'Sarah Johnson',
    reason: 'Annual check-up',
    checkInTime: new Date(Date.now() - 35 * 60000).toISOString(), // 35 minutes ago
    priority: 'Low' as PriorityLevel,
  },
  {
    id: 'P003',
    name: 'Michael Chen',
    reason: 'Chest pain',
    checkInTime: new Date(Date.now() - 10 * 60000).toISOString(), // 10 minutes ago
    priority: 'High' as PriorityLevel,
  },
  {
    id: 'P004',
    name: 'Emily Williams',
    reason: 'Skin rash',
    checkInTime: new Date(Date.now() - 25 * 60000).toISOString(), // 25 minutes ago
    priority: 'Medium' as PriorityLevel,
  },
  {
    id: 'P005',
    name: 'Robert Garcia',
    reason: 'Follow-up visit',
    checkInTime: new Date(Date.now() - 45 * 60000).toISOString(), // 45 minutes ago
    priority: 'Low' as PriorityLevel,
  },
];
