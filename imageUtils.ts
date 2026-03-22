/**
 * Compresses a base64 image string to be under a certain size limit (in bytes).
 * Uses a canvas to resize and reduce quality.
 */
export async function compressBase64Image(base64: string, maxSizeBytes: number = 800000): Promise<string> {
  // If it's already small enough, return as is
  if (base64.length * 0.75 < maxSizeBytes) {
    return base64;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Initial scaling if very large
      const maxDimension = 1024;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = (height / width) * maxDimension;
          width = maxDimension;
        } else {
          width = (width / height) * maxDimension;
          height = maxDimension;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Iteratively reduce quality until under limit
      let quality = 0.9;
      let result = canvas.toDataURL('image/jpeg', quality);
      
      while (result.length * 0.75 > maxSizeBytes && quality > 0.1) {
        quality -= 0.1;
        result = canvas.toDataURL('image/jpeg', quality);
      }

      resolve(result);
    };
    img.onerror = reject;
    img.src = base64;
  });
}
