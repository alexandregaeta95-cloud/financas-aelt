import { useState } from 'react';
import { ocrService } from '../services/ocrService';
import { ExtractionResult, OCRResult, ReceiptData, ValidationResult } from '../types';

export function useDocumentScanner() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [parsedData, setParsedData] = useState<ReceiptData | null>(null);
  const [extraction, setExtraction] = useState<ExtractionResult<any> | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    try {
      const res = await ocrService.processarImagem(file);
      setOcrResult(res.ocrResult);
      setParsedData(res.parsedData);
      setExtraction(res.extraction);
      setValidation(res.validation);
      return res;
    } catch (err: any) {
      const msg = err?.message || 'Erro ao processar documento via OCR.';
      setError(msg);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  const clear = () => {
    setOcrResult(null);
    setParsedData(null);
    setExtraction(null);
    setValidation(null);
    setError(null);
  };

  return {
    isProcessing,
    error,
    ocrResult,
    parsedData,
    extraction,
    validation,
    processFile,
    clear
  };
}
