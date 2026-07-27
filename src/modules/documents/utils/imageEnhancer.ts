export interface ImageEnhanceOptions {
  brightness?: number; // -100 to 100
  contrast?: number;   // -100 to 100
  rotation?: number;   // 0, 90, 180, 270 degrees
  autoCrop?: boolean;
}

export class ImageEnhancer {
  /**
   * Applies client-side canvas transformations to enhance contrast, brightness, rotation and alignment for OCR
   */
  public static async processarImagemBase64(
    base64Url: string,
    options: ImageEnhanceOptions = { brightness: 15, contrast: 25, rotation: 0, autoCrop: true }
  ): Promise<string> {
    return new Promise((resolve) => {
      if (!base64Url || !base64Url.startsWith('data:image')) {
        resolve(base64Url);
        return;
      }

      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(base64Url);
            return;
          }

          const rotation = options.rotation || 0;
          if (rotation === 90 || rotation === 270) {
            canvas.width = img.height;
            canvas.height = img.width;
          } else {
            canvas.width = img.width;
            canvas.height = img.height;
          }

          ctx.save();

          // Rotation & Alignment
          if (rotation === 90) {
            ctx.translate(canvas.width, 0);
            ctx.rotate((90 * Math.PI) / 180);
          } else if (rotation === 180) {
            ctx.translate(canvas.width, canvas.height);
            ctx.rotate((180 * Math.PI) / 180);
          } else if (rotation === 270) {
            ctx.translate(0, canvas.height);
            ctx.rotate((270 * Math.PI) / 180);
          }

          ctx.drawImage(img, 0, 0);
          ctx.restore();

          // Brightness & Contrast Adjustment
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          const brightness = options.brightness || 15; // default boost
          const contrast = options.contrast || 25;     // default boost
          const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

          for (let i = 0; i < data.length; i += 4) {
            // R, G, B
            data[i] = factor * (data[i] + brightness - 128) + 128;
            data[i + 1] = factor * (data[i + 1] + brightness - 128) + 128;
            data[i + 2] = factor * (data[i + 2] + brightness - 128) + 128;
          }

          ctx.putImageData(imageData, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.92));
        } catch (e) {
          console.error('Erro ao aprimorar imagem no canvas:', e);
          resolve(base64Url);
        }
      };

      img.onerror = () => {
        resolve(base64Url);
      };

      img.src = base64Url;
    });
  }
}
