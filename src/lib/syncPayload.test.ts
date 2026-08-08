import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { buildSyncPayload, GoogleSyncPayload, MappedTransaction } from './googleAuth';
import type {
  Transaction,
  RegisteredVehicle,
  MedicalAppointment,
  RiskZone,
  WorkshopItem,
  Compromisso,
  Infraction,
  MedicalPrescription,
  BankAccount,
  CreditCard
} from '../types';

describe('Synchronization Payload Engine Tests (buildSyncPayload)', () => {
  it('should build a complete sync payload with all required properties for Apps Script', () => {
    const sampleTransactions: Transaction[] = [
      {
        id: 1,
        data: '2025-05-10',
        descricao: 'Gasolina Shell',
        valor: 250.0,
        valorPg: 250.0,
        tipo: 'DESPESA',
        categoria: 'ABASTECIMENTO',
        status: 'PAGO',
        km: 45000,
        litros: 40,
        precoLitro: 6.25,
        completouTanque: true,
        kmPercorrido: 480,
        mediaKmL: 12.0,
        veiculo: 'v-1',
        descricaoVeiculo: 'Honda Civic',
        motorista: 'Gaeta',
        nomePosto: 'Posto Shell Central',
        localizacaoPosto: 'Av. Paulista',
        obs: 'Abastecimento completo'
      },
      {
        id: 2,
        data: '2025-05-11',
        descricao: 'Supermercado',
        valor: 180.5,
        tipo: 'DESPESA',
        categoria: 'ALIMENTACAO',
        status: 'PAGO'
      }
    ];

    const sampleVehicles: RegisteredVehicle[] = [
      {
        id: 'v-1',
        descricao: 'Honda Civic 2.0',
        motorista: 'Gaeta',
        placa: 'ABC-1234',
        renavan: '123456789',
        chassi: '9BWZZZ377VT000001',
        marca: 'Honda',
        modelo: 'Civic',
        ano: 2021,
        anoFabricacao: 2020
      }
    ];

    const sampleAppointments: MedicalAppointment[] = [
      {
        id: 'app-1',
        especialidade: 'Cardiologia',
        medico: 'Dr. Silva',
        data: '2025-06-01',
        hora: '14:30',
        local: 'Hospital Albert Einstein',
        lembreteAtivo: true,
        status: 'Agendada',
        observacoes: 'Exame de rotina'
      }
    ];

    const sampleRiskZones: RiskZone[] = [
      {
        id: 1,
        localizacao: '-23.5505, -46.6333',
        latitude: -23.5505,
        longitude: -46.6333,
        latitudi: '-23.5505',
        nomeLocal: 'Cruzamento Perigoso',
        descricao: 'Cruzamento Perigoso',
        nivelRisco: 'ALTO',
        nivelDeRisco: 'ALTO',
        raioMetros: 200,
        raioM: 200,
        ativo: true,
        mensagemDeAlerta: 'Cuidado com assaltos à noite',
        dataRegistro: '10/05/2025'
      }
    ];

    const sampleWorkshop: WorkshopItem[] = [
      {
        id: 'ws-1',
        data: '2025-04-15',
        descricao: 'Troca de Óleo e Filtros',
        km: 44000,
        valorAPG: 0,
        valorPago: 350,
        oficinaNome: 'Oficina do Zé',
        comprovanteUrl: 'http://example.com/receipt.pdf',
        observacoes: 'Óleo sintético 5W30',
        veiculoId: 'v-1'
      }
    ];

    const sampleCompromissos: Compromisso[] = [
      {
        id: 'comp-1',
        titulo: 'Reunião de Alinhamento',
        data: '2025-05-12',
        hora: '10:00',
        descricao: 'Alinhamento mensal',
        cor: '#3b82f6',
        piscando: false,
        lembreteAtivo: true,
        diasAntecedencia: 2,
        concluido: false
      }
    ];

    const sampleInfractions: Infraction[] = [
      {
        id: 'inf-1',
        protocolo: 'PROT-001',
        titulo: 'Excesso de Velocidade',
        veiculo: 'Honda Civic',
        placa: 'ABC-1234',
        dataSubmissao: '2025-03-01',
        dataOcorrencia: '2025-03-01',
        localizacao: 'Marginal Pinheiros',
        status: 'EM_ANALISE',
        valorMulta: 195.23,
        pontosCnh: 5,
        justificativa: 'Aguardando recurso',
        evidencias: []
      }
    ];

    const samplePrescriptions: MedicalPrescription[] = [
      {
        id: 'presc-1',
        medico: 'Dr. Silva',
        especialidade: 'Clínico Geral',
        data: '2025-05-01',
        medicamentos: 'Dipirona 500mg - 1 comprimido a cada 6 horas',
        instrucoes: 'Tomar com água após as refeições',
        dataVencimento: '2025-06-01'
      }
    ];

    const sampleBankAccounts: BankAccount[] = [
      {
        id: 1,
        nome: 'Conta Corrente Itaú',
        tipo: 'BANCO',
        saldoInicial: 5000,
        agencia: '1234',
        conta: '56789-0',
        limite: 1000
      }
    ];

    const sampleCreditCards: CreditCard[] = [
      {
        id: 1,
        nome: 'Itaú Personalité Visa',
        tipo: 'CARTÃO',
        limite: 15000,
        gasto: 3000,
        diaVencimento: 5
      }
    ];

    const payload: GoogleSyncPayload = buildSyncPayload(
      'spreadsheet-123',
      sampleTransactions,
      sampleInfractions,
      sampleRiskZones,
      sampleAppointments,
      samplePrescriptions,
      sampleCompromissos,
      sampleVehicles,
      sampleWorkshop,
      [],
      sampleBankAccounts,
      sampleCreditCards,
      {},
      [],
      [],
      false,
      2,
      [],
      [],
      [],
      [],
      [],
      ['del-1']
    );

    expect(payload.action).toBe('syncData');
    expect(payload.spreadsheetId).toBe('spreadsheet-123');
    expect(payload.forceOverwrite).toBe(false);
    expect(payload.deletedIds).toEqual(['del-1']);

    // Check module structure availability
    expect(payload.transactions).toHaveLength(2);
    expect(payload.abastecimentos).toHaveLength(1);
    expect(payload['4_Abastecimentos']).toHaveLength(1);
    expect(payload.registeredVehicles).toHaveLength(1);
    expect(payload['9_Veiculos']).toHaveLength(1);
    expect(payload.appointments).toHaveLength(1);
    expect(payload['6_Consultas_Médicas']).toHaveLength(1);
    expect(payload.riskZones).toHaveLength(1);
    expect(payload.performedServices).toHaveLength(1);
    expect(payload['14_Oficina']).toHaveLength(1);
    expect(payload.compromissos).toHaveLength(1);
    expect(payload['19_Agenda_E_Compromissos']).toHaveLength(1);
    expect(payload.infractions).toHaveLength(1);
    expect(payload.prescriptions).toHaveLength(1);
    expect(payload.bankAccounts).toHaveLength(1);
    expect(payload.creditCards).toHaveLength(1);
  });

  it('REGRESSION TEST: 4_Abastecimentos must be sent in payload and retain all 24 explicit column aliases', () => {
    const fuelTransaction: Transaction = {
      id: 99,
      data: '2025-05-10',
      descricao: 'Gasolina Grid',
      valor: 300.0,
      valorPg: 300.0,
      bancoId: 1,
      cartaoId: 'card-1',
      formaPagamento: 'CARTAO_CREDITO',
      tipo: 'DESPESA',
      categoria: 'ABASTECIMENTO',
      status: 'PAGO',
      km: 50000,
      litros: 50,
      precoLitro: 6.0,
      completouTanque: true,
      kmPercorrido: 600,
      mediaKmL: 12.0,
      veiculo: 'v-1',
      descricaoVeiculo: 'Honda Civic',
      motorista: 'Gaeta',
      nomePosto: 'Posto Petrobras',
      localizacaoPosto: 'Av. Brasil',
      comprovanteUrl: 'http://example.com/receipt.jpg',
      obs: 'Tanque cheio'
    };

    const payload = buildSyncPayload(
      'spreadsheet-123',
      [fuelTransaction],
      [], [], [], [], [], [], [], [], [], [], {}, [], [], false, 1, [], [], [], [], [], []
    );

    expect(payload['4_Abastecimentos']).toBeDefined();
    expect(payload['4_Abastecimentos']).toHaveLength(1);

    const fuelItem = payload['4_Abastecimentos'][0] as MappedTransaction;

    // Verify presence of all 24 explicit column header aliases required for Aba 4_Abastecimentos
    const expectedAliases = [
      'ID',
      'Data',
      'Descrição',
      'Valor',
      'Valor_PG',
      'Banco_Id',
      'Cartão_Id',
      'Forma_Pagamento',
      'Tipo',
      'Categoria',
      'Status',
      'KM',
      'Litros',
      'Preço_Litro',
      'Completou_O_Tanque',
      'KM_Percorrido',
      'Média_(Km/L)',
      'Veiculo',
      'Descrição_Do_Veículo',
      'Motorista',
      'Nome_Posto',
      'Localização_Do_Posto',
      'Comprovante_Url',
      'OBS'
    ];

    for (const alias of expectedAliases) {
      expect(fuelItem).toHaveProperty(alias);
      expect((fuelItem as unknown as Record<string, unknown>)[alias]).not.toBeUndefined();
    }

    expect(fuelItem.ID).toBe('99');
    expect(fuelItem.Data).toBe('10/05/2025');
    expect(fuelItem.Descrição).toBe('Gasolina Grid');
    expect(fuelItem.Valor).toBe(300);
    expect(fuelItem.Completou_O_Tanque).toBe('SIM');
  });

  it('REGRESSION CONTRACT TEST: every frontend payload key must still be read by Codigo.gs for the matching aba', () => {
    // This test reads the REAL Codigo.gs source (single source of truth per
    // google_apps_script_code.gs) and fails if the backend stops reading a key
    // that the frontend sends, or stops referencing the sheet it maps to.
    const codigoGsPath = resolve(__dirname, '../../Codigo.gs');
    const codigoGsSource = readFileSync(codigoGsPath, 'utf-8');

    const moduleContracts: Array<{
      frontendKey: keyof GoogleSyncPayload;
      backendReadPattern: RegExp;
      backendPrimaryName: string;
    }> = [
      { frontendKey: 'transactions', backendReadPattern: /payload\.transactions/, backendPrimaryName: '1_Lancamentos' },
      { frontendKey: '4_Abastecimentos', backendReadPattern: /payload\['4_Abastecimentos'\]/, backendPrimaryName: '4_Abastecimentos' },
      { frontendKey: 'riskZones', backendReadPattern: /payload\.riskZones/, backendPrimaryName: '17_Zonas_De_Risco' },
      { frontendKey: '6_Consultas_Médicas', backendReadPattern: /payload\['6_Consultas_Médicas'\]/, backendPrimaryName: '6_Consultas_Médicas' },
      { frontendKey: 'prescriptions', backendReadPattern: /payload\.prescriptions/, backendPrimaryName: '7_Receitas_Médicas' },
      { frontendKey: 'infractions', backendReadPattern: /payload\.infractions/, backendPrimaryName: '8_Infracoes' },
      { frontendKey: '9_Veiculos', backendReadPattern: /payload\['9_Veiculos'\]/, backendPrimaryName: '9_Veiculos' },
      { frontendKey: 'categoryBudgets', backendReadPattern: /payload\.categoryBudgets/, backendPrimaryName: '10_Metas_De_Categoria' },
      { frontendKey: 'customCategories', backendReadPattern: /payload\.customCategories/, backendPrimaryName: '11_Categorias_Customizadas' },
      { frontendKey: 'analysis', backendReadPattern: /payload\.analysis/, backendPrimaryName: '12_Analises' },
      { frontendKey: 'profile', backendReadPattern: /payload\.profile/, backendPrimaryName: '13_Perfil' },
      { frontendKey: '14_Oficina', backendReadPattern: /payload\['14_Oficina'\]/, backendPrimaryName: '14_Oficina' },
      { frontendKey: 'scheduledServices', backendReadPattern: /payload\.scheduledServices/, backendPrimaryName: '15_Manutenções_Agendadas' },
      { frontendKey: 'groceryItems', backendReadPattern: /payload\.groceryItems/, backendPrimaryName: '16_Lista_De_Mercado' },
      { frontendKey: 'bankAccounts', backendReadPattern: /payload\.bankAccounts/, backendPrimaryName: '5_Contas_Bancarias' },
      { frontendKey: 'creditCards', backendReadPattern: /payload\.creditCards/, backendPrimaryName: '18_Cartões_De_Crédito' },
      { frontendKey: '19_Agenda_E_Compromissos', backendReadPattern: /payload\['19_Agenda_E_Compromissos'\]/, backendPrimaryName: '19_Agenda_E_Compromissos' }
    ];

    const dummyPayload = buildSyncPayload(
      'test-id',
      [], [], [], [], [], [], [], [], [], [], [], {}, [], [], false, 0, [], [], [], [], [], []
    );

    moduleContracts.forEach(({ frontendKey, backendReadPattern, backendPrimaryName }) => {
      expect(
        dummyPayload[frontendKey],
        `Payload do frontend deve conter a chave '${String(frontendKey)}'`
      ).toBeDefined();

      expect(
        backendReadPattern.test(codigoGsSource),
        `Codigo.gs não lê mais '${String(frontendKey)}' — contrato quebrado para a aba '${backendPrimaryName}'`
      ).toBe(true);

      expect(
        codigoGsSource.includes(backendPrimaryName),
        `Codigo.gs não referencia mais a aba '${backendPrimaryName}'`
      ).toBe(true);
    });
  });
});