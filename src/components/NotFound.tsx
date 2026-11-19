import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <h1 className="text-9xl font-bold text-gray-200">
            404
          </h1>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Page Not Found
        </h2>
        
        <p className="text-gray-600 mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        
        <div className="flex justify-center space-x-4">
          <Link to="/">
            <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark">
              Go to Dashboard
            </button>
          </Link>
          <Link to="/patients">
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              View Patients
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NotFound