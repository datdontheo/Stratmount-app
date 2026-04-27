import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';
import { IconMenu, IconSun, IconMoon } from '../ui/Icons';

const roleBadgeColors = {
  ADMIN: 'bg-bg-tertiary text-text-primary',
  WAREHOUSE: 'bg-blue-500/20 text-blue-400',
  OUTLET: 'bg-purple-500/20 text-purple-400',
};

export default function Topbar({ onMenuClick }) {
  const { user } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  return (
    <header className="flex items-center justify-between px-4 lg:px-6 py-3 bg-bg-secondary border-b border-border">
      <div className="flex items-center gap-3">
        <button
          className="lg:hidden p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
          onClick={onMenuClick}
        >
          <IconMenu size={20} />
        </button>
        <div className="hidden lg:block">
          <p className="text-text-tertiary text-xs">Welcome back,</p>
          <p className="text-text-primary font-medium text-sm">{user?.name}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
        </button>
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full font-heading ${roleBadgeColors[user?.role] || 'bg-bg-tertiary text-text-primary'}`}
        >
          {user?.role}
        </span>
        <div className="w-8 h-8 rounded-full bg-accent-dim flex items-center justify-center text-xs font-bold text-text-primary">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
