import { NavLink } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { IconHome, IconPackage, IconCreditCard, IconDollarSign, IconBarChart, IconUsers } from '../ui/Icons';

export default function MobileNav() {
  const { user } = useAuthStore();

  const tabs = [
    { label: 'Home', path: '/dashboard', icon: IconHome },
    { label: 'Stock', path: '/inventory', icon: IconPackage },
    { label: 'Sales', path: '/sales', icon: IconCreditCard },
    { label: 'Payments', path: '/payments', icon: IconDollarSign },
    ...(user?.role === 'ADMIN'
      ? [{ label: 'Reports', path: '/reports', icon: IconBarChart }]
      : [{ label: 'More', path: '/customers', icon: IconUsers }]),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-bg-secondary border-t border-border flex">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-xs transition-colors ${
                isActive ? 'text-text-primary' : 'text-text-tertiary'
              }`
            }
            style={({ isActive }) => isActive ? { color: 'var(--accent)' } : {}}
          >
            <Icon size={20} />
            <span className="font-medium">{tab.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
