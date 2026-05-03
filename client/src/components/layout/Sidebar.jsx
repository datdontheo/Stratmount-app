import { NavLink } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import {
  IconHome, IconPackage, IconTag, IconShoppingCart, IconCreditCard,
  IconDollarSign, IconUsers, IconTruck, IconTrendingDown, IconBanknote,
  IconRefreshCw, IconBarChart, IconUser, IconSettings, IconX, IconLogOut,
} from '../ui/Icons';

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: IconHome, roles: ['ADMIN', 'WAREHOUSE', 'OUTLET'] },
  { label: 'Inventory', path: '/inventory', icon: IconPackage, roles: ['ADMIN', 'WAREHOUSE', 'OUTLET'] },
  { label: 'Products', path: '/products', icon: IconTag, roles: ['ADMIN'] },
  { label: 'Receive Stock', path: '/purchases', icon: IconShoppingCart, roles: ['ADMIN', 'WAREHOUSE'] },
  { label: 'Sales', path: '/sales', icon: IconCreditCard, roles: ['ADMIN', 'WAREHOUSE', 'OUTLET'] },
  { label: 'Payments', path: '/payments', icon: IconDollarSign, roles: ['ADMIN', 'WAREHOUSE', 'OUTLET'] },
  { label: 'Customers', path: '/customers', icon: IconUsers, roles: ['ADMIN', 'WAREHOUSE', 'OUTLET'] },
  { label: 'Suppliers', path: '/suppliers', icon: IconTruck, roles: ['ADMIN'] },
  { label: 'Expenses', path: '/expenses', icon: IconTrendingDown, roles: ['ADMIN'] },
  { label: 'Drawings', path: '/drawings', icon: IconBanknote, roles: ['ADMIN'] },
  { label: 'Exchange Rates', path: '/exchange-rates', icon: IconRefreshCw, roles: ['ADMIN'] },
  { label: 'Reports', path: '/reports', icon: IconBarChart, roles: ['ADMIN'] },
  { label: 'Users', path: '/users', icon: IconUser, roles: ['ADMIN'] },
  { label: 'Settings', path: '/settings', icon: IconSettings, roles: ['ADMIN', 'WAREHOUSE', 'OUTLET'] },
];

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuthStore();

  const visible = navItems.filter((item) => item.roles.includes(user?.role));

  return (
    <div className="flex flex-col w-64 h-full bg-bg-secondary border-r border-border">
      {/* Logo */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-border">
        <div>
          <h1 className="font-heading font-bold text-xl text-text-primary tracking-tight">STRAT MOUNT</h1>
          <p className="text-text-tertiary text-xs mt-0.5">Business Management</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary lg:hidden">
            <IconX size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {visible.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-[var(--accent-fg)]'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                }`
              }
              style={({ isActive }) => isActive ? { backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' } : {}}
            >
              <Icon size={16} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* User info + logout */}
      <div className="px-3 py-4 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-accent-dim flex items-center justify-center text-xs font-bold text-text-primary">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{user?.name}</p>
            <p className="text-xs text-text-tertiary capitalize">{user?.role?.toLowerCase()}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full mt-2 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors"
        >
          <IconLogOut size={16} /> Logout
        </button>
      </div>
    </div>
  );
}
