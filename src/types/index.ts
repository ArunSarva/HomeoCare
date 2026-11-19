// User and Authentication Types
export type UserRole = 'Doctor' | 'Receptionist' | 'Admin';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  name: string;
  photo?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface AuthCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

// Patient Types
export interface Patient {
  id: string;
  patientId: string;
  fullName: string;
  photo?: string;
  dob: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  maritalStatus: 'Single' | 'Married' | 'Divorced' | 'Widowed';
  occupation: string;
  mobile: string;
  whatsapp?: string;
  email?: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  height?: number;
  weight?: number;
  bmi?: number;
  bloodGroup?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'Unknown';
  emergencyContact?: EmergencyContact;
  registrationDate: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  mobile: string;
  email?: string;
}

// Case Types
export interface Case {
  id: string;
  patientId: string;
  patientName: string;
  chiefComplaints: ChiefComplaint[];
  mentalSymptoms: MentalSymptom[];
  physicalGenerals: PhysicalGeneral[];
  thermalState: 'Hot' | 'Cold' | 'Mixed';
  appetite: 'Normal' | 'Increased' | 'Decreased';
  thirst: 'Normal' | 'Increased' | 'Decreased';
  sleep: 'Normal' | 'Disturbed' | 'Excessive';
  dreams?: string;
  stool: 'Normal' | 'Constipation' | 'Diarrhea';
  urine: 'Normal' | 'Excessive' | 'Reduced';
  sweat: 'Normal' | 'Excessive' | 'Reduced';
  foodPreferences: FoodPreferences;
  aversions?: string[];
  cravings?: string[];
  totalDuration: string;
  severity: 'Mild' | 'Moderate' | 'Severe';
  onset: string;
  notes?: string;
  doctorId?: string;
  doctorName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChiefComplaint {
  complaint: string;
  duration: string;
  severity: 'Mild' | 'Moderate' | 'Severe';
  onset: string;
  mentalSymptoms?: string[];
}

export interface MentalSymptom {
  symptom: 'Anxiety' | 'Fear' | 'Anger' | 'Irritability' | 'Jealousy' | 'Grief' | 'Depression' | 'Memory' | 'Other';
  description: string;
  severity: 'Mild' | 'Moderate' | 'Severe';
}

export interface PhysicalGeneral {
  symptom: 'Appetite' | 'Thirst' | 'Sleep' | 'Dreams' | 'Stool' | 'Urine' | 'Sweat' | 'Thermal State';
  description: string;
}

export interface FoodPreferences {
  likes: string[];
  dislikes: string[];
}

// Prescription Types
export interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  medicines: PrescriptionMedicine[];
  notes?: string;
  doctorId: string;
  doctorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface PrescriptionMedicine {
  medicine: string;
  potency: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes?: string;
}

// Follow-Up Types
export interface FollowUp {
  id: string;
  patientId: string;
  patientName: string;
  visitDate: string;
  symptoms: string[];
  improvementPercentage: number;
  aggravation?: string;
  newSymptoms?: string[];
  status: 'Improved' | 'Stable' | 'Worse';
  energyLevel: 'High' | 'Medium' | 'Low';
  prescriptionChanges?: string[];
  nextReview?: string;
  notes: string;
  doctorId: string;
  doctorName: string;
  createdAt: string;
  updatedAt: string;
}

// Appointment Types
export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  type: 'Consultation' | 'Follow-Up' | 'Emergency' | 'Other';
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'No Show';
  reason: string;
  doctorId: string;
  doctorName: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Inventory Types
export interface Inventory {
  id: string;
  medicineName: string;
  batch: string;
  expiryDate: string;
  quantity: number;
  vendor: string;
  unitPrice: number;
  totalValue: number;
  alertLevel: 'Normal' | 'Low Stock' | 'Near Expiry' | 'Expired';
  createdAt: string;
  updatedAt: string;
}

// Billing Types
export interface Billing {
  id: string;
  patientId: string;
  patientName: string;
  consultationFee: number;
  medicineCharges: number;
  followUpCharges: number;
  otherCharges: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentMethod: 'Cash' | 'Card' | 'Online' | 'Upi';
  status: 'Paid' | 'Pending' | 'Partial';
  invoiceNumber: string;
  doctorId?: string;
  doctorName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Sync Queue Types
export interface SyncItem {
  id: string;
  type: 'patient' | 'case' | 'prescription' | 'followup' | 'appointment' | 'inventory' | 'billing';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  status: 'pending' | 'syncing' | 'success' | 'failed';
  retryCount: number;
  lastError?: string;
}

// Toast Types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

// Additional types for existing code compatibility
export type Role = UserRole;

export interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user: User;
  token: string;
  message?: string;
}

export interface KPISummary {
  totalPatients: number;
  todayAppointments: number;
  pendingFollowUps: number;
  activeCases: number;
  monthlyRevenue: number;
  totalPrescriptions: number;
  lowStockAlerts: number;
}
