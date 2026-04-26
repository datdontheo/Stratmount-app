import useAuthStore from '../../store/authStore';

const roleBadgeColors = {
  ADMIN: 'bg-white/10 text-white',
  WAREHOUSE: 'bg-blue-500/20 text-blue-400',
  OUTLET: 'bg-purple-500/20 text-purple-400',
};

export default function Topbar({ onMenuClick }) {
  const { user } = useAuthStore();

  return (
    <header className="flex items-center justify-between px-4 lg:px-6 py-3 bg-bg-secondary border-b border-border">
      <div className="flex items-center gap-3">
        <button
          className="lg:hidden p-2 rounded-lg text-text-secondary hover:text-white hover:bg-bg-tertiary"
          onClick={onMenuClick}
        >
          ☰
        </button>
        <div className="hidden lg:block">
          <p className="text-text-tertiary text-xs">Welcome back,</p>
          <p className="text-white font-medium text-sm">{user?.name}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full font-heading ${roleBadgeColors[user?.role] || 'bg-white/10 text-white'}`}
        >
          {user?.role}
        </span>
        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
