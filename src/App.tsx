import { Navigate, Route, Routes } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import MemberHome from './pages/MemberHome'
import Lessons from './pages/Lessons'
import AdminDashboard from './pages/AdminDashboard'
import MemberLayout from './components/MemberLayout'
import { RequireAdmin, RequireAuth } from './components/Guards'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth><MemberLayout /></RequireAuth>}>
        <Route path="/ahli" element={<MemberHome />} />
        <Route path="/ahli/video" element={<Lessons kind="video" />} />
        <Route path="/ahli/ebook" element={<Lessons kind="ebook" />} />
        <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
