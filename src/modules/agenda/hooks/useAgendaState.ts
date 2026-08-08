import { useState } from 'react';
import { Compromisso, MedicalAppointment, MedicalPrescription } from '../../../types';

export function useAgendaState() {
  const [compromissos, setCompromissos] = useState<Compromisso[]>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_compromissos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter(c => c && typeof c === 'object');
      }
    } catch (e) {
      console.error("Failed to parse compromissos state:", e);
    }
    return [];
  });

  const [appointments, setAppointments] = useState<MedicalAppointment[]>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_appointments');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error("Failed to parse appointments state:", e);
    }
    return [];
  });

  const [prescriptions, setPrescriptions] = useState<MedicalPrescription[]>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_prescriptions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error("Failed to parse prescriptions state:", e);
    }
    return [];
  });

  return {
    compromissos,
    setCompromissos,
    appointments,
    setAppointments,
    prescriptions,
    setPrescriptions,
  };
}
