import React from "react";
import { useNavigate } from "react-router-dom";
import PatientForm from "../../features/patients/components/PatientForm";
import { patientService } from "../../features/patients/services/patientService";
import { PageHeader } from "../../components/ui/PageHeader";
import { Patient } from "../../types";

const PatientRegistration: React.FC = () => {
  const navigate = useNavigate();

  const handleSubmit = async (patient: Patient) => {
    try {
      await patientService.createPatient(patient);
      navigate("/patients");
    } catch (error) {
      console.error("Error creating patient:", error);
      throw new Error("Couldn't save the patient. Please try again.");
    }
  };

  return (
    <div>
      <PageHeader
        title="New patient"
        subtitle="A patient ID is assigned automatically when you save."
      />
      <PatientForm onSubmit={handleSubmit} />
    </div>
  );
};

export default PatientRegistration;
