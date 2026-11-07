import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="center-note">Memuatkan…</div>
  if (!session) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return <>{children}</>
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  if (!profile) return <div className="center-note">Memuatkan…</div>
  if (!profile.is_admin) return <Navigate to="/ahli" replace />
  return <>{children}</>
}
