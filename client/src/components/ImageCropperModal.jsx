import React, { useState } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImageBlob, canvasToBlobUnderLimit } from '../utils/cropImage';
import './ResourceFormModal.css';

const ImageCropperModal = ({ imageSrc, onCancel, onCropDone }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [processing, setProcessing] = useState(false);

  const handleSave = async () => {
    if (!croppedAreaPixels || processing) return;
    setProcessing(true);
    try {
      const canvas = await getCroppedImageBlob(imageSrc, croppedAreaPixels, 1024);
      const blob = await canvasToBlobUnderLimit(canvas, 10 * 1024 * 1024, 0.9, 0.4);
      if (blob) {
        await onCropDone(blob);
      }
    } catch (err) {
      console.error('Error during image crop/compression:', err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(4px)',
      zIndex: 2000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
    }}>
      <div className="modal-container" style={{
        maxWidth: '400px',
        padding: '24px',
        animation: 'none',
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '1.25rem',
          fontWeight: 800,
          color: 'var(--color-text)',
        }}>
          Crop Avatar
        </h3>
        
        <div style={{
          position: 'relative',
          width: '100%',
          height: '300px',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          backgroundColor: '#000',
        }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
          />
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>
          <label style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--color-text-secondary)',
            display: 'flex',
            justifyContent: 'space-between',
          }}>
            <span>Zoom</span>
            <span>{zoom.toFixed(1)}x</span>
          </label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            style={{
              width: '100%',
              cursor: 'pointer',
              accentColor: 'var(--color-primary)',
            }}
          />
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
        }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
            style={{
              padding: '10px 20px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'transparent',
              color: 'var(--color-text-secondary)',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-primary)';
              e.currentTarget.style.color = 'var(--color-primary)';
              e.currentTarget.style.backgroundColor = 'var(--color-primary-bg)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={handleSave}
            disabled={processing || !croppedAreaPixels}
            style={{
              padding: '10px 20px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-on-primary)',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: (processing || !croppedAreaPixels) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: (processing || !croppedAreaPixels) ? 0.6 : 1,
            }}
            onMouseOver={(e) => {
              if (!processing && croppedAreaPixels) {
                e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)';
              }
            }}
            onMouseOut={(e) => {
              if (!processing && croppedAreaPixels) {
                e.currentTarget.style.backgroundColor = 'var(--color-primary)';
              }
            }}
          >
            {processing ? 'Processing...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropperModal;
