import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, Role, AuthState, LoginRequest } from '../../types'
import { clearGoogleSheetsAuthorization } from '../../services/googleSheetsService'

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  error: string | null
  login: (credentials: LoginRequest) => Promise<boolean>
  logout: () => void
  isAuthenticated: boolean
  hasRole: (role: Role) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Mock user data for offline login
// Each entry has its own password; the password is never copied into the stored user.
const mockUsers: Array<{ user: User; password: string }> = [
  { user: { id: '1', username: 'jonnet', email: 'jonnet@example.com', role: 'Doctor', name: 'Jonnet', createdAt: new Date().toISOString() }, password: '123' },
  { user: { id: '2', username: 'admin', email: 'admin@example.com', role: 'Admin', name: 'Admin', createdAt: new Date().toISOString() }, password: 'password' },
]

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    // Check for existing session in localStorage
    const storedToken = localStorage.getItem('auth_token')
    const storedUser = localStorage.getItem('auth_user')
    
    if (storedToken && storedUser) {
      try {
        const user = JSON.parse(storedUser)
        // Check if token is expired (simplified check)
        const isExpired = false // In production, decode JWT and check exp
        
        if (!isExpired) {
          setState({
            user,
            token: storedToken,
            loading: false,
            error: null,
          })
          return
        }
      } catch {
        // Fall through to clear invalid data
      }
      
      // Clear invalid session data
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
    }
    
    // Try to restore from IndexedDB offline cache
    const restoreOfflineSession = async () => {
      try {
        // Try to use IndexedDB to restore last user
        const request = indexedDB.open('homeocare-db', 1)
        
        request.onupgradeneeded = (event: any) => {
          const db = event.target.result
          if (!db.objectStoreNames.contains('sessions')) {
            db.createObjectStore('sessions', { keyPath: 'id' })
          }
        }
        
        request.onsuccess = (event: any) => {
          const db = event.target.result
          const tx = db.transaction('sessions', 'readonly')
          const sessionStore = tx.objectStore('sessions')
          const getRequest = sessionStore.get('current')
          
          getRequest.onsuccess = () => {
            const cachedSession = getRequest.result
            if (cachedSession && cachedSession.user) {
              setState({
                user: cachedSession.user,
                token: cachedSession.token || null,
                loading: false,
                error: null,
              })
            } else {
              setState(prev => ({ ...prev, loading: false }))
            }
          }
        }
        
        request.onerror = () => {
          setState(prev => ({ ...prev, loading: false }))
        }
      } catch {
        // IndexedDB not available, skip offline restore
        setState(prev => ({ ...prev, loading: false }))
      }
    }
    
    restoreOfflineSession()
  }, [])

  const login = async (credentials: LoginRequest): Promise<boolean> => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      // Fallback to mock authentication
      const mockUser = mockUsers.find(
        m => m.user.username === credentials.username && m.password === credentials.password
      )?.user
      
      if (mockUser) {
        const mockToken = `mock-${Date.now()}-${mockUser.username}`
        
        localStorage.setItem('auth_token', mockToken)
        localStorage.setItem('auth_user', JSON.stringify(mockUser))
        
        // Store in IndexedDB
        try {
          const request = indexedDB.open('homeocare-db', 1)
          
          request.onupgradeneeded = (event: any) => {
            const db = event.target.result
            if (!db.objectStoreNames.contains('sessions')) {
              db.createObjectStore('sessions', { keyPath: 'id' })
            }
          }
          
          request.onsuccess = (event: any) => {
            const db = event.target.result
            const tx = db.transaction('sessions', 'readwrite')
            const sessionStore = tx.objectStore('sessions')
            sessionStore.put({
              id: 'current',
              user: mockUser,
              token: mockToken,
              timestamp: Date.now(),
            })
          }
        } catch {
          // IndexedDB not available, continue
        }
        
        setState({
          user: mockUser,
          token: mockToken,
          loading: false,
          error: null,
        })
        return true
      }
      
      throw new Error('Invalid credentials')
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false,
        error: error instanceof Error ? error.message : 'An error occurred',
      }))
      return false
    }
  }

  const logout = () => {
    clearGoogleSheetsAuthorization()
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    
    // Clear IndexedDB cache
    try {
      const request = indexedDB.open('homeocare-db', 1)
      request.onsuccess = (event: any) => {
        const db = event.target.result
        const tx = db.transaction('sessions', 'readwrite')
        tx.objectStore('sessions').delete('current')
      }
    } catch {
      // IndexedDB not available
    }
    
    setState({
      user: null,
      token: null,
      loading: false,
      error: null,
    })
  }

  const isAuthenticated = !!state.user
  const hasRole = (role: Role): boolean => state.user?.role === role

  return (
    <AuthContext.Provider value={{
      user: state.user,
      token: state.token,
      loading: state.loading,
      error: state.error,
      login,
      logout,
      isAuthenticated,
      hasRole,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext