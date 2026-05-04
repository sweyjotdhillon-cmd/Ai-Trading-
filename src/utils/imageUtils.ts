export const compressImage = (base64Str: string, maxWidth: number, maxHeight: number, quality: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = (e) => reject(e);
  });
};

export const processImageFile = (file: File, maxWidth: number, maxHeight: number, quality: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      try {
        const compressed = await compressImage(base64, maxWidth, maxHeight, quality);
        resolve(compressed);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
};

export const dataURLtoBlob = (dataurl: string): Blob => {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

/**
 * Computes temporal delta between two frames using pixel-based momentum analysis.
 */
export function parseTimeframeToMinutes(timeframeStr: string): number {
  if (!timeframeStr) return 1;
  const str = timeframeStr.toLowerCase().trim();
  const numMatches = str.match(/\d+(\.\d+)?/);
  if (!numMatches) return 1;
  
  const num = parseFloat(numMatches[0]);
  if (str.includes('h')) return num * 60;
  if (str.includes('s')) return Math.max(0.1, num / 60);
  if (str.includes('d')) return num * 1440;
  
  return num; // default to minutes
}

export function detectCandleCount(imageElement: HTMLImageElement | null, defaultCount: number = 60): number {
  if (!imageElement) return defaultCount;
  return defaultCount;
}

export function cropRightCandles(
  imageSource: string, 
  candlesToCut: number, 
  totalCandles: number
): Promise<{ leftSliceBase64: string, rightSliceBase64: string, cropRatio: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let cropRatio = candlesToCut / Math.max(1, totalCandles);
      cropRatio = Math.max(0.02, Math.min(0.4, cropRatio));
      
      const cutWidth = Math.floor(img.width * cropRatio);
      const leftWidth = img.width - cutWidth;
      const height = img.height;
      
      const canvasLeft = document.createElement('canvas');
      canvasLeft.width = leftWidth;
      canvasLeft.height = height;
      const ctxLeft = canvasLeft.getContext('2d');
      if (ctxLeft) {
        ctxLeft.drawImage(img, 0, 0, leftWidth, height, 0, 0, leftWidth, height);
      }
      
      const canvasRight = document.createElement('canvas');
      canvasRight.width = cutWidth;
      canvasRight.height = height;
      const ctxRight = canvasRight.getContext('2d');
      if (ctxRight) {
        ctxRight.drawImage(img, leftWidth, 0, cutWidth, height, 0, 0, cutWidth, height);
      }
      
      resolve({
        leftSliceBase64: canvasLeft.toDataURL('image/jpeg', 0.9),
        rightSliceBase64: canvasRight.toDataURL('image/jpeg', 0.9),
        cropRatio
      });
    };
    img.onerror = reject;
    img.src = imageSource;
  });
}

export const createTemporalDelta = (currentBase64: string, cachedBase64: string): Promise<{
  momentum_concentration: 'UPPER' | 'LOWER' | 'NEUTRAL',
  price_velocity: number,
  momentum_magnitude: number,
  energy_ratio: number
}> => {
  return new Promise((resolve) => {
    const img1 = new Image();
    const img2 = new Image();
    let loaded = 0;

    const analyze = () => {
      loaded++;
      if (loaded < 2) return;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve({ momentum_concentration: 'NEUTRAL', price_velocity: 0, momentum_magnitude: 0, energy_ratio: 1 });

      canvas.width = 400;
      canvas.height = 400;

      ctx.drawImage(img1, 0, 0, 400, 400);
      const d1 = ctx.getImageData(0, 0, 400, 400).data;

      ctx.clearRect(0, 0, 400, 400);
      ctx.drawImage(img2, 0, 0, 400, 400);
      const d2 = ctx.getImageData(0, 0, 400, 400).data;

      let upperDiff = 0;
      let lowerDiff = 0;
      let totalDiff = 0;

      for (let i = 0; i < d1.length; i += 4) {
        const diff = Math.abs(d1[i] - d2[i]) + Math.abs(d1[i+1] - d2[i+1]) + Math.abs(d1[i+2] - d2[i+2]);
        const y = Math.floor((i / 4) / 400);
        
        if (y < 200) upperDiff += diff;
        else lowerDiff += diff;
        
        totalDiff += diff;
      }

      const energy_ratio = upperDiff / (lowerDiff + 1);
      const momentum_magnitude = totalDiff / (400 * 400 * 3);

      resolve({
        momentum_concentration: energy_ratio > 1.3 ? 'UPPER' : energy_ratio < 0.7 ? 'LOWER' : 'NEUTRAL',
        price_velocity: 0, 
        momentum_magnitude,
        energy_ratio
      });
    };

    img1.onload = analyze;
    img2.onload = analyze;
    img1.src = `data:image/jpeg;base64,${cachedBase64}`;
    img2.src = `data:image/jpeg;base64,${currentBase64}`;
  });
};
