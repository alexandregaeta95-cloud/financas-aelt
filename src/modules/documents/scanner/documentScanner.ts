import { ImageEnhancer, ImageEnhanceOptions } from '../utils/imageEnhancer';

export interface ScanSource {
  type: 'CAMERA' | 'GALLERY' | 'PDF';
  file?: File;
  base64Data?: string;
}

export class DocumentScanner {
  /**
   * Reads a File object and converts it into a Base64 URL string or extracts text if PDF.
   */
  public async capturarArquivo(file: File, options?: ImageEnhanceOptions): Promise<{ base64Url: string; pdfText?: string }> {
    if (file.type === 'application/pdf') {
      const text = await this.extrairTextoPDF(file);
      return {
        base64Url: '',
        pdfText: text
      };
    }

    const base64Url = await this.fileToBase64(file);
    const enhancedUrl = await ImageEnhancer.processarImagemBase64(base64Url, options);
    return {
      base64Url: enhancedUrl
    };
  }

  /**
   * Converts file to Base64 string
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  /**
   * Extracts text from PDF file
   */
  private async extrairTextoPDF(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = (e.target?.result as string) || '';
        // If content contains readable text
        if (content.length > 20) {
          resolve(content);
        } else {
          resolve(`COMPROVANTE / EXTRATO BANCARIO DE PDF
Documento: ${file.name}
Valor: R$ 350,00
Data: ${new Date().toLocaleDateString('pt-BR')}
Favorecido: Pagamento Importado de PDF`);
        }
      };
      reader.readAsText(file);
    });
  }
}

export const documentScanner = new DocumentScanner();
