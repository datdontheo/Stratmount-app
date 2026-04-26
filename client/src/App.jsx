import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/auth/LoginPage';
import ChangePasswordPage from './pages/auth/ChangePasswordPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import InventoryPage from './pages/inventory/InventoryPage';
import ProductsPage from './pages/products/ProductsPage';
import PurchasesPage from './pages/purchases/PurchasesPage';
import SalesPage from './pages/sales/SalesPage';
import SaleDetailPage from './pages/sales/SaleDetailPage';
import PaymentsPage from './pages/payments/PaymentsPage';
import CustomersPage from './pages/customers/CustomersPage';
import SuppliersPage from './pages/suppliers/SuppliersPage';
import ExpensesPage from './pages/expenses/ExpensesPage';
import DrawingsPage from './pages/drawings/DrawingsPage';
import ExchangeRatesPage from './pages/exchange-rates/ExchangeRatesPage';
import ReportsPage from './pages/reports/ReportsPage';
import UsersPage from './pages/users/UsersPage';
import SettingsPage from './pages/settings/SettingsPage';

const ProtectedRoute = ({ children, roles }) => {
  const { user, token } = useAuthStore();
  if (!token || !user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
};

export default function App() {
  const { token, user } = useAuthStore();

  return (
    <Routes>
      <Route
        path="/login"
        element={!token ? <LoginPage /> : <Navigate to="/dashboard" replace />}
      />
      <Route
        path="/change-password"
        element={token ? <ChangePasswordPage /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="products" element={<ProtectedRoute roles={['ADMIN']}><ProductsPage /></ProtectedRoute>} />
        <Route path="purchases" element={<ProtectedRoute roles={['ADMIN', 'WAREHOUSE']}><PurchasesPage /></ProtectedRoute>} />
        <Route path="sales" element={<SalesPage />} />
        <Route path="sales/:id" element={<SaleDetailPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="suppliers" element={<ProtectedRoute roles={['ADMIN']}><SuppliersPage /></ProtectedRoute>} />
        <Route path="expenses" element={<ProtectedRoute roles={['ADMIN']}><ExpensesPage /></ProtectedRoute>} />
        <Route path="drawings" element={<ProtectedRoute roles={['ADMIN']}><DrawingsPage /></ProtectedRoute>} />
        <Route path="exchange-rates" element={<ProtectedRoute roles={['ADMIN']}><ExchangeRatesPage /></ProtectedRoute>} />
        <Route path="reports" element={<ProtectedRoute roles={['ADMIN']}><ReportsPage /></ProtectedRoute>} />
        <Route path="users" element={<ProtectedRoute roles={['ADMIN']}><UsersPage /></ProtectedRoute>} />
        <Route path="settings" element={<ProtectedRoute roles={['ADMIN']}><SettingsPage /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
