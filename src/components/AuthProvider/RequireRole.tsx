import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import {
  type AuthRole,
  ROLE_DEFAULT_PATH,
  readStoredAuthSession,
  useOptionalAuth,
} from './AuthProvider';

export interface RequireRoleProps {
  role: AuthRole | AuthRole[];
  children?: React.ReactNode;
}

export const RequireRole: React.FC<RequireRoleProps> = ({ role, children }) => {
  const auth = useOptionalAuth();
  const location = useLocation();

  const currentUser = auth ? auth.user : readStoredAuthSession();
  const allowedRoles = Array.isArray(role) ? role : [role];

  if (!currentUser) {
    const nextTarget = `${location.pathname}${location.search}${location.hash}`;
    const search = `?next=${encodeURIComponent(nextTarget)}`;
    return <Navigate to={{ pathname: '/login', search }} replace />;
  }

  if (!allowedRoles.includes(currentUser.role)) {
    const redirectPath = ROLE_DEFAULT_PATH[currentUser.role] ?? '/';
    return <Navigate to={redirectPath} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
