import { patientService } from '../features/patients/services/patientService';
import { appointmentService } from '../features/appointments/services/appointmentService';
import { caseService } from '../features/cases/services/caseService';
import { prescriptionService } from '../features/prescriptions/services/prescriptionService';
import { followUpService } from '../features/followups/services/followUpService';
import { inventoryService } from '../features/inventory/services/inventoryService';
import { billingService } from '../features/billing/services/billingService';
import { getDB } from '../hooks/useIndexedDB';
import type {
  Patient,
  Appointment,
  Case,
  Prescription,
  FollowUp,
  Inventory,
  Billing,
} from '../types';

/**
 * Fills the app with a realistic-looking demo dataset, entirely through the
 * same service functions the UI calls (patientService.createPatient, etc.),
 * so every record gets a real P000001-style id, passes through the same
 * offline-queue logic, and shows up correctly everywhere the UI reads it
 * (e.g. inventory/billing derive their status badges from quantity/expiry/
 * amounts at read time, not from a stored flag, so this never sets those).
 *
 * Runs in whichever browser tab calls it, because the app's data lives in
 * that browser's own IndexedDB — there is no server-side store to seed.
 */

function iso(dateOnly: Date): string {
  return dateOnly.toISOString().slice(0, 10);
}

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function age(dob: string): number {
  const d = new Date(dob);
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) a -= 1;
  return a;
}

const DOCTOR = { id: '1', name: 'Jonnet' };

