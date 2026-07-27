import {
  getRegisteredVehiclesFromDb,
  saveRegisteredVehicleToDb,
  deleteRegisteredVehicleFromDb,
  getPerformedServicesFromDb,
  savePerformedServiceToDb,
  deletePerformedServiceFromDb,
  getScheduledServicesFromDb,
  saveScheduledServiceToDb,
  deleteScheduledServiceFromDb
} from '../../../lib/localSync';

export class VehicleService {
  static async listarVeiculos() {
    return await getRegisteredVehiclesFromDb();
  }

  static async salvarVeiculo(veiculo: any) {
    return await saveRegisteredVehicleToDb(veiculo);
  }

  static async excluirVeiculo(id: string) {
    return await deleteRegisteredVehicleFromDb(id);
  }

  static async listarServicosRealizados() {
    return await getPerformedServicesFromDb();
  }

  static async salvarServicoRealizado(servico: any) {
    return await savePerformedServiceToDb(servico);
  }

  static async excluirServicoRealizado(id: string) {
    return await deletePerformedServiceFromDb(id);
  }

  static async listarServicosAgendados() {
    return await getScheduledServicesFromDb();
  }

  static async salvarServicoAgendado(servico: any) {
    return await saveScheduledServiceToDb(servico);
  }

  static async excluirServicoAgendado(id: string) {
    return await deleteScheduledServiceFromDb(id);
  }
}

export const vehicleService = VehicleService;
