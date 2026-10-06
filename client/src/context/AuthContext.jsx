import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

/**
 * Normalizes role string inputs to standard uppercase RBAC role enums.
 */
export const normalizeRole = (roleStr) => {
  if (!roleStr || typeof roleStr !== 'string') return '';
  const upper = roleStr.trim().toUpperCase();
  if (upper === 'ADMIN') return 'ADMIN';
  if (upper === 'CONTENT_CREATOR' || upper === 'CREATOR') return 'CONTENT_CREATOR';
  if (upper === 'INDUSTRY_ANALYST' || upper === 'ANALYST' || upper === 'USER') return 'INDUSTRY_ANALYST';
  return '';
};

/**
 * Returns default landing route based on authenticated user's normalized role.
 */
export const getRoleDefaultRoute = (roleInput) => {
  const norm = normalizeRole(roleInput);
  if (norm === 'CONTENT_CREATOR') return '/dashboard/creator';
  if (norm === 'ADMIN') return '/dashboard/users';
  if (norm === 'INDUSTRY_ANALYST') return '/dashboard';
  return '/dashboard';
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('trustgraph_token') || '');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch current user when token exists
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/auth/me');
        if (res.data?.success) {
          setUser(res.data.data.user);
        }
      } catch (err) {
        console.error('Failed to restore session user:', err);
        logout();
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, [token]);

  const login = (newToken, userData) => {
    localStorage.setItem('trustgraph_token', newToken);
    setToken(newToken);
    setUser(userData);
  };

  const updateUser = (updatedData) => {
    setUser((prev) => (prev ? { ...prev, ...updatedData } : updatedData));
  };

  const updateToken = (newToken) => {
    localStorage.setItem('trustgraph_token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('trustgraph_token');
    setToken('');
    setUser(null);
  };

  // Derive current normalized role string
  const role = user?.role ? normalizeRole(user.role) : '';

  /**
   * Helper to check if current logged-in user possesses one of the allowed roles.
   * - Unauthenticated or missing/unknown role returns false.
   * - ADMIN role returns true for all permissions.
   */
  const hasRole = (allowedRoles) => {
    if (!user || !user.role) return false;
    const userRole = normalizeRole(user.role);
    if (!userRole) return false;
    if (userRole === 'ADMIN') return true;
    if (!Array.isArray(allowedRoles)) return false;
    return allowedRoles.map((r) => normalizeRole(r)).includes(userRole);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        role,
        loading,
        login,
        logout,
        updateUser,
        updateToken,
        hasRole,
        getRoleDefaultRoute,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
