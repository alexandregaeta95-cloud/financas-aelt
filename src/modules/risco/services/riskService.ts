import {
  getRiskZonesFromDb,
  saveRiskZoneToDb,
  deleteRiskZoneFromDb,
  getInfractionsFromDb,
  saveInfractionToDb,
  deleteInfractionFromDb
} from '../../../lib/localSync';

export class RiskService {
  static async listarZonasRisco() {
    return await getRiskZonesFromDb();
  }

  static async salvarZonaRisco(zone: any) {
    return await saveRiskZoneToDb(zone);
  }

  static async excluirZonaRisco(id: number | string) {
    return await deleteRiskZoneFromDb(id);
  }

  static async listarInfracoes() {
    return await getInfractionsFromDb();
  }

  static async salvarInfracao(inf: any) {
    return await saveInfractionToDb(inf);
  }

  static async excluirInfracao(id: number | string) {
    return await deleteInfractionFromDb(id);
  }
}

export const riskService = RiskService;
