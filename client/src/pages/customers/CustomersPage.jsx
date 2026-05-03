import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import Drawer from '../../components/ui/Drawer';
import Modal from '../../components/ui/Modal';
import { formatCurrency, formatDate } from '../../utils/format';
import Badge from '../../components/ui/Badge';

const emptyForm = { name: '', phone: '', email: '', type: 'DIRECT' };

export default function CustomersPage() {
  const qc = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [statementCustomer, setStatementCustomer] = useState(null);
  const [search, setSearch] = useState('');

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers'),
  });

  const { data: statement } = useQuery({
    queryKey: ['customer-statement', statementCustomer?.id],
    queryFn: () => api.get(`/customers/${statementCustomer.id}/statement`),
    enabled: !!statementCustomer,
  });

  const save = useMutation({
    mutationFn: (data) => editCustomer ? api.put(`/customers/${editCustomer.id}`, data) : api.post('/customers', data),
    onSuccess: () => { toast.success('Saved'); qc.invalidateQueries(['customers']); setDrawerOpen(false); },
    onError: (err) => toast.error(err.error || 'Failed'),
  });

  const openAdd = () => { setEditCustomer(null); setForm(emptyForm); setDrawerOpen(true); };
  const openEdit = (c) => { setEditCustomer(c); setForm({ ...c }); setDrawerOpen(true); };

  const filtered = (customers || []).filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-text-primary">Customers</h1>
          <p className="text-text-secondary text-sm mt-1">{customers?.length || 0} customers</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>+ Add Customer</button>
      </div>

      <input
        className="input max-w-sm"
        placeholder="Search by name, phone or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="card hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="th">Name</th>
              <th className="th">Phone</th>
              <th className="th">Email</th>
              <th className="th">Type</th>
              <th className="th">Total Sales</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="table-row">
                <td className="td font-medium">{c.name}</td>
                <td className="td text-text-secondary">{c.phone || '—'}</td>
                <td className="td text-text-secondary">{c.email || '—'}</td>
                <td className="td"><span className="text-xs bg-bg-tertiary px-2 py-0.5 rounded text-text-secondary">{c.type}</span></td>
                <td className="td text-text-secondary">{c._count?.sales || 0} sales</td>
                <td className="td">
                  <div className="flex gap-2">
                    <button onClick={() => setStatementCustomer(c)} className="text-text-secondary hover:text-text-primary text-xs">Statement</button>
                    <button onClick={() => openEdit(c)} className="text-text-secondary hover:text-text-primary text-xs">Edit</button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && !filtered.length && (
              <tr><td colSpan={6} className="td text-center text-text-tertiary py-8">No customers found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="lg:hidden space-y-3">
        {filtered.map((c) => (
          <div key={c.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-text-primary">{c.name}</p>
                <p className="text-text-tertiary text-xs mt-0.5">{c.phone || c.email || '—'}</p>
              </div>
              <span className="text-xs bg-bg-tertiary px-2 py-0.5 rounded text-text-secondary">{c.type}</span>
            </div>
            <div className="flex gap-3 mt-3 pt-2 border-t border-border">
              <button onClick={() => setStatementCustomer(c)} className="text-text-secondary hover:text-text-primary text-sm">Statement</button>
              <button onClick={() => openEdit(c)} className="text-text-secondary hover:text-text-primary text-sm">Edit</button>
            </div>
          </div>
        ))}
      </div>

      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title={editCustomer ? 'Edit Customer' : 'New Customer'}>
        <div className="space-y-4">
          <div><label className="label">Name *</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="DIRECT">Direct</option>
              <option value="OUTLET">Outlet</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setDrawerOpen(false)}>Cancel</button>
            <button className="btn-primary flex-1" onClick={() => save.mutate(form)} disabled={!form.name || save.isPending}>
              {save.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </Drawer>

      <Modal isOpen={!!statementCustomer} onClose={() => setStatementCustomer(null)} title={`Statement — ${statementCustomer?.name}`} size="lg">
        {statement ? (
          <div className="space-y-4">
            {statement.sales.map((sale) => (
              <div key={sale.id} className="bg-bg-tertiary rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-text-primary">{formatDate(sale.saleDate)}</p>
                    <p className="text-text-secondary text-xs mt-0.5">{sale.items?.map((i) => i.product?.name).join(', ')}</p>
                  </div>
                  <Badge value={sale.status} />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                  <div><span className="text-text-tertiary text-xs">Total</span><p>{formatCurrency(sale.totalAmount)}</p></div>
                  <div><span className="text-text-tertiary text-xs">Paid</span><p className="text-success">{formatCurrency(sale.amountPaid)}</p></div>
                  <div><span className="text-text-tertiary text-xs">Balance</span><p className="text-danger">{formatCurrency(sale.balance)}</p></div>
                </div>
              </div>
            ))}
            {!statement.sales.length && <p className="text-text-tertiary text-center py-4">No sales for this customer</p>}
          </div>
        ) : <p className="text-text-tertiary text-center py-4">Loading...</p>}
      </Modal>
    </div>
  );
}
