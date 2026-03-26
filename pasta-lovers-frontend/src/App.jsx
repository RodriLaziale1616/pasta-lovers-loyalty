import { Navigate, Route, Routes } from 'react-router-dom'
import RegisterPage from './pages/RegisterPage'
import ClientCardPage from './pages/ClientCardPage'
import StaffLoginPage from './pages/StaffLoginPage'
import StaffDashboardPage from './pages/StaffDashboardPage'
import StaffPromotionsPage from './pages/StaffPromotionsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/register" replace />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/card/:token" element={<ClientCardPage />} />
      <Route path="/staff/login" element={<StaffLoginPage />} />
      <Route path="/staff" element={<StaffDashboardPage />} />
      <Route path="/staff/promotions" element={<StaffPromotionsPage />} />
    </Routes>
  )
}