const PATIENT_SEEDS: Array<Omit<Patient, 'id' | 'patientId' | 'age' | 'createdAt' | 'updatedAt' | 'registrationDate'> & { dob: string }> = [
  { fullName: 'Ravi Kumar', dob: '1984-03-12', gender: 'Male', maritalStatus: 'Married', occupation: 'Teacher', mobile: '9876543210', whatsapp: '9876543210', email: 'ravi.kumar@example.com', street: '12 MG Road', city: 'Pune', state: 'Maharashtra', pincode: '411001', bloodGroup: 'B+', emergencyContact: { name: 'Sunita Kumar', relationship: 'Spouse', mobile: '9876500001' } },
  { fullName: 'Priya Sharma', dob: '1992-11-30', gender: 'Female', maritalStatus: 'Single', occupation: 'Software Engineer', mobile: '9811122233', whatsapp: '9811122233', email: 'priya.sharma@example.com', street: '45 Nehru Place', city: 'Delhi', state: 'Delhi', pincode: '110019', bloodGroup: 'O+' },
  { fullName: 'Anil Desai', dob: '1958-07-04', gender: 'Male', maritalStatus: 'Married', occupation: 'Retired Bank Manager', mobile: '9822233344', street: '7 Marine Drive', city: 'Mumbai', state: 'Maharashtra', pincode: '400002', bloodGroup: 'A+', emergencyContact: { name: 'Meena Desai', relationship: 'Spouse', mobile: '9822200002' } },
  { fullName: 'Fatima Sheikh', dob: '2016-01-20', gender: 'Female', maritalStatus: 'Single', occupation: 'Student', mobile: '9900011122', street: '3 Charminar Lane', city: 'Hyderabad', state: 'Telangana', pincode: '500002', emergencyContact: { name: 'Imran Sheikh', relationship: 'Father', mobile: '9900000003' } },
  { fullName: 'Arjun Nair', dob: '1999-05-17', gender: 'Male', maritalStatus: 'Single', occupation: 'Graphic Designer', mobile: '9633344455', whatsapp: '9633344455', street: '21 MG Road', city: 'Kochi', state: 'Kerala', pincode: '682011', bloodGroup: 'AB+' },
  { fullName: 'Kavya Menon', dob: '1990-09-08', gender: 'Female', maritalStatus: 'Married', occupation: 'Doctor', mobile: '9445566778', email: 'kavya.menon@example.com', street: '9 Anna Nagar', city: 'Chennai', state: 'Tamil Nadu', pincode: '600040', bloodGroup: 'O-' },
  { fullName: 'Suresh Pillai', dob: '1975-12-25', gender: 'Male', maritalStatus: 'Married', occupation: 'Shopkeeper', mobile: '9887766554', street: '14 Station Road', city: 'Thiruvananthapuram', state: 'Kerala', pincode: '695001', bloodGroup: 'B-' },
  { fullName: 'Meera Iyer', dob: '2001-02-14', gender: 'Female', maritalStatus: 'Single', occupation: 'College Student', mobile: '9900112233', street: '2 T Nagar', city: 'Chennai', state: 'Tamil Nadu', pincode: '600017' },
  { fullName: 'Vikram Singh', dob: '1968-04-02', gender: 'Male', maritalStatus: 'Married', occupation: 'Farmer', mobile: '9811009988', street: 'Village Road', city: 'Jaipur', state: 'Rajasthan', pincode: '302001', bloodGroup: 'A-', emergencyContact: { name: 'Rekha Singh', relationship: 'Spouse', mobile: '9811000004' } },
  { fullName: 'Ananya Gupta', dob: '2010-08-19', gender: 'Female', maritalStatus: 'Single', occupation: 'Student', mobile: '9922334455', street: '18 Park Street', city: 'Kolkata', state: 'West Bengal', pincode: '700016', emergencyContact: { name: 'Rajesh Gupta', relationship: 'Father', mobile: '9922300005' } },
  { fullName: 'Rohan Joshi', dob: '1988-06-11', gender: 'Male', maritalStatus: 'Married', occupation: 'Chartered Accountant', mobile: '9765432109', whatsapp: '9765432109', street: '5 FC Road', city: 'Pune', state: 'Maharashtra', pincode: '411004', bloodGroup: 'B+' },
  { fullName: 'Lakshmi Rao', dob: '1945-10-30', gender: 'Female', maritalStatus: 'Widowed', occupation: 'Retired', mobile: '9600112233', street: '11 Jubilee Hills', city: 'Hyderabad', state: 'Telangana', pincode: '500033', bloodGroup: 'O+', emergencyContact: { name: 'Suresh Rao', relationship: 'Son', mobile: '9600100006' } },
  { fullName: 'Karan Malhotra', dob: '1995-01-09', gender: 'Male', maritalStatus: 'Single', occupation: 'Marketing Executive', mobile: '9871234567', street: '30 Sector 18', city: 'Noida', state: 'Uttar Pradesh', pincode: '201301' },
  { fullName: 'Divya Krishnan', dob: '1983-03-27', gender: 'Female', maritalStatus: 'Married', occupation: 'Homemaker', mobile: '9442233445', street: '4 Gandhi Nagar', city: 'Coimbatore', state: 'Tamil Nadu', pincode: '641009', bloodGroup: 'AB-' },
  { fullName: 'Aditya Verma', dob: '1979-07-22', gender: 'Male', maritalStatus: 'Married', occupation: 'Civil Engineer', mobile: '9810098765', street: '22 Civil Lines', city: 'Lucknow', state: 'Uttar Pradesh', pincode: '226001', bloodGroup: 'A+' },
  { fullName: 'Nisha Patel', dob: '1997-12-05', gender: 'Female', maritalStatus: 'Single', occupation: 'Pharmacist', mobile: '9898765432', email: 'nisha.patel@example.com', street: '8 Law Garden', city: 'Ahmedabad', state: 'Gujarat', pincode: '380006' },
  { fullName: 'Harish Reddy', dob: '1962-02-17', gender: 'Male', maritalStatus: 'Married', occupation: 'Retired Professor', mobile: '9440011223', street: '16 Banjara Hills', city: 'Hyderabad', state: 'Telangana', pincode: '500034', bloodGroup: 'B+', emergencyContact: { name: 'Padma Reddy', relationship: 'Spouse', mobile: '9440000007' } },
  { fullName: 'Simran Kaur', dob: '1993-09-15', gender: 'Female', maritalStatus: 'Married', occupation: 'Teacher', mobile: '9876123450', whatsapp: '9876123450', street: '27 Model Town', city: 'Amritsar', state: 'Punjab', pincode: '143001' },
  { fullName: 'Deepak Chawla', dob: '2005-11-02', gender: 'Male', maritalStatus: 'Single', occupation: 'Student', mobile: '9811223344', street: '6 Sector 9', city: 'Chandigarh', state: 'Punjab', pincode: '160009', emergencyContact: { name: 'Anita Chawla', relationship: 'Mother', mobile: '9811200008' } },
  { fullName: 'Pooja Bhatt', dob: '1986-05-28', gender: 'Female', maritalStatus: 'Married', occupation: 'HR Manager', mobile: '9765098765', street: '10 Race Course Road', city: 'Vadodara', state: 'Gujarat', pincode: '390007', bloodGroup: 'O+' },
  // Additional patients for 2026 demo data
  { fullName: 'Mohit Verma', dob: '1987-02-15', gender: 'Male', maritalStatus: 'Married', occupation: 'Software Developer', mobile: '9876543211', email: 'mohit.verma@example.com', street: '45 Koramangala', city: 'Bengaluru', state: 'Karnataka', pincode: '560034' },
  { fullName: 'Anju Nair', dob: '1995-01-20', gender: 'Female', maritalStatus: 'Single', occupation: 'Content Writer', mobile: '9876543212', email: 'anju.nair@example.com', street: '22 MG Road', city: 'Thrissur', state: 'Kerala', pincode: '680001' },
  { fullName: 'Siddharth Patel', dob: '1982-03-10', gender: 'Male', maritalStatus: 'Married', occupation: 'Chartered Accountant', mobile: '9876543213', email: 'siddharth.patel@example.com', street: '14 Ashok Bridge', city: 'Ahmedabad', state: 'Gujarat', pincode: '380001' },
  { fullName: 'Meenal Sharma', dob: '1990-02-14', gender: 'Female', maritalStatus: 'Married', occupation: 'Teacher', mobile: '9876543214', email: 'meenal.sharma@example.com', street: '52 Defense Colony', city: 'Hyderabad', state: 'Telangana', pincode: '500038' },
  { fullName: 'Rajesh Kumar', dob: '1978-04-22', gender: 'Male', maritalStatus: 'Married', occupation: 'Business Owner', mobile: '9876543215', email: 'rajesh.kumar@example.com', street: '33 GS Road', city: 'Kolkata', state: 'West Bengal', pincode: '700001' },
  { fullName: 'Priyanka Das', dob: '1992-03-18', gender: 'Female', maritalStatus: 'Married', occupation: 'Bank Officer', mobile: '9876543216', email: 'priyanka.das@example.com', street: '15 Elgin Road', city: 'Kolkata', state: 'West Bengal', pincode: '700013' },
  { fullName: 'Amit Mehra', dob: '1985-05-30', gender: 'Male', maritalStatus: 'Married', occupation: 'Engineer', mobile: '9876543217', email: 'amit.mehra@example.com', street: '67 Indiranagar', city: 'Bengaluru', state: 'Karnataka', pincode: '560038' },
  { fullName: 'Sneha Reddy', dob: '1993-04-12', gender: 'Female', maritalStatus: 'Single', occupation: 'Doctor', mobile: '9876543218', email: 'sneha.reddy@example.com', street: '86 Jubilee Hills', city: 'Hyderabad', state: 'Telangana', pincode: '500033' },
  { fullName: 'Vikas Gupta', dob: '1980-06-25', gender: 'Male', maritalStatus: 'Married', occupation: 'Manager', mobile: '9876543219', email: 'vikas.gupta@example.com', street: '21 Park Street', city: 'Kolkata', state: 'West Bengal', pincode: '700016' },
  { fullName: 'Kirti Singh', dob: '1988-05-08', gender: 'Female', maritalStatus: 'Married', occupation: 'HR Professional', mobile: '9876543220', email: 'kirti.singh@example.com', street: '45 Connaught Place', city: 'New Delhi', state: 'Delhi', pincode: '110001' },
  { fullName: 'Arvind Joshi', dob: '1976-07-14', gender: 'Male', maritalStatus: 'Married', occupation: 'Consultant', mobile: '9876543221', email: 'arvind.joshi@example.com', street: '12 Fort', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
  { fullName: 'Pallavi Deshpande', dob: '1991-06-20', gender: 'Female', maritalStatus: 'Married', occupation: 'Researcher', mobile: '9876543222', email: 'pallavi.deshpande@example.com', street: '34 FC Road', city: 'Pune', state: 'Maharashtra', pincode: '411004' },
  { fullName: 'Naveen Kumar', dob: '1983-08-05', gender: 'Male', maritalStatus: 'Married', occupation: 'IT Professional', mobile: '9876543223', email: 'naveen.kumar@example.com', street: '55 Anna Salai', city: 'Chennai', state: 'Tamil Nadu', pincode: '600002' },
  { fullName: 'Lalita Menon', dob: '1989-07-15', gender: 'Female', maritalStatus: 'Married', occupation: 'Consultant', mobile: '9876543224', email: 'lalita.menon@example.com', street: '78 MG Road', city: 'Kochi', state: 'Kerala', pincode: '682011' },
  { fullName: 'Gopal Iyer', dob: '1974-09-10', gender: 'Male', maritalStatus: 'Married', occupation: 'Retired', mobile: '9876543225', email: 'gopal.iyer@example.com', street: '92 Mylapore', city: 'Chennai', state: 'Tamil Nadu', pincode: '600001' },
  { fullName: 'Meenakshi Nair', dob: '1994-08-22', gender: 'Female', maritalStatus: 'Single', occupation: 'Teacher', mobile: '9876543226', email: 'meenakshi.nair@example.com', street: '14 Calicut Beach', city: 'Kozhikode', state: 'Kerala', pincode: '673001' },
  { fullName: 'Ramesh Bhatt', dob: '1977-10-05', gender: 'Male', maritalStatus: 'Married', occupation: 'Businessman', mobile: '9876543227', email: 'ramesh.bhatt@example.com', street: '26 Shahpur', city: 'Jaipur', state: 'Rajasthan', pincode: '302001' },
  { fullName: 'Sunita Choudhary', dob: '1986-09-18', gender: 'Female', maritalStatus: 'Married', occupation: 'Engineer', mobile: '9876543228', email: 'sunita.choudhary@example.com', street: '38 Malviya Nagar', city: 'Jaipur', state: 'Rajasthan', pincode: '302017' },
  { fullName: 'Manoj Kumar', dob: '1981-11-12', gender: 'Male', maritalStatus: 'Married', occupation: 'Sales Executive', mobile: '9876543229', email: 'manoj.kumar@example.com', street: '44 MG Road', city: 'Jaipur', state: 'Rajasthan', pincode: '302001' },
  { fullName: 'Asha Devi', dob: '1990-10-25', gender: 'Female', maritalStatus: 'Married', occupation: 'Homemaker', mobile: '9876543230', email: 'asha.devi@example.com', street: '56 C-Scheme', city: 'Jaipur', state: 'Rajasthan', pincode: '302001' },
];

const CHIEF_COMPLAINTS: Record<string, { complaint: string; duration: string; onset: string }> = {
  migraine: { complaint: 'Recurrent migraine, left-sided, worse in sunlight', duration: '6 months', onset: 'Gradual' },
  knee: { complaint: 'Right knee pain, worse on climbing stairs', duration: '3 months', onset: 'Gradual' },
  allergy: { complaint: 'Allergic rhinitis, sneezing and watery eyes in the morning', duration: '2 years', onset: 'Seasonal' },
  anxiety: { complaint: 'Generalised anxiety with disturbed sleep', duration: '4 months', onset: 'Gradual' },
  eczema: { complaint: 'Itchy skin eruptions on both forearms', duration: '5 months', onset: 'Gradual' },
  gastritis: { complaint: 'Acidity and bloating after meals', duration: '1 year', onset: 'Gradual' },
};

const REMEDIES: Array<{ medicine: string; potency: string }> = [
  { medicine: 'Belladonna', potency: '200C' },
  { medicine: 'Rhus Toxicodendron', potency: '30C' },
  { medicine: 'Allium Cepa', potency: '30C' },
  { medicine: 'Ignatia Amara', potency: '200C' },
  { medicine: 'Sulphur', potency: '200C' },
  { medicine: 'Nux Vomica', potency: '30C' },
  { medicine: 'Lycopodium', potency: '1M' },
  { medicine: 'Pulsatilla', potency: '200C' },
];

export interface SeedSummary {
  patients: number;
  appointments: number;
  cases: number;
  prescriptions: number;
  followUps: number;
  inventory: number;
  billing: number;
}

export interface SeedProgress {
  step: keyof SeedSummary | 'done';
  completed: number;
  total: number;
}

/**
 * Creates the full demo dataset. `onProgress` is optional, for a progress
 * indicator in the UI; this takes a few seconds because every record goes
 * through a real service call, same as a user filling in the form.
 */
export async function seedDemoData(onProgress?: (p: SeedProgress) => void): Promise<SeedSummary> {
  const summary: SeedSummary = { patients: 0, appointments: 0, cases: 0, prescriptions: 0, followUps: 0, inventory: 0, billing: 0 };
  const report = (step: SeedProgress['step'], completed: number, total: number) => onProgress?.({ step, completed, total });

  // ---- Patients: spread registrations across 2026 (Jan to Nov) for patient growth chart ----
  const patients: Patient[] = [];
  
  // Spread registrations across 2026 (Jan to Nov)
  const patientRegistrationMonths = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'];
  const patientsPerMonth = Math.ceil(PATIENT_SEEDS.length / patientRegistrationMonths.length);
  
  for (let i = 0; i < PATIENT_SEEDS.length; i++) {
    const seed = PATIENT_SEEDS[i];
    const monthIndex = Math.floor(i / patientsPerMonth);
    const month = patientRegistrationMonths[Math.min(monthIndex, patientRegistrationMonths.length - 1)];
    const monthDate = new Date(`${month}-15`);
    
    // Calculate registration date within the month
    const registrationDate = iso(monthDate);
    
    const patient = await patientService.createPatient({
      ...seed,
      age: age(seed.dob),
      registrationDate,
      createdBy: DOCTOR.id,
    } as Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>, `${registrationDate}T00:00:00.000Z`);
    patients.push(patient);
    report('patients', i + 1, PATIENT_SEEDS.length);
  }
  summary.patients = patients.length;
  const byName = (name: string) => patients.find(p => p.fullName === name)!;

  // ---- Appointments: spread across all months in 2026 (Jan to Nov) for monthly visits chart ----
  // Define appointments for each month to ensure proper data distribution
  const monthsInYear = [
    { month: '2026-01', offset: 305 },  // January
    { month: '2026-02', offset: 275 },  // February
    { month: '2026-03', offset: 245 },  // March
    { month: '2026-04', offset: 215 },  // April
    { month: '2026-05', offset: 185 },  // May
    { month: '2026-06', offset: 155 },  // June
    { month: '2026-07', offset: 125 },  // July
    { month: '2026-08', offset: 95 },   // August
    { month: '2026-09', offset: 68 },   // September
    { month: '2026-10', offset: 35 },  // October
    { month: '2026-11', offset: 0 },   // November
  ];
  
  const appointmentPlans: Array<Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>> = [];
  
  // Create appointments spread across each month
  monthsInYear.forEach(({ offset }, monthIndex) => {
    // Each month gets 2-3 appointments
    const baseDate = daysFromNow(-offset);
    
    // Create 2-3 appointments per month based on month index
    const appointmentsPerMonth = (monthIndex % 3) + 2; // 2, 3, 2 pattern
    
    for (let apptIdx = 0; apptIdx < appointmentsPerMonth; apptIdx++) {
      const patientNames = [
        'Priya Sharma', 'Anil Desai', 'Fatima Sheikh', 'Arjun Nair', 
        'Kavya Menon', 'Suresh Pillai', 'Vikram Singh', 'Rohan Joshi',
        'Mohit Verma', 'Anju Nair', 'Siddharth Patel', 'Meenal Sharma',
        'Rajesh Kumar', 'Priyanka Das', 'Amit Mehra', 'Sneha Reddy',
        'Vikas Gupta', 'Kirti Singh', 'Arvind Joshi', 'Pallavi Deshpande',
        'Naveen Kumar', 'Lalita Menon', 'Gopal Iyer', 'Meenakshi Nair',
        'Ramesh Bhatt', 'Sunita Choudhary', 'Manoj Kumar', 'Asha Devi'
      ];
      
      const patientName = patientNames[(monthIndex * 3 + apptIdx) % patientNames.length];
      const patient = byName(patientName);
      
      // Vary appointment dates within the month
      const dayOffset = apptIdx * 8 + (monthIndex % 7);
      const aptDate = new Date(baseDate);
      aptDate.setDate(Math.min(28, dayOffset + 3));
      
      // Vary appointment times and statuses
      const times = ['10:00', '11:30', '15:00', '09:30', '16:00', '10:30', '14:00', '11:00'];
      const reasons = [
        'Migraine review', 'Knee pain follow-up', 'Allergic rhinitis, first visit',
        'Eczema, both forearms', 'Anxiety and disturbed sleep', 'Gastritis and bloating',
        'Joint pain review', 'Stress-related headaches', 'General check-up', 'Blood pressure review'
      ];
      
      const aptDateStr = iso(aptDate);
      const timeIndex = (monthIndex * 2 + apptIdx) % times.length;
      
      // Define appointment types as union literal to fix type error
      type AppointmentType = 'Consultation' | 'Follow-Up' | 'Emergency' | 'Other';
      type AppointmentStatus = 'Scheduled' | 'Completed' | 'Cancelled' | 'No Show';
      
      const aptType: AppointmentType = (monthIndex + apptIdx) % 3 === 0 ? 'Consultation' : 
                                      (monthIndex + apptIdx) % 3 === 1 ? 'Follow-Up' : 
                                      'Other';
      const aptStatus: AppointmentStatus = (monthIndex * apptIdx) % 4 === 0 ? 'Scheduled' : 
                                          (monthIndex * apptIdx) % 4 === 1 ? 'Completed' : 
                                          (monthIndex * apptIdx) % 4 === 2 ? 'Cancelled' : 'No Show';
      
      appointmentPlans.push({
        patientId: patient.id,
        patientName: patient.fullName,
        appointmentDate: aptDateStr,
        startTime: times[timeIndex],
        endTime: times[timeIndex] === '10:00' || times[timeIndex] === '09:30' ? '10:30' : 
                 times[timeIndex] === '11:30' ? '12:00' : 
                 times[timeIndex] === '15:00' ? '15:30' : '16:30',
        type: aptType,
        status: aptStatus,
        reason: reasons[(monthIndex * 3 + apptIdx) % reasons.length],
        doctorId: DOCTOR.id,
        doctorName: DOCTOR.name,
      });
    }
  });
  
  // Create additional appointments for November (current month) for variety
  appointmentPlans.push({ patientId: byName('Priya Sharma').id, patientName: 'Priya Sharma', appointmentDate: iso(daysFromNow(0)), startTime: '10:00', endTime: '10:30', type: 'Consultation', status: 'Scheduled', reason: 'Migraine review', doctorId: DOCTOR.id, doctorName: DOCTOR.name });
  appointmentPlans.push({ patientId: byName('Anil Desai').id, patientName: 'Anil Desai', appointmentDate: iso(daysFromNow(0)), startTime: '11:30', endTime: '12:00', type: 'Follow-Up', status: 'Scheduled', reason: 'Knee pain follow-up', doctorId: DOCTOR.id, doctorName: DOCTOR.name });
  appointmentPlans.push({ patientId: byName('Fatima Sheikh').id, patientName: 'Fatima Sheikh', appointmentDate: iso(daysFromNow(0)), startTime: '15:00', endTime: '15:30', type: 'Consultation', status: 'Scheduled', reason: 'Allergic rhinitis, first visit', doctorId: DOCTOR.id, doctorName: DOCTOR.name });
  appointmentPlans.push({ patientId: byName('Arjun Nair').id, patientName: 'Arjun Nair', appointmentDate: iso(daysFromNow(-1)), startTime: '09:30', endTime: '10:00', type: 'Consultation', status: 'Completed', reason: 'Eczema, both forearms', doctorId: DOCTOR.id, doctorName: DOCTOR.name });
  appointmentPlans.push({ patientId: byName('Kavya Menon').id, patientName: 'Kavya Menon', appointmentDate: iso(daysFromNow(-2)), startTime: '16:00', endTime: '16:30', type: 'Consultation', status: 'No Show', reason: 'Anxiety and disturbed sleep', doctorId: DOCTOR.id, doctorName: DOCTOR.name });
  appointmentPlans.push({ patientId: byName('Suresh Pillai').id, patientName: 'Suresh Pillai', appointmentDate: iso(daysFromNow(1)), startTime: '10:00', endTime: '10:30', type: 'Consultation', status: 'Scheduled', reason: 'Gastritis and bloating', doctorId: DOCTOR.id, doctorName: DOCTOR.name });
  appointmentPlans.push({ patientId: byName('Vikram Singh').id, patientName: 'Vikram Singh', appointmentDate: iso(daysFromNow(3)), startTime: '11:00', endTime: '11:30', type: 'Follow-Up', status: 'Scheduled', reason: 'Joint pain review', doctorId: DOCTOR.id, doctorName: DOCTOR.name });
  appointmentPlans.push({ patientId: byName('Rohan Joshi').id, patientName: 'Rohan Joshi', appointmentDate: iso(daysFromNow(-5)), startTime: '14:00', endTime: '14:30', type: 'Consultation', status: 'Cancelled', reason: 'Stress-related headaches', doctorId: DOCTOR.id, doctorName: DOCTOR.name });
  
  for (let i = 0; i < appointmentPlans.length; i++) {
    await appointmentService.createAppointment(appointmentPlans[i]);
    report('appointments', i + 1, appointmentPlans.length);
  }
  summary.appointments = appointmentPlans.length;

  // ---- Cases ----
  const casePlans: Array<{ patient: Patient; complaint: keyof typeof CHIEF_COMPLAINTS; severity: Case['severity']; mental: Case['mentalSymptoms']; thermal: Case['thermalState'] }> = [
    { patient: byName('Priya Sharma'), complaint: 'migraine', severity: 'Moderate', mental: [{ symptom: 'Anxiety', description: 'Worse before deadlines', severity: 'Moderate' }], thermal: 'Hot' },
    { patient: byName('Anil Desai'), complaint: 'knee', severity: 'Moderate', mental: [], thermal: 'Cold' },
    { patient: byName('Fatima Sheikh'), complaint: 'allergy', severity: 'Mild', mental: [], thermal: 'Mixed' },
    { patient: byName('Kavya Menon'), complaint: 'anxiety', severity: 'Severe', mental: [{ symptom: 'Anxiety', description: 'Constant worry, worse at night', severity: 'Severe' }, { symptom: 'Fear', description: 'Fear of losing control', severity: 'Moderate' }], thermal: 'Hot' },
    { patient: byName('Arjun Nair'), complaint: 'eczema', severity: 'Moderate', mental: [], thermal: 'Hot' },
    { patient: byName('Suresh Pillai'), complaint: 'gastritis', severity: 'Mild', mental: [], thermal: 'Mixed' },
  ];
  for (let i = 0; i < casePlans.length; i++) {
    const { patient, complaint, severity, mental, thermal } = casePlans[i];
    const c = CHIEF_COMPLAINTS[complaint];
    await caseService.createCase({
      patientId: patient.id,
      patientName: patient.fullName,
      chiefComplaints: [{ complaint: c.complaint, duration: c.duration, severity, onset: c.onset }],
      mentalSymptoms: mental,
      physicalGenerals: [],
      thermalState: thermal,
      appetite: 'Normal',
      thirst: 'Normal',
      sleep: complaint === 'anxiety' ? 'Disturbed' : 'Normal',
      stool: 'Normal',
      urine: 'Normal',
      sweat: 'Normal',
      foodPreferences: { likes: [], dislikes: [] },
      totalDuration: c.duration,
      severity,
      onset: c.onset,
      doctorId: DOCTOR.id,
      doctorName: DOCTOR.name,
    } as Omit<Case, 'id' | 'createdAt' | 'updatedAt'>);
    report('cases', i + 1, casePlans.length);
  }
  summary.cases = casePlans.length;

  // ---- Prescriptions ----
  const prescriptionPlans: Array<{ patient: Patient; remedyIndex: number; dosage: string; frequency: string; duration: string }> = [
    { patient: byName('Priya Sharma'), remedyIndex: 0, dosage: '4 pills', frequency: 'Twice daily', duration: '2 weeks' },
    { patient: byName('Anil Desai'), remedyIndex: 1, dosage: '2 drops', frequency: 'Three times daily', duration: '3 weeks' },
    { patient: byName('Fatima Sheikh'), remedyIndex: 2, dosage: '4 pills', frequency: 'Once daily', duration: '1 month' },
    { patient: byName('Kavya Menon'), remedyIndex: 3, dosage: '4 pills', frequency: 'Once at night', duration: '1 month' },
    { patient: byName('Arjun Nair'), remedyIndex: 4, dosage: '4 pills', frequency: 'Twice daily', duration: '2 weeks' },
    { patient: byName('Suresh Pillai'), remedyIndex: 5, dosage: '2 drops', frequency: 'Before meals', duration: '2 weeks' },
  ];
  for (let i = 0; i < prescriptionPlans.length; i++) {
    const { patient, remedyIndex, dosage, frequency, duration } = prescriptionPlans[i];
    const remedy = REMEDIES[remedyIndex];
    await prescriptionService.createPrescription({
      patientId: patient.patientId,
      patientName: patient.fullName,
      medicines: [{ medicine: remedy.medicine, potency: remedy.potency, dosage, frequency, duration }],
      notes: 'Avoid coffee and mint while on this remedy.',
      doctorId: DOCTOR.id,
      doctorName: DOCTOR.name,
    } as Omit<Prescription, 'id' | 'createdAt' | 'updatedAt'>);
    report('prescriptions', i + 1, prescriptionPlans.length);
  }
  summary.prescriptions = prescriptionPlans.length;

  // ---- Follow-ups: overdue, due today, due soon and further out ----
  const followUpPlans: Array<{ patient: Patient; improvement: number; status: FollowUp['status']; energy: FollowUp['energyLevel']; nextReviewDays: number; aggravation?: string }> = [
    { patient: byName('Rohan Joshi'), improvement: 20, status: 'Worse', energy: 'Low', nextReviewDays: -3, aggravation: 'Stress at work' },
    { patient: byName('Lakshmi Rao'), improvement: 40, status: 'Stable', energy: 'Medium', nextReviewDays: 0 },
    { patient: byName('Karan Malhotra'), improvement: 55, status: 'Improved', energy: 'Medium', nextReviewDays: 1 },
    { patient: byName('Divya Krishnan'), improvement: 70, status: 'Improved', energy: 'High', nextReviewDays: 2, aggravation: 'Cold weather' },
    { patient: byName('Aditya Verma'), improvement: 30, status: 'Stable', energy: 'Low', nextReviewDays: 5 },
    { patient: byName('Nisha Patel'), improvement: 80, status: 'Improved', energy: 'High', nextReviewDays: 14 },
  ];
  for (let i = 0; i < followUpPlans.length; i++) {
    const { patient, improvement, status, energy, nextReviewDays, aggravation } = followUpPlans[i];
    await followUpService.createFollowUp({
      patientId: patient.id,
      patientName: patient.fullName,
      visitDate: iso(daysFromNow(0)),
      symptoms: ['General check-up'],
      improvementPercentage: improvement,
      aggravation,
      newSymptoms: [],
      status,
      energyLevel: energy,
      prescriptionChanges: [],
      nextReview: iso(daysFromNow(nextReviewDays)),
      notes: '',
      doctorId: DOCTOR.id,
      doctorName: DOCTOR.name,
    } as Omit<FollowUp, 'id' | 'createdAt' | 'updatedAt'>);
    report('followUps', i + 1, followUpPlans.length);
  }
  summary.followUps = followUpPlans.length;

  // ---- Inventory: one of each alert state (computed from quantity/expiry
  // at read time, so these combinations are what trigger each badge) ----
  const inventoryPlans: Array<Omit<Inventory, 'id' | 'createdAt' | 'updatedAt' | 'totalValue' | 'alertLevel'>> = [
    { medicineName: 'Arnica Montana 30C', batch: 'AR-2401', expiryDate: iso(daysFromNow(400)), quantity: 120, vendor: 'SBL Pharma', unitPrice: 85 },
    { medicineName: 'Nux Vomica 200C', batch: 'NV-2399', expiryDate: iso(daysFromNow(400)), quantity: 4, vendor: 'SBL Pharma', unitPrice: 110 },
    { medicineName: 'Belladonna 200C', batch: 'BE-2388', expiryDate: iso(daysFromNow(20)), quantity: 60, vendor: 'Schwabe', unitPrice: 95 },
    { medicineName: 'Rhus Tox 30C', batch: 'RT-2350', expiryDate: iso(daysFromNow(-10)), quantity: 15, vendor: 'Schwabe', unitPrice: 90 },
    { medicineName: 'Sulphur 200C', batch: 'SU-2410', expiryDate: iso(daysFromNow(500)), quantity: 80, vendor: 'SBL Pharma', unitPrice: 75 },
    { medicineName: 'Pulsatilla 200C', batch: 'PU-2405', expiryDate: iso(daysFromNow(450)), quantity: 50, vendor: 'Dr. Reckeweg', unitPrice: 120 },
  ];
  for (let i = 0; i < inventoryPlans.length; i++) {
    const p = inventoryPlans[i];
    await inventoryService.createInventoryItem({ ...p, totalValue: p.quantity * p.unitPrice, alertLevel: 'Normal' });
    report('inventory', i + 1, inventoryPlans.length);
  }
  summary.inventory = inventoryPlans.length;

  // ---- Billing: Spread across all months in 2026 (Jan to Nov) for professional charts ----
  function billFrom(patient: Patient, consultationFee: number, medicineCharges: number, status: Billing['status'], paymentMethod: Billing['paymentMethod'], daysAgo: number): Omit<Billing, 'id' | 'createdAt' | 'updatedAt'> {
    const totalAmount = consultationFee + medicineCharges;
    const paidAmount = status === 'Paid' ? totalAmount : status === 'Partial' ? Math.round(totalAmount * 0.5) : 0;
    const d = daysFromNow(-daysAgo);
    return {
      patientId: patient.id,
      patientName: patient.fullName,
      consultationFee,
      medicineCharges,
      followUpCharges: 0,
      otherCharges: 0,
      discount: 0,
      totalAmount,
      paidAmount,
      balanceAmount: totalAmount - paidAmount,
      paymentMethod,
      status,
      invoiceNumber: `INV-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(1000 + Math.floor(Math.random() * 9000))}`,
      doctorId: DOCTOR.id,
      doctorName: DOCTOR.name,
    };
  }
  
  // This creates data for the revenue trend chart and analytics - upward trend from Jan to Nov
  const billingPlans: Array<{ data: Omit<Billing, 'id' | 'createdAt' | 'updatedAt'>; createdAt: string }> = [];
  
  // January 2026 (lowest revenue - starting month)
  billingPlans.push({ data: billFrom(byName('Nisha Patel'), 300, 100, 'Paid', 'Cash', 305), createdAt: '2026-01-15T00:00:00.000Z' });
  billingPlans.push({ data: billFrom(byName('Pooja Bhatt'), 300, 150, 'Paid', 'Online', 312), createdAt: '2026-01-08T00:00:00.000Z' });
  billingPlans.push({ data: billFrom(byName('Ravi Kumar'), 350, 120, 'Paid', 'Card', 320), createdAt: '2026-01-01T00:00:00.000Z' });
  
  // February 2026
  billingPlans.push({ data: billFrom(byName('Deepak Chawla'), 400, 150, 'Paid', 'Cash', 275), createdAt: '2026-02-15T00:00:00.000Z' });
  billingPlans.push({ data: billFrom(byName('Simran Kaur'), 400, 120, 'Partial', 'Upi', 282), createdAt: '2026-02-08T00:00:00.000Z' });
  billingPlans.push({ data: billFrom(byName('Aditya Verma'), 450, 100, 'Paid', 'Card', 290), createdAt: '2026-02-01T00:00:00.000Z' });
  
  // March 2026
  billingPlans.push({ data: billFrom(byName('Suresh Pillai'), 450, 120, 'Paid', 'Cash', 245), createdAt: '2026-03-15T00:00:00.000Z' });
  billingPlans.push({ data: billFrom(byName('Vikram Singh'), 450, 160, 'Paid', 'Card', 252), createdAt: '2026-03-08T00:00:00.000Z' });
  billingPlans.push({ data: billFrom(byName('Lakshmi Rao'), 500, 100, 'Paid', 'Online', 260), createdAt: '2026-03-01T00:00:00.000Z' });
  
  // April 2026
  billingPlans.push({ data: billFrom(byName('Fatima Sheikh'), 500, 120, 'Paid', 'Cash', 215), createdAt: '2026-04-15T00:00:00.000Z' });
  billingPlans.push({ data: billFrom(byName('Kavya Menon'), 600, 150, 'Paid', 'Online', 222), createdAt: '2026-04-08T00:00:00.000Z' });
  billingPlans.push({ data: billFrom(byName('Arjun Nair'), 500, 180, 'Partial', 'Card', 230), createdAt: '2026-04-01T00:00:00.000Z' });
  
  // May 2026
  billingPlans.push({ data: billFrom(byName('Ravi Kumar'), 500, 200, 'Paid', 'Cash', 185), createdAt: '2026-05-15T00:00:00.000Z' });
  billingPlans.push({ data: billFrom(byName('Priya Sharma'), 600, 100, 'Paid', 'Upi', 192), createdAt: '2026-05-08T00:00:00.000Z' });
  billingPlans.push({ data: billFrom(byName('Anil Desai'), 500, 150, 'Paid', 'Card', 200), createdAt: '2026-05-01T00:00:00.000Z' });
  
  // June 2026
  billingPlans.push({ data: billFrom(byName('Harish Reddy'), 600, 100, 'Paid', 'Cash', 155), createdAt: '2026-06-15T00:00:00.000Z' });
  billingPlans.push({ data: billFrom(byName('Karan Malhotra'), 500, 180, 'Partial', 'Online', 162), createdAt: '2026-06-08T00:00:00.000Z' });
  billingPlans.push({ data: billFrom(byName('Divya Krishnan'), 550, 150, 'Paid', 'Card', 170), createdAt: '2026-06-01T00:00:00.000Z' });
  
  // July 2026
  billingPlans.push({ data: billFrom(byName('Aditya Verma'), 600, 150, 'Paid', 'Online', 125), createdAt: '2026-07-17T00:00:00.000Z' });
  billingPlans.push({ data: billFrom(byName('Nisha Patel'), 600, 120, 'Paid', 'Cash', 132), createdAt: '2026-07-10T00:00:00.000Z' });
  billingPlans.push({ data: billFrom(byName('Pooja Bhatt'), 550, 150, 'Paid', 'Card', 140), createdAt: '2026-07-02T00:00:00.000Z' });
  
  // August 2026
  billingPlans.push({ data: billFrom(byName('Lakshmi Rao'), 600, 180, 'Paid', 'Cash', 95), createdAt: '2026-08-16T00:00:00.000Z' });
  billingPlans.push({ data: billFrom(byName('Deepak Chawla'), 700, 200, 'Paid', 'Card', 102), createdAt: '2026-08-09T00:00:00.000Z' });
  billingPlans.push({ data: billFrom(byName('Simran Kaur'), 600, 100, 'Partial', 'Upi', 110), createdAt: '2026-08-01T00:00:00.000Z' });
  
  // September 2026
  billingPlans.push({ data: billFrom(byName('Arjun Nair'), 600, 180, 'Paid', 'Card', 60), createdAt: '2026-09-20T00:00:00.000Z' });
  billingPlans.push({ data: billFrom(byName('Suresh Pillai'), 600, 120, 'Paid', 'Cash', 68), createdAt: '2026-09-12T00:00:00.000Z' });
  billingPlans.push({ data: billFrom(byName('Vikram Singh'), 600, 150, 'Paid', 'Online', 75), createdAt: '2026-09-05T00:00:00.000Z' });
  
  // October 2026
  billingPlans.push({ data: billFrom(byName('Rohan Joshi'), 650, 150, 'Paid', 'Cash', 30), createdAt: '2026-10-20T00:00:00.000Z' });
  billingPlans.push({ data: billFrom(byName('Kavya Menon'), 700, 100, 'Paid', 'Online', 35), createdAt: '2026-10-15T00:00:00.000Z' });
  billingPlans.push({ data: billFrom(byName('Fatima Sheikh'), 600, 180, 'Partial', 'Upi', 42), createdAt: '2026-10-08T00:00:00.000Z' });
  
  // November 2026 (highest revenue - current month)
  billingPlans.push({ data: billFrom(byName('Priya Sharma'), 700, 300, 'Paid', 'Cash', 0), createdAt: '2026-11-19T00:00:00.000Z' });
  billingPlans.push({ data: billFrom(byName('Anil Desai'), 700, 400, 'Paid', 'Card', 2), createdAt: '2026-11-17T00:00:00.000Z' });
  
  for (let i = 0; i < billingPlans.length; i++) {
    const { data, createdAt } = billingPlans[i];
    await billingService.createBilling(data, createdAt);
    report('billing', i + 1, billingPlans.length);
  }
  summary.billing = billingPlans.length;

  report('done', 1, 1);
  return summary;
}

// Batches used by the demo inventory above; with the medicine name they
// identify demo stock without touching items the clinic added itself.
const DEMO_STOCK = [
  ['Arnica Montana 30C', 'AR-2401'], ['Nux Vomica 200C', 'NV-2399'], ['Belladonna 200C', 'BE-2388'],
  ['Rhus Tox 30C', 'RT-2350'], ['Sulphur 200C', 'SU-2410'], ['Pulsatilla 200C', 'PU-2405'],
];

export type RemoveSummary = SeedSummary;

function getAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    if (!db.objectStoreNames.contains(store)) { resolve([]); return; }
    const req = db.transaction(store, 'readonly').objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

function deleteKeys(db: IDBDatabase, store: string, keys: IDBValidKey[]): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!keys.length || !db.objectStoreNames.contains(store)) { resolve(); return; }
    const tx = db.transaction(store, 'readwrite');
    const os = tx.objectStore(store);
    keys.forEach((k) => os.delete(k));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/**
 * Removes the records created by seedDemoData: the 20 demo patients (matched
 * by name and mobile), every appointment, case, prescription, follow-up and
 * bill belonging to those patients, the 6 demo stock batches, and any pending
 * sync-queue entries for them. Records the clinic entered itself stay, unless
 * they were attached to a demo patient.
 */
