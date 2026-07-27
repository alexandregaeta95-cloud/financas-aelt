import { useState, useEffect, useCallback } from 'react';
import { Compromisso, MedicalAppointment, MedicalPrescription } from '../types';
import { agendaService } from '../services/agendaService';

export function useAgenda() {
  const [compromissos, setCompromissos] = useState<Compromisso[]>([]);
  const [appointments, setAppointments] = useState<MedicalAppointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<MedicalPrescription[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const comps = await agendaService.listarCompromissos();
      const appts = await agendaService.listarConsultas();
      const prescs = await agendaService.listarReceitas();
      setCompromissos(comps);
      setAppointments(appts);
      setPrescriptions(prescs);
    } catch (e) {
      console.error('Erro ao carregar dados da agenda:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return {
    compromissos,
    appointments,
    prescriptions,
    loading,
    carregar
  };
}
