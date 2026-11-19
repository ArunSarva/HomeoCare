import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState<'Doctor' | 'Receptionist' | 'Admin'>('Doctor')
  const [loading, setLoading] = useState(false)
  
  const { login, error } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const success = await login({
      username,
      password,
    })
    
    setLoading(false)
    
    if (success) {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-primary">
            HomeoCare Pro
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Homeopathy Clinic Management System
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-8">
          <div className="px-4 py-8 sm:px-10">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as 'Doctor' | 'Receptionist' | 'Admin')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Doctor">Doctor</option>
                  <option value="Receptionist">Receptionist</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              
              {error && (
                <div className="text-red-600 text-sm text-center bg-red-50 p-2 rounded">
                  {error}
                </div>
              )}
              
              <div>
                <button
                  type="submit"
                  className="w-full bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  disabled={loading}
                >
                  {loading ? 'Logging in...' : 'Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
        
        <p className="text-center text-xs text-gray-500">
          © {new Date().getFullYear()} HomeoCare Pro. All rights reserved.
        </p>
      </div>
    </div>
  )
}

export default Login