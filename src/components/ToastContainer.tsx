import React from 'react';
import { ToastMessage } from '../types.ts';

interface ToastContainerProps {
  toasts: ToastMessage[];
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts }) => {
  return (
    <div id="toast-container">
      {toasts.map((toast) => {
        let icon = 'ℹ️';
        if (toast.type === 'success') icon = '✅';
        if (toast.type === 'warning') icon = '⚠️';
        if (toast.type === 'error') icon = '❌';

        return (
          <div key={toast.id} className={`toast ${toast.type} show`}>
            <span>{icon}</span>
            <span>{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
};
