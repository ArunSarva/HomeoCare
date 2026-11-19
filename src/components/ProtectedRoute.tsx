import { Navigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'

interface ProtectedRouteProps {
  element: React.ReactNode
  allowedRoles: string[]
}

export function ProtectedRoute({ element, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
          <button
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
            onClick={() => window.location.href = '/'}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return <>{element}</>
}

export default ProtectedRoute