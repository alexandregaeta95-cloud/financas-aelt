import {
  getCompromissosFromDb,
  saveCompromissoToDb,
  deleteCompromissoFromDb,
  getMedicalAppointmentsFromDb,
  saveMedicalAppointmentToDb,
  deleteMedicalAppointmentFromDb,
  getMedicalPrescriptionsFromDb,
  saveMedicalPrescriptionToDb,
  deleteMedicalPrescriptionFromDb
} from '../../../lib/localSync';

export class AgendaService {
  static async listarCompromissos() {
    return await getCompromissosFromDb();
  }

  static async salvarCompromisso(item: any) {
    return await saveCompromissoToDb(item);
  }

  static async excluirCompromisso(id: string) {
    return await deleteCompromissoFromDb(id);
  }

  static async listarConsultas() {
    return await getMedicalAppointmentsFromDb();
  }

  static async salvarConsulta(appt: any) {
    return await saveMedicalAppointmentToDb(appt);
  }

  static async excluirConsulta(id: string) {
    return await deleteMedicalAppointmentFromDb(id);
  }

  static async listarReceitas() {
    return await getMedicalPrescriptionsFromDb();
  }

  static async salvarReceita(presc: any) {
    return await saveMedicalPrescriptionToDb(presc);
  }

  static async excluirReceita(id: string) {
    return await deleteMedicalPrescriptionFromDb(id);
  }
}

export const agendaService = AgendaService;
