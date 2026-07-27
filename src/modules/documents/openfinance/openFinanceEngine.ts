import {
  OpenFinanceAccount,
  OpenFinanceCard,
  OpenFinanceConsent,
  OpenFinanceInstitution,
  OpenFinanceSyncResult
} from '../types';

export class ConsentManager {
  private consents: OpenFinanceConsent[] = [
    {
      id: 'consent-001',
      instituicao: 'Itaú Unibanco',
      status: 'ATIVO',
      dataInicio: '2026-01-10',
      dataExpiracao: '2027-01-10',
      escopos: ['accounts', 'credit-cards', 'transactions']
    },
    {
      id: 'consent-002',
      instituicao: 'Nubank S.A.',
      status: 'ATIVO',
      dataInicio: '2026-02-15',
      dataExpiracao: '2027-02-15',
      escopos: ['accounts', 'credit-cards', 'investments']
    }
  ];

  public getConsents(): OpenFinanceConsent[] {
    return [...this.consents];
  }

  public async criarConsentimento(instituicaoNome: string, escopos: string[]): Promise<OpenFinanceConsent> {
    const newConsent: OpenFinanceConsent = {
      id: `consent-${Date.now()}`,
      instituicao: instituicaoNome,
      status: 'ATIVO',
      dataInicio: new Date().toISOString().substring(0, 10),
      dataExpiracao: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      escopos
    };
    this.consents.push(newConsent);
    return newConsent;
  }

  public revogarConsentimento(consentId: string): boolean {
    const idx = this.consents.findIndex((c) => c.id === consentId);
    if (idx !== -1) {
      this.consents[idx].status = 'REVOGADO';
      return true;
    }
    return false;
  }
}

export class AccountConnector {
  private institutions: OpenFinanceInstitution[] = [
    {
      id: 'inst-001',
      nome: 'Itaú Unibanco S.A.',
      codigoCompe: '341',
      suportaContas: true,
      suportaCartoes: true,
      suportaInvestimentos: true,
      suportaEmprestimos: true
    },
    {
      id: 'inst-002',
      nome: 'Nu Pagamentos (Nubank)',
      codigoCompe: '260',
      suportaContas: true,
      suportaCartoes: true,
      suportaInvestimentos: true,
      suportaEmprestimos: false
    },
    {
      id: 'inst-003',
      nome: 'Banco Bradesco S.A.',
      codigoCompe: '237',
      suportaContas: true,
      suportaCartoes: true,
      suportaInvestimentos: true,
      suportaEmprestimos: true
    },
    {
      id: 'inst-004',
      nome: 'Banco Santander Brasil',
      codigoCompe: '033',
      suportaContas: true,
      suportaCartoes: true,
      suportaInvestimentos: true,
      suportaEmprestimos: true
    },
    {
      id: 'inst-005',
      nome: 'Banco Inter S.A.',
      codigoCompe: '077',
      suportaContas: true,
      suportaCartoes: true,
      suportaInvestimentos: true,
      suportaEmprestimos: true
    }
  ];

  public getInstituicoes(): OpenFinanceInstitution[] {
    return [...this.institutions];
  }

  public async buscarContasConectadas(): Promise<OpenFinanceAccount[]> {
    return [
      {
        id: 'acc-itau-01',
        instituicaoId: 'inst-001',
        tipoConta: 'CORRENTE',
        agencia: '1234',
        numeroConta: '56789-0',
        saldoDisponivel: 12450.80,
        saldoBloqueado: 0,
        moeda: 'BRL'
      },
      {
        id: 'acc-nu-02',
        instituicaoId: 'inst-002',
        tipoConta: 'PAGAMENTO',
        agencia: '0001',
        numeroConta: '9876543-2',
        saldoDisponivel: 4320.15,
        saldoBloqueado: 0,
        moeda: 'BRL'
      }
    ];
  }

  public async buscarCartoesConectados(): Promise<OpenFinanceCard[]> {
    return [
      {
        id: 'card-nu-01',
        instituicaoId: 'inst-002',
        nomeCartao: 'Nubank Ultravioleta',
        finalCartao: '4321',
        limiteTotal: 25000,
        limiteDisponivel: 18450,
        faturaAtualValor: 1420.50,
        faturaVencimento: new Date().toISOString().substring(0, 10)
      }
    ];
  }
}

export class SyncEngine {
  public async executarSincronizacao(): Promise<OpenFinanceSyncResult> {
    // Simulated Open Finance synchronization
    await new Promise((r) => setTimeout(r, 600));
    return {
      timestamp: new Date().toISOString(),
      contasSincronizadas: 2,
      cartoesSincronizados: 1,
      transacoesImportadas: 14,
      status: 'SUCESSO'
    };
  }
}

export class ImportScheduler {
  private agendamentoAtivo = true;
  private intervaloMinutos = 360; // 6h

  public isAtivo(): boolean {
    return this.agendamentoAtivo;
  }

  public setAtivo(ativo: boolean): void {
    this.agendamentoAtivo = ativo;
  }

  public setIntervaloMinutos(min: number): void {
    this.intervaloMinutos = min;
  }

  public getIntervaloMinutos(): number {
    return this.intervaloMinutos;
  }
}

export class OpenFinanceProvider {
  public name = 'WealthFlow Open Finance Provider (BACEN Compliant Architecture)';
}

export class OpenFinanceService {
  private static instance: OpenFinanceService;

  public consentManager = new ConsentManager();
  public accountConnector = new AccountConnector();
  public syncEngine = new SyncEngine();
  public importScheduler = new ImportScheduler();
  public provider = new OpenFinanceProvider();

  private constructor() {}

  public static getInstance(): OpenFinanceService {
    if (!OpenFinanceService.instance) {
      OpenFinanceService.instance = new OpenFinanceService();
    }
    return OpenFinanceService.instance;
  }

  public async sincronizarTudo(): Promise<OpenFinanceSyncResult> {
    return this.syncEngine.executarSincronizacao();
  }
}

export const openFinanceService = OpenFinanceService.getInstance();
