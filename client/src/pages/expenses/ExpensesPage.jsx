import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import Drawer from '../../components/ui/Drawer';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { formatCurrency, formatDate } from '../../utils/format';
import { SkeletonRow } from '../../components/ui/Skeleton';

const CATEGORIES = ['LOGISTICS', 'PACKAGING', 'MARKETING', 'RENT', 'UTILITIES', 'SALARIES', 'MISC'];
const emptyForm = { category: 'LOGISTICS', description: '', amount: '', currency: 'GHS', date: new Date().toISOString().split('T')[0], notes: '' };

export default function ExpensesPage() {
  const qc = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [catFilter, setCatFilter] = useState('');

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['expenses', catFilter],
    queryFn: () => api.get(`/expenses${catFilter ? `?category=${catFilter}` : ''}`),
  });

  const totalAmount = (expenses || []).reduce((s, e) => s + e.amount, 0);

  const save = useMutation({
    mutationFn: (data) => editExpense ? api.put(`/expenses/${editExpense.id}`, data) : api.post('/expenses', data),
    onSuccess: () => { toast.success('Saved'); qc.invalidateQueries(['expenses']); setDrawerOpen(false); },
    onError: (err) => toast.error(err.error || 'Failed'),
  });

  const del = useMutation({
    mutationFn: (id) => api.delete(`/expenses/${id}`),
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries(['expenses']); },
    onError: (err) => toast.error(err.error || 'Failed'),
  });

  const openAdd = () => { setEditExpense(null); setForm(emptyForm); setDrawerOpen(true); };
  const openEdit = (e) => { setEditExpense(e); setForm({ ...e, date: e.date?.split('T')[0] }); setDrawerOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-text-primary">Expenses</h1>
          <p className="text-text-secondary text-sm mt-1">Total: {formatCurrency(totalAmount)}</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>+ Add Expense</button>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setCatFilter('')} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${!catFilter ? 'font-semibold' : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'}`} style={!catFilter ? { backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' } : {}}>All</button>
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCatFilter(c)} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${catFilter === c ? 'font-semibold' : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'}`} style={catFilter === c ? { backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' } : {}}>{c}</button>
        ))}
      </div>

      <div className="card hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="th">Date</th>
              <th className="th">Category</th>
              <th className="th">Description</th>
              <th className="th">Amount</th>
              <th className="th">Notes</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={6} />)}
            {(expenses || []).map((e) => (
              <tr key={e.id} className="table-row">
                <td className="td text-text-secondary">{formatDate(e.date)}</td>
                <td className="td"><span className="text-xs bg-bg-tertiary px-2 py-0.5 rounded text-text-secondary">{e.category}</span></td>
                <td className="td font-medium">{e.description}</td>
                <td className="td text-danger font-medium">{formatCurrency(e.amount, e.currency)}</td>
                <td className="td text-text-secondary">{e.notes || '—'}</td>
                <td className="td">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(e)} className="text-text-secondary hover:text-text-primary text-xs">Edit</button>
                    <button onClick={() => setDeleteTarget(e)} className="text-text-secondary hover:text-danger text-xs">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && !expenses?.length && (
              <tr><td colSpan={6} className="td text-center text-text-tertiary py-8">No expenses recorded</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="lg:hidden space-y-3">
        {(expenses || []).map((e) => (
          <div key={e.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-text-primary">{e.description}</p>
                <p className="text-text-tertiary text-xs mt-0.5">{e.category} · {formatDate(e.date)}</p>
              </div>
              <p className="text-danger font-medium">{formatCurrency(e.amount)}</p>
            </div>
            <div className="flex gap-3 mt-3 pt-2 border-t border-border">
              <button onClick={() => openEdit(e)} className="text-text-secondary text-sm">Edit</button>
              <button onClick={() => setDeleteTarget(e)} className="text-danger text-sm">Delete</button>
            </div>
          </div>
        ))}
      </div>

      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title={editExpense ? 'Edit Expense' : 'New Expense'}>
        <div className="space-y-4">
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><label className="label">Description *</label><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Amount *</label><input type="number" className="input" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: +e.target.value })} /></div>
            <div>
              <label className="label">Currency</label>
              <select className="input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                <option value="GHS">GHS</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
          <div><label className="label">Date</label><input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setDrawerOpen(false)}>Cancel</button>
            <button className="btn-primary flex-1" onClick={() => save.mutate(form)} disabled={!form.description || !form.amount || save.isPending}>
              {save.isPending ? 'Saving...' : 'Save Expense'}
            </button>
          </div>
        </div>
      </Drawer>

      <ConfirmModal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => del.mutate(deleteTarget.id)}
        title="Delete Expense" message={`Delete "${deleteTarget?.description}"?`} confirmLabel="Delete" danger />
    </div>
  );
}
