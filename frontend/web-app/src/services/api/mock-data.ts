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

// Mock detailed patient data
export const mockPatientDetails: Record<string, Patient> = {
  'P001': {
    id: 'P001',
    name: 'John Doe',
    reason: 'Fever and headache',
    checkInTime: new Date(Date.now() - 50 * 60000).toISOString(),
    priority: 'Medium',
    age: 45,
    gender: 'Male',
    contactNumber: '555-123-4567',
    vitalSigns: {
      bloodPressure: '120/80',
      heartRate: 85,
      temperature: 38.5,
      respiratoryRate: 18
    },
    allergies: ['Penicillin', 'Pollen'],
    currentMedications: ['Lisinopril 10mg daily', 'Metformin 500mg twice daily'],
    medicalHistory: [
      {
        visitDate: '2023-10-15',
        diagnosis: 'Hypertension',
        treatment: 'Started on Lisinopril 10mg daily',
        notes: 'Patient advised to monitor blood pressure at home and follow a low-sodium diet',
        doctorName: 'Dr. Sarah Lee'
      },
      {
        visitDate: '2023-01-22',
        diagnosis: 'Type 2 Diabetes',
        treatment: 'Started on Metformin 500mg twice daily',
        notes: 'Patient advised on dietary changes and regular exercise',
        doctorName: 'Dr. Mark Wilson'
      }
    ],
    notes: 'Patient has been managing hypertension well, but needs better control of blood glucose.'
  },
  'P002': {
    id: 'P002',
    name: 'Sarah Johnson',
    reason: 'Annual check-up',
    checkInTime: new Date(Date.now() - 35 * 60000).toISOString(),
    priority: 'Low',
    age: 32,
    gender: 'Female',
    contactNumber: '555-234-5678',
    vitalSigns: {
      bloodPressure: '115/75',
      heartRate: 72,
      temperature: 36.8,
      respiratoryRate: 16
    },
    allergies: ['Sulfa drugs'],
    currentMedications: ['Multivitamin daily'],
    medicalHistory: [
      {
        visitDate: '2023-02-10',
        diagnosis: 'Healthy check-up',
        treatment: 'None required',
        notes: 'All vitals within normal ranges, advised on continued healthy lifestyle',
        doctorName: 'Dr. David Chen'
      }
    ],
    notes: 'Patient maintains a healthy lifestyle, exercises regularly.'
  },
  'P003': {
    id: 'P003',
    name: 'Michael Chen',
    reason: 'Chest pain',
    checkInTime: new Date(Date.now() - 10 * 60000).toISOString(),
    priority: 'High',
    age: 58,
    gender: 'Male',
    contactNumber: '555-345-6789',
    vitalSigns: {
      bloodPressure: '145/95',
      heartRate: 95,
      temperature: 36.9,
      respiratoryRate: 22
    },
    allergies: [],
    currentMedications: ['Atorvastatin 20mg daily', 'Aspirin 81mg daily'],
    medicalHistory: [
      {
        visitDate: '2023-08-05',
        diagnosis: 'Hyperlipidemia',
        treatment: 'Started on Atorvastatin 20mg daily',
        notes: 'Recommended low-fat diet and regular exercise',
        doctorName: 'Dr. Elizabeth Taylor'
      },
      {
        visitDate: '2022-11-20',
        diagnosis: 'Coronary Artery Disease',
        treatment: 'Started on Aspirin 81mg daily',
        notes: 'Scheduled stress test, recommended cardiac rehabilitation program',
        doctorName: 'Dr. James Wilson'
      }
    ],
    notes: 'Patient has family history of heart disease. Needs close monitoring of cardiac health.'
  },
  'P004': {
    id: 'P004',
    name: 'Emily Williams',
    reason: 'Skin rash',
    checkInTime: new Date(Date.now() - 25 * 60000).toISOString(),
    priority: 'Medium',
    age: 28,
    gender: 'Female',
    contactNumber: '555-456-7890',
    vitalSigns: {
      bloodPressure: '110/70',
      heartRate: 76,
      temperature: 36.7,
      respiratoryRate: 14
    },
    allergies: ['Latex', 'Shellfish'],
    currentMedications: ['Cetirizine 10mg daily'],
    medicalHistory: [
      {
        visitDate: '2023-05-15',
        diagnosis: 'Allergic rhinitis',
        treatment: 'Started on Cetirizine 10mg daily',
        notes: 'Recommended allergen avoidance, possible referral to allergist if symptoms persist',
        doctorName: 'Dr. Robert Johnson'
      }
    ],
    notes: 'Patient has history of seasonal allergies and occasional eczema flare-ups.'
  },
  'P005': {
    id: 'P005',
    name: 'Robert Garcia',
    reason: 'Follow-up visit',
    checkInTime: new Date(Date.now() - 45 * 60000).toISOString(),
    priority: 'Low',
    age: 52,
    gender: 'Male',
    contactNumber: '555-567-8901',
    vitalSigns: {
      bloodPressure: '130/85',
      heartRate: 80,
      temperature: 36.6,
      respiratoryRate: 16
    },
    allergies: ['Codeine'],
    currentMedications: ['Levothyroxine 75mcg daily', 'Ibuprofen as needed for pain'],
    medicalHistory: [
      {
        visitDate: '2023-07-20',
        diagnosis: 'Hypothyroidism',
        treatment: 'Started on Levothyroxine 50mcg daily, increased to 75mcg after 6 weeks',
        notes: 'TSH levels normalized, continue current dosage',
        doctorName: 'Dr. Jennifer Kim'
      },
      {
        visitDate: '2022-09-10',
        diagnosis: 'Lower back pain',
        treatment: 'Physical therapy, NSAIDs as needed',
        notes: 'Showed improvement with physical therapy, recommended continued exercises',
        doctorName: 'Dr. Michael Brown'
      }
    ],
    notes: 'Patient reports feeling better on current thyroid medication dosage.'
  },
  // Default template for unknown patients
  'default': {
    id: '',
    name: 'Unknown Patient',
    reason: 'Not specified',
    checkInTime: new Date().toISOString(),
    priority: 'Medium',
    age: 0,
    gender: 'Not specified',
    medicalHistory: [],
    notes: 'No previous records found for this patient.'
  }
};
