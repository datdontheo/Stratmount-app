import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import Drawer from '../../components/ui/Drawer';
import Modal from '../../components/ui/Modal';
import { formatCurrency, formatDate } from '../../utils/format';

const emptyForm = { name: '', country: '', currency: 'USD', contact: '', email: '' };

export default function SuppliersPage() {
  const qc = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [historySupplier, setHistorySupplier] = useState(null);
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data: suppliers } = useQuery({ queryKey: ['suppliers'], queryFn: () => api.get('/suppliers') });

  const { data: history } = useQuery({
    queryKey: ['supplier-history', historySupplier?.id],
    queryFn: () => api.get(`/suppliers/${historySupplier.id}/purchases`),
    enabled: !!historySupplier,
  });

  const save = useMutation({
    mutationFn: (data) => editSupplier ? api.put(`/suppliers/${editSupplier.id}`, data) : api.post('/suppliers', data),
    onSuccess: () => { toast.success('Saved'); qc.invalidateQueries(['suppliers']); setDrawerOpen(false); },
    onError: (err) => toast.error(err.error || 'Failed'),
  });

  const deleteSupplier = useMutation({
    mutationFn: (id) => api.delete(`/suppliers/${id}`),
    onSuccess: () => { toast.success('Supplier deleted'); qc.invalidateQueries(['suppliers']); setDeleteConfirm(null); },
    onError: (err) => toast.error(err.error || 'Failed to delete'),
  });

  const openAdd = () => { setEditSupplier(null); setForm(emptyForm); setDrawerOpen(true); };
  const openEdit = (s) => { setEditSupplier(s); setForm({ name: s.name, country: s.country, currency: s.currency, contact: s.contact, email: s.email }); setDrawerOpen(true); };

  const filtered = (suppliers || []).filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.country || '').toLowerCase().includes(q) ||
      (s.contact || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-text-primary">Suppliers</h1>
          <p className="text-text-secondary text-sm mt-1">{suppliers?.length || 0} suppliers</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>+ Add Supplier</button>
      </div>

      <input
        className="input max-w-sm"
        placeholder="Search by name, country or contact..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="card hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="th">Name</th>
              <th className="th">Country</th>
              <th className="th">Currency</th>
              <th className="th">Contact</th>
              <th className="th">Purchases</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="table-row">
                <td className="td font-medium">{s.name}</td>
                <td className="td text-text-secondary">{s.country || '—'}</td>
                <td className="td text-text-secondary">{s.currency}</td>
                <td className="td text-text-secondary">{s.contact || s.email || '—'}</td>
                <td className="td text-text-secondary">{s._count?.purchases || 0}</td>
                <td className="td">
                  <div className="flex gap-2">
                    <button onClick={() => setHistorySupplier(s)} className="text-text-secondary hover:text-text-primary text-xs">History</button>
                    <button onClick={() => openEdit(s)} className="text-text-secondary hover:text-text-primary text-xs">Edit</button>
                    <button onClick={() => setDeleteConfirm(s)} className="text-text-secondary hover:text-danger text-xs">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="lg:hidden space-y-3">
        {filtered.map((s) => (
          <div key={s.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-text-primary">{s.name}</p>
                <p className="text-text-tertiary text-xs mt-0.5">{s.country} · {s.currency}</p>
              </div>
            </div>
            <div className="flex gap-3 mt-3 pt-2 border-t border-border">
              <button onClick={() => setHistorySupplier(s)} className="text-text-secondary text-sm">History</button>
              <button onClick={() => openEdit(s)} className="text-text-secondary text-sm">Edit</button>
              <button onClick={() => setDeleteConfirm(s)} className="text-text-secondary hover:text-danger text-sm">Delete</button>
            </div>
          </div>
        ))}
      </div>

      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title={editSupplier ? 'Edit Supplier' : 'New Supplier'}>
        <div className="space-y-4">
          <div><label className="label">Name *</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label">Country</label><input className="input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
          <div>
            <label className="label">Currency</label>
            <select className="input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
              <option value="AED">AED</option>
              <option value="GHS">GHS</option>
            </select>
          </div>
          <div><label className="label">Contact</label><input className="input" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></div>
          <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setDrawerOpen(false)}>Cancel</button>
            <button className="btn-primary flex-1" onClick={() => save.mutate(form)} disabled={!form.name || save.isPending}>
              {save.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </Drawer>

      <Modal isOpen={!!historySupplier} onClose={() => setHistorySupplier(null)} title={`Purchases — ${historySupplier?.name}`} size="lg">
        {history ? (
          <div className="space-y-3">
            {history.map((p) => (
              <div key={p.id} className="bg-bg-tertiary rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-text-primary">{formatDate(p.purchaseDate)}</p>
                  <span className="text-text-secondary text-sm">{p.invoiceNumber || 'No invoice'}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div><span className="text-text-tertiary text-xs">Currency</span><p>{p.currency}</p></div>
                  <div><span className="text-text-tertiary text-xs">Foreign</span><p>{p.totalForeign.toFixed(2)}</p></div>
                  <div><span className="text-text-tertiary text-xs">GHS</span><p>{formatCurrency(p.totalGHS)}</p></div>
                </div>
              </div>
            ))}
            {!history.length && <p className="text-text-tertiary text-center py-4">No purchases from this supplier</p>}
          </div>
        ) : <p className="text-text-tertiary py-4 text-center">Loading...</p>}
      </Modal>

      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Supplier" size="sm">
        <div className="space-y-4">
          <p className="text-text-secondary">Are you sure you want to delete <span className="font-semibold text-text-primary">{deleteConfirm?.name}</span>? This action cannot be undone.</p>
          <div className="flex gap-3">
            <button className="btn-secondary flex-1" onClick={() => setDeleteConfirm(null)}>Cancel</button>
            <button className="bg-danger text-white px-4 py-2 rounded-lg text-sm font-medium flex-1 disabled:opacity-50" onClick={() => deleteSupplier.mutate(deleteConfirm.id)} disabled={deleteSupplier.isPending}>
              {deleteSupplier.isPending ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
