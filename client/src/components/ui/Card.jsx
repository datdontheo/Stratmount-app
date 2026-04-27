export default function Card({ children, className = '' }) {
  return (
    <div className={`card ${className}`}>{children}</div>
  );
}

export function StatCard({ label, value, sub, trend, color = 'white' }) {
  const colors = {
    white: 'text-text-primary',
    success: 'text-success',
    danger: 'text-danger',
    warning: 'text-warning',
  };
  return (
    <div className="card">
      <p className="text-text-secondary text-sm mb-1">{label}</p>
      <p className={`font-heading font-bold text-2xl ${colors[color]}`}>{value}</p>
      {sub && <p className="text-text-tertiary text-xs mt-1">{sub}</p>}
    </div>
  );
}
