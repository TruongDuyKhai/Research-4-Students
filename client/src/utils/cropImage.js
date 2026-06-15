export function getCroppedImageBlob(imageSrc, cropPixels, maxOutputSize = 1024) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = imageSrc;
    image.onload = () => {
      let { width, height } = cropPixels;
      let outW = width, outH = height;
      if (Math.max(width, height) > maxOutputSize) {
        const scale = maxOutputSize / Math.max(width, height);
        outW = Math.round(width * scale);
        outH = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, cropPixels.x, cropPixels.y, width, height, 0, 0, outW, outH);
      resolve(canvas);
    };
    image.onerror = reject;
  });
}

export function canvasToBlobUnderLimit(canvas, maxBytes, startQuality = 0.9, minQuality = 0.4) {
  return new Promise((resolve) => {
    let quality = startQuality;
    const tryExport = () => {
      canvas.toBlob((blob) => {
        if (!blob || blob.size <= maxBytes || quality <= minQuality) {
          resolve(blob);
        } else {
          quality = Math.round((quality - 0.1) * 10) / 10;
          tryExport();
        }
      }, 'image/jpeg', quality);
    };
    tryExport();
  });
}
