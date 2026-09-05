import { Link, Navigate, Route, Routes } from 'react-router-dom'
import StaffLoginPage from './pages/StaffLoginPage'
import StaffDashboardPage from './pages/StaffDashboardPage'
import StaffPromotionsPage from './pages/StaffPromotionsPage'
import StaffProductsPage from './pages/StaffProductsPage'
import GiftClaimPage from './pages/GiftClaimPage'
import ClientAccessPage from './pages/ClientAccessPage'
import MyPassesPage from './pages/MyPassesPage'

function StaffDashboardRoute() {
  return (
    <>
      <StaffDashboardPage />
      <Link
        to="/staff/products"
        className="fixed bottom-4 right-4 z-40 rounded-2xl bg-[var(--modo-red)] px-4 py-3 text-sm font-black text-white shadow-[0_12px_32px_rgba(197,31,41,.28)] sm:bottom-6 sm:right-6"
      >
        PRODUCTOS
      </Link>
    </>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/acceso" replace />} />
      <Route path="/acceso" element={<ClientAccessPage />} />
      <Route path="/mi-pase" element={<MyPassesPage />} />
      <Route path="/gift/claim/:token" element={<GiftClaimPage />} />
      <Route path="/staff/login" element={<StaffLoginPage />} />
      <Route path="/staff" element={<StaffDashboardRoute />} />
      <Route path="/staff/products" element={<StaffProductsPage />} />
      <Route path="/staff/promotions" element={<StaffPromotionsPage />} />
      <Route path="*" element={<Navigate to="/acceso" replace />} />
    </Routes>
  )
}
