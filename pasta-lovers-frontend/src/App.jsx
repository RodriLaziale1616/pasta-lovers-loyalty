import { Navigate, Route, Routes } from 'react-router-dom'
import StaffLoginPage from './pages/StaffLoginPage'
import StaffDashboardPage from './pages/StaffDashboardPage'
import StaffPromotionsPage from './pages/StaffPromotionsPage'
import GiftClaimPage from './pages/GiftClaimPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/staff/login" replace />} />
      <Route path="/gift/claim/:token" element={<GiftClaimPage />} />
      <Route path="/staff/login" element={<StaffLoginPage />} />
      <Route path="/staff" element={<StaffDashboardPage />} />
      <Route path="/staff/promotions" element={<StaffPromotionsPage />} />
      <Route path="*" element={<Navigate to="/staff/login" replace />} />
    </Routes>
  )
}
