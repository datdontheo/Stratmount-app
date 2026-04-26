import { NavLink } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

export default function MobileNav() {
  const { user } = useAuthStore();

  const tabs = [
    { label: 'Home', path: '/dashboard', icon: '⬛' },
    { label: 'Stock', path: '/inventory', icon: '📦' },
    { label: 'Sales', path: '/sales', icon: '💳' },
    { label: 'Payments', path: '/payments', icon: '💰' },
    ...(user?.role === 'ADMIN' ? [{ label: 'Reports', path: '/reports', icon: '📊' }] : [{ label: 'More', path: '/customers', icon: '☰' }]),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-bg-secondary border-t border-border flex">
      {tabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-xs transition-colors ${
              isActive ? 'text-white' : 'text-text-tertiary'
            }`
          }
        >
          <span className="text-lg leading-none">{tab.icon}</span>
          <span className="font-medium">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