export async function removeDemoData(): Promise<RemoveSummary> {
  const db = await getDB();
  const demoKeys = new Set(PATIENT_SEEDS.map((p) => `${p.fullName}|${p.mobile}`));
  const patients = (await getAll<Patient>(db, 'patients')).filter((p) => demoKeys.has(`${p.fullName}|${p.mobile}`));
  const owners = new Set<string>();
  patients.forEach((p) => { owners.add(p.id); if (p.patientId) owners.add(p.patientId); });
  const owned = async <T extends { id: string; patientId: string }>(store: string) =>
    (await getAll<T>(db, store)).filter((r) => owners.has(r.patientId)).map((r) => r.id);

  const removed: Record<string, string[]> = {
    patients: patients.map((p) => p.id),
    appointments: await owned<Appointment>('appointments'),
    cases: await owned<Case>('cases'),
    prescriptions: await owned<Prescription>('prescriptions'),
    followups: await owned<FollowUp>('followups'),
    billing: await owned<Billing>('billing'),
    inventory: (await getAll<Inventory>(db, 'inventory'))
      .filter((i) => DEMO_STOCK.some(([name, batch]) => i.medicineName === name && i.batch === batch))
      .map((i) => i.id),
  };
  for (const [store, ids] of Object.entries(removed)) await deleteKeys(db, store, ids);

  // Drop queued uploads for the removed records so nothing is synced later.
  const allIds = new Set(Object.values(removed).flat());
  if (allIds.size && db.objectStoreNames.contains('syncQueue')) {
    const queueStore = db.transaction('syncQueue', 'readonly').objectStore('syncQueue');
    const keyPath = queueStore.keyPath as string;
    const queued = await getAll<Record<string, unknown>>(db, 'syncQueue');
    const stale = queued
      .filter((q) => { const s = JSON.stringify(q); for (const id of allIds) if (s.includes(id)) return true; return false; })
      .map((q) => q[keyPath] as IDBValidKey)
      .filter((k) => k !== undefined);
    await deleteKeys(db, 'syncQueue', stale);
  }

  return {
    patients: removed.patients.length,
    appointments: removed.appointments.length,
    cases: removed.cases.length,
    prescriptions: removed.prescriptions.length,
    followUps: removed.followups.length,
    inventory: removed.inventory.length,
    billing: removed.billing.length,
  };
}

export default seedDemoData;
