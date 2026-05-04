// components/ConfirmDialog.tsx
import React from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'primary'; // untuk warna tombol konfirmasi
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title = 'Konfirmasi',
  message,
  confirmLabel = 'Ya',
  cancelLabel = 'Batal',
  onConfirm,
  onCancel,
  variant = 'primary',
}) => {
  if (!open) return null;

  const btnClass = variant === 'danger' ? 'dk-btn dk-btn-danger' : 'dk-btn dk-btn-blue';

  return (
    <div className="dk-overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="dk-modal dk-confirm-modal">
        <div className="dk-modal-header">
          <h3 className="dk-modal-title">{title}</h3>
          <button className="dk-close-btn" onClick={onCancel}>×</button>
        </div>
        <div className="dk-modal-body">
          <p className="dk-confirm-message">{message}</p>
        </div>
        <div className="dk-modal-footer" style={{ justifyContent: 'flex-end', gap: 10 }}>
          <button className="dk-btn dk-btn-outline" onClick={onCancel}>{cancelLabel}</button>
          <button className={btnClass} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;