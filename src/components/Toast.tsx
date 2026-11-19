import { createContext, useContext, useState, useCallback } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastMessage {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastContextType {
  showToast: (options: Omit<ToastMessage, 'id'>) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = useCallback(({ type, message, duration = 3000 }: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 11)
    
    setToasts(prev => [...prev, { id, type, message, duration }])
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function Toast({ toast, onClose }: { toast: ToastMessage; onClose: () => void }) {
  const colors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  }

  const icons = {
    success: '✓',
    error: '✗',
    info: 'ℹ',
    warning: '⚠',
  }

  return (
    <div 
      className={`pointer-events-auto min-w-[300px] p-4 rounded-lg border shadow-lg flex items-center gap-3 animate-fade-in ${colors[toast.type]}`}
      role="alert"
    >
      <span className="text-lg">{icons[toast.type]}</span>
      <p className="text-sm font-medium flex-1">{toast.message}</p>
      <button 
        onClick={onClose}
        className="text-current opacity-50 hover:opacity-100"
        aria-label="Close"
      >
        ×
      </button>
    </div>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export default ToastContext