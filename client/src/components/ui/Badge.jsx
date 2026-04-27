const variants = {
  paid: 'badge-paid',
  PAID: 'badge-paid',
  partial: 'badge-partial',
  PARTIAL: 'badge-partial',
  pending: 'badge-pending',
  PENDING: 'badge-pending',
  ADMIN: 'bg-bg-tertiary text-text-primary text-xs px-2 py-0.5 rounded-full font-medium',
  WAREHOUSE: 'bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded-full font-medium',
  OUTLET: 'bg-purple-500/20 text-purple-400 text-xs px-2 py-0.5 rounded-full font-medium',
  PERFUME: 'bg-pink-500/20 text-pink-400 text-xs px-2 py-0.5 rounded-full font-medium',
  GADGET: 'bg-cyan-500/20 text-cyan-400 text-xs px-2 py-0.5 rounded-full font-medium',
  OTHER: 'bg-white/10 text-text-secondary text-xs px-2 py-0.5 rounded-full font-medium',
};

export default function Badge({ value }) {
  const cls = variants[value] || 'bg-bg-tertiary text-text-primary text-xs px-2 py-0.5 rounded-full font-medium';
  return <span className={cls}>{value}</span>;
}
