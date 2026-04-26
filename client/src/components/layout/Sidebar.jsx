import { NavLink } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: '⬛', roles: ['ADMIN', 'WAREHOUSE', 'OUTLET'] },
  { label: 'Inventory', path: '/inventory', icon: '📦', roles: ['ADMIN', 'WAREHOUSE', 'OUTLET'] },
  { label: 'Products', path: '/products', icon: '🏷️', roles: ['ADMIN'] },
  { label: 'Purchases', path: '/purchases', icon: '🛒', roles: ['ADMIN', 'WAREHOUSE'] },
  { label: 'Sales', path: '/sales', icon: '💳', roles: ['ADMIN', 'WAREHOUSE', 'OUTLET'] },
  { label: 'Payments', path: '/payments', icon: '💰', roles: ['ADMIN', 'WAREHOUSE', 'OUTLET'] },
  { label: 'Customers', path: '/customers', icon: '👥', roles: ['ADMIN', 'WAREHOUSE'] },
  { label: 'Suppliers', path: '/suppliers', icon: '🏭', roles: ['ADMIN'] },
  { label: 'Expenses', path: '/expenses', icon: '📉', roles: ['ADMIN'] },
  { label: 'Drawings', path: '/drawings', icon: '💸', roles: ['ADMIN'] },
  { label: 'Exchange Rates', path: '/exchange-rates', icon: '💱', roles: ['ADMIN'] },
  { label: 'Reports', path: '/reports', icon: '📊', roles: ['ADMIN'] },
  { label: 'Users', path: '/users', icon: '👤', roles: ['ADMIN'] },
  { label: 'Settings', path: '/settings', icon: '⚙️', roles: ['ADMIN'] },
];

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuthStore();

  const visible = navItems.filter((item) => item.roles.includes(user?.role));

  return (
    <div className="flex flex-col w-64 h-full bg-bg-secondary border-r border-border">
      {/* Logo */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-border">
        <div>
          <h1 className="font-heading font-bold text-xl text-white tracking-tight">STRAT MOUNT</h1>
          <p className="text-text-tertiary text-xs mt-0.5">Business Management</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-text-secondary hover:text-white lg:hidden">
            ✕
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {visible.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white text-black'
                  : 'text-text-secondary hover:text-white hover:bg-bg-tertiary'
              }`
            }
          >
            <span className="text-base leading-none">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="px-3 py-4 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-text-tertiary capitalize">{user?.role?.toLowerCase()}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full mt-2 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors"
        >
          <span>↩</span> Logout
        </button>
      </div>
    </div>
  );
}
