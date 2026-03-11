import { createContext, useContext, useState, useCallback, type FC, type ReactNode } from 'react';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue>({ confirm: () => Promise.resolve(false) });

export const useConfirm = () => useContext(ConfirmContext);

export const ConfirmProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setDialog({ ...options, resolve });
    });
  }, []);

  const handleClose = useCallback((result: boolean) => {
    dialog?.resolve(result);
    setDialog(null);
  }, [dialog]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {dialog && (
        <div className="ueflow-confirm-backdrop" onClick={() => handleClose(false)}>
          <div className="ueflow-confirm-dialog" onClick={e => e.stopPropagation()}>
            <div className="ueflow-confirm-title">{dialog.title}</div>
            <div className="ueflow-confirm-message">{dialog.message}</div>
            <div className="ueflow-confirm-actions">
              <button className="ueflow-confirm-btn ueflow-confirm-btn--cancel" onClick={() => handleClose(false)}>
                {dialog.cancelLabel ?? 'Cancel'}
              </button>
              <button
                className={`ueflow-confirm-btn ${dialog.destructive ? 'ueflow-confirm-btn--destructive' : 'ueflow-confirm-btn--confirm'}`}
                onClick={() => handleClose(true)}
                autoFocus
              >
                {dialog.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};
