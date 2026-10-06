import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UnauthorizedPage from '../pages/UnauthorizedPage';

/**
 * Reusable Role-Based Route Guard.
 * Restricts access to routes based on allowed RBAC roles.
 *
 * Handles:
 * 1. Loading state (displays session authenticating spinner)
 * 2. Unauthenticated state (redirects to /login)
 * 3. Unauthorized role state (renders 403 Access Denied page)
 * 4. Authorized role state (renders child outlet routes)
 */
export default function RoleProtectedRoute({ allowedRoles = [] }) {
  const { token, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#0B1220] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
        <span className="text-xs font-mono text-slate-400">Verifying Role Permissions...</span>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!hasRole(allowedRoles)) {
    return <UnauthorizedPage allowedRoles={allowedRoles} />;
  }

  return <Outlet />;
}
