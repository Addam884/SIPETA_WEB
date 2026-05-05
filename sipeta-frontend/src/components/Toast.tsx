// components/Toast.tsx
import React, { useEffect } from 'react';

type ToastType = 'success' | 'warning' | 'error';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number; // dalam milidetik
}

const ICON_MAP: Record<ToastType, string> = {
  success: '✓',
  warning: '⚠',
  error: '✕',
};

const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className={`dk-toast-container`}>
      <div className={`dk-toast dk-toast-${type}`}>
        <div className="dk-toast-icon-wrap">
          <span className="dk-toast-icon">{ICON_MAP[type]}</span>
        </div>
        <div className="dk-toast-body">
          <span className="dk-toast-title">
            {type === 'success' ? 'Berhasil' : type === 'warning' ? 'Perhatian' : 'Gagal'}
          </span>
          <span className="dk-toast-message">{message}</span>
        </div>
        <button className="dk-toast-close" onClick={onClose}>×</button>
      </div>
    </div>
  );
};

export default Toast;