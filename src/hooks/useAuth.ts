import { useState, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import { User, UserRole } from '../types';

interface DecodedToken {
  id: string;
  username: string;
  role: UserRole;
  exp: number;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback((): void => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  const checkAuthStatus = useCallback(async (): Promise<void> => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        const decoded = jwtDecode<DecodedToken>(storedToken);
        const now = Date.now() / 1000;

        if (decoded.exp < now) {
          // Token expired, logout
          logout();
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        } else {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
        }
      } catch (err) {
        logout();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        throw err;
      }
    }

    setLoading(false);
  }, [logout]);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const hasRole = useCallback((requiredRole: UserRole): boolean => {
    return user?.role === requiredRole;
  }, [user]);

  const hasPermission = useCallback((module: string): boolean => {
    if (!user) return false;

    // Admin has full access
    if (user.role === 'Admin') return true;

    // Doctor has full access to clinical modules
    if (user.role === 'Doctor') {
      const clinicalModules = ['cases', 'prescriptions', 'followups', 'appointments'];
      if (clinicalModules.includes(module)) return true;
    }

    // Receptionist has access to appointments and patients
    if (user.role === 'Receptionist') {
      if (module === 'appointments' || module === 'patients') return true;
    }

    return false;
  }, [user]);

  return {
    user,
    token,
    loading,
    logout,
    hasRole,
    hasPermission,
    isAuthenticated: !!user,
  };
};
