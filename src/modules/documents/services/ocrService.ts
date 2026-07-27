import { ocrEngine } from '../ocr/ocrEngine';
import { BoletoParser } from '../parser/boletoParser';
import { DocumentIdentifier } from '../parser/documentIdentifier';
import { InvoiceParser } from '../parser/invoiceParser';
import { PixReceiptParser } from '../parser/pixReceiptParser';
import { BankStatementParser } from '../parser/bankStatementParser';
import { documentScanner } from '../scanner/documentScanner';
import { DocumentHistory, DocumentType, ExtractionResult, OCRResult, ReceiptData, ValidationResult } from '../types';
import { ocrLogger } from '../utils/ocrLogger';
import { documentSettingsService } from './documentSettingsService';

const HISTORY_KEY = 'wealthflow_ocr_history';

export class OCRService {
  private static instance: OCRService;

  private constructor() {}

  public static getInstance(): OCRService {
    if (!OCRService.instance) {
      OCRService.instance = new OCRService();
    }
    return OCRService.instance;
  }

  public async inicializar(): Promise<boolean> {
    ocrLogger.log('OCR_EXECUTED', 'OCR Service inicializado com sucesso.');
    return ocrEngine.inicializar();
  }

  public async capturarImagem(file: File): Promise<{ base64Url: string; pdfText?: string }> {
    const settings = documentSettingsService.getSettings();
    return documentScanner.capturarArquivo(file, {
      brightness: settings.melhoriaAutomaticaImagem ? 15 : 0,
      contrast: settings.melhoriaAutomaticaImagem ? 20 : 0
    });
  }

  public async processarImagem(
    file: File
  ): Promise<{ ocrResult: OCRResult; parsedData: ReceiptData; extraction: ExtractionResult<any>; validation: ValidationResult }> {
    const startTime = performance.now();
    const settings = documentSettingsService.getSettings();

    if (!settings.ativarOCR) {
      throw new Error('O recurso de OCR está desativado nas configurações.');
    }

    // 1. Capturar e aprimorar imagem / PDF
    const { base64Url, pdfText } = await this.capturarImagem(file);

    // 2. Extrair Texto
    const ocrResult = await ocrEngine.extrairTexto({ imageBase64: base64Url, pdfText });
    ocrResult.enhancedImageUrl = base64Url;

    // 3. Identificar Documento
    const { type: docType } = this.identificarDocumento(ocrResult.rawText);
    ocrResult.documentType = docType;

    // 4. Parse do Documento específico
    let receiptData: ReceiptData = { tipo: docType };
    let extraction: ExtractionResult<any>;

    switch (docType) {
      case 'COMPROVANTE_PIX': {
        extraction = PixReceiptParser.parse(ocrResult.rawText);
        receiptData.pix = extraction.data;
        receiptData.dataGeral = {
          valor: extraction.data.valor,
          estabelecimentoOuPessoa: extraction.data.favorecidoOuRemetente,
          data: extraction.data.dataHora.substring(0, 10),
          categoriaSugerida: 'Pix / Transferência',
          formaPagamento: 'PIX'
        };
        break;
      }
      case 'BOLETO': {
        extraction = BoletoParser.parse(ocrResult.rawText);
        receiptData.boleto = extraction.data;
        receiptData.dataGeral = {
          valor: extraction.data.valor,
          estabelecimentoOuPessoa: extraction.data.beneficiario,
          data: extraction.data.dataVencimento,
          categoriaSugerida: 'Contas & Boletos',
          formaPagamento: 'BOLETO'
        };
        break;
      }
      case 'NOTA_FISCAL':
      case 'CUPOM_FISCAL': {
        extraction = InvoiceParser.parse(ocrResult.rawText);
        receiptData.invoice = extraction.data;
        receiptData.dataGeral = {
          valor: extraction.data.valorTotal,
          estabelecimentoOuPessoa: extraction.data.estabelecimento,
          data: extraction.data.dataEmissao,
          categoriaSugerida: 'Alimentação / Compras',
          formaPagamento: 'CARTAO_CREDITO'
        };
        break;
      }
      case 'FATURA_CARTAO': {
        extraction = BankStatementParser.parseCreditCard(ocrResult.rawText);
        receiptData.cardInvoice = extraction.data;
        receiptData.dataGeral = {
          valor: extraction.data.valorTotal,
          estabelecimentoOuPessoa: extraction.data.bancoOuEmissor,
          data: extraction.data.dataVencimento,
          categoriaSugerida: 'Cartão de Crédito',
          formaPagamento: 'CARTAO_CREDITO'
        };
        break;
      }
      case 'EXTRATO_BANCARIO': {
        extraction = BankStatementParser.parseStatement(ocrResult.rawText);
        receiptData.statement = extraction.data;
        receiptData.dataGeral = {
          valor: extraction.data.saldoFinal,
          estabelecimentoOuPessoa: extraction.data.banco,
          data: extraction.data.periodoFim,
          categoriaSugerida: 'Extrato Bancário',
          formaPagamento: 'TED'
        };
        break;
      }
      default: {
        const defaultInvoice = InvoiceParser.parse(ocrResult.rawText);
        extraction = defaultInvoice;
        receiptData.invoice = defaultInvoice.data;
        receiptData.dataGeral = {
          valor: defaultInvoice.data.valorTotal,
          estabelecimentoOuPessoa: defaultInvoice.data.estabelecimento,
          data: defaultInvoice.data.dataEmissao,
          categoriaSugerida: 'Geral',
          formaPagamento: 'OUTROS'
        };
        break;
      }
    }

    // 5. Validar Documento
    const validation = this.validarDocumento(receiptData);

    const processingTimeMs = Math.round(performance.now() - startTime);
    ocrLogger.log(
      'OCR_EXECUTED',
      `Processamento de OCR concluído para ${docType}`,
      docType,
      processingTimeMs,
      { fileName: file.name, isValid: validation.isValid }
    );

    // Salvar histórico se ativado
    if (settings.salvarHistoricoOCR) {
      this.salvarNoHistorico({
        id: `hist-${Date.now()}`,
        fileName: file.name,
        documentType: docType,
        timestamp: new Date().toISOString(),
        confidence: ocrResult.confidence,
        statusImportacao: 'PENDENTE',
        extractedValue: receiptData.dataGeral?.valor,
        rawTextPreview: ocrResult.rawText.substring(0, 100) + '...'
      });
    }

    return {
      ocrResult,
      parsedData: receiptData,
      extraction,
      validation
    };
  }

  public identificarDocumento(rawText: string): { type: DocumentType; confidence: number } {
    return DocumentIdentifier.identificar(rawText);
  }

  public validarDocumento(receiptData: ReceiptData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const valor = receiptData.dataGeral?.valor || 0;
    if (valor <= 0) {
      warnings.push('O valor extraído é R$ 0,00 ou não foi detectado com precisão.');
    }

    if (receiptData.tipo === 'BOLETO' && receiptData.boleto) {
      if (!receiptData.boleto.linhaDigitavel || receiptData.boleto.linhaDigitavel.length < 40) {
        errors.push('Linha digitável do boleto inválida ou incompleta.');
      }
    }

    if (receiptData.tipo === 'COMPROVANTE_PIX' && receiptData.pix) {
      if (!receiptData.pix.txidOrAutenticacao) {
        warnings.push('Código de autenticação ou TXID do PIX ausente.');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  public getHistorico(): DocumentHistory[] {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  private salvarNoHistorico(item: DocumentHistory): void {
    const list = this.getHistorico();
    list.unshift(item);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 100)));
  }
}

export const ocrService = OCRService.getInstance();
