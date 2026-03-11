import { createContext, useContext, useState, useCallback, useRef, type FC, type ReactNode } from 'react';

type ToastSeverity = 'success' | 'warning' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  severity: ToastSeverity;
}

interface ToastContextValue {
  showToast: (message: string, severity?: ToastSeverity) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

export const ToastProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const showToast = useCallback((message: string, severity: ToastSeverity = 'success') => {
    const id = nextId.current++;
    setToasts(prev => [...prev, { id, message, severity }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.length > 0 && (
        <div className="ueflow-toast-container">
          {toasts.map(toast => (
            <div key={toast.id} className={`ueflow-toast ueflow-toast--${toast.severity}`}>
              <span className="ueflow-toast-message">{toast.message}</span>
              <button className="ueflow-toast-close" onClick={() => removeToast(toast.id)}>×</button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
};
