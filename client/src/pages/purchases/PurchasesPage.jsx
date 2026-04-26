import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import Modal from '../../components/ui/Modal';
import { formatCurrency, formatDate } from '../../utils/format';
import { SkeletonRow } from '../../components/ui/Skeleton';

function NewPurchaseModal({ isOpen, onClose, products, suppliers }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    supplierId: '', invoiceNumber: '', purchaseDate: new Date().toISOString().split('T')[0],
    currency: 'USD', exchangeRate: 14.5, fxGainLoss: 0, notes: '',
    items: [{ productId: '', quantity: 1, unitCost: 0 }],
  });

  const totalForeign = form.items.reduce((s, i) => s + (i.quantity * i.unitCost), 0);
  const totalGHS = totalForeign * form.exchangeRate;

  const addItem = () => setForm({ ...form, items: [...form.items, { productId: '', quantity: 1, unitCost: 0 }] });
  const removeItem = (idx) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  const updateItem = (idx, field, val) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: field === 'quantity' || field === 'unitCost' ? +val : val };
    setForm({ ...form, items });
  };

  const create = useMutation({
    mutationFn: (data) => api.post('/purchases', data),
    onSuccess: () => { toast.success('Purchase recorded'); qc.invalidateQueries(['purchases']); onClose(); },
    onError: (err) => toast.error(err.error || 'Failed to record purchase'),
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Purchase" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Supplier *</label>
            <select className="input" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
              <option value="">Select supplier</option>
              {suppliers?.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.country})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Invoice #</label>
            <input className="input" value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
          </div>
          <div>
            <label className="label">Currency</label>
            <select className="input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
              <option value="AED">AED</option>
              <option value="GHS">GHS</option>
            </select>
          </div>
          <div>
            <label className="label">Exchange Rate → GHS</label>
            <input type="number" className="input" step="0.01" value={form.exchangeRate} onChange={(e) => setForm({ ...form, exchangeRate: +e.target.value })} />
          </div>
        </div>

        {/* Line items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">Items</label>
            <button onClick={addItem} className="text-text-secondary hover:text-white text-sm">+ Add item</button>
          </div>
          <div className="space-y-2">
            {form.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <select className="input text-sm" value={item.productId} onChange={(e) => updateItem(idx, 'productId', e.target.value)}>
                    <option value="">Product</option>
                    {products?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <input type="number" className="input text-sm" placeholder="Qty" min={1} value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} />
                </div>
                <div className="col-span-3">
                  <input type="number" className="input text-sm" placeholder="Unit cost" step="0.01" value={item.unitCost} onChange={(e) => updateItem(idx, 'unitCost', e.target.value)} />
                </div>
                <div className="col-span-1 text-text-secondary text-xs text-right">
                  {(item.quantity * item.unitCost).toFixed(2)}
                </div>
                <div className="col-span-1 text-right">
                  {form.items.length > 1 && <button onClick={() => removeItem(idx)} className="text-danger text-sm">✕</button>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="bg-bg-tertiary rounded-lg p-3 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-text-secondary">Total ({form.currency})</span>
            <span className="text-white font-medium">{totalForeign.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Total (GHS @ {form.exchangeRate})</span>
            <span className="text-white font-medium">{formatCurrency(totalGHS)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">FX Gain/Loss (GHS)</label>
            <input type="number" className="input" step="0.01" value={form.fxGainLoss} onChange={(e) => setForm({ ...form, fxGainLoss: +e.target.value })} />
          </div>
          <div>
            <label className="label">Notes</label>
            <input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary flex-1"
            onClick={() => create.mutate({ ...form, totalForeign, totalGHS })}
            disabled={!form.supplierId || create.isPending}
          >
            {create.isPending ? 'Saving...' : 'Record Purchase'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function PurchasesPage() {
  const [addOpen, setAddOpen] = useState(false);

  const { data: purchases, isLoading } = useQuery({
    queryKey: ['purchases'],
    queryFn: () => api.get('/purchases'),
  });

  const { data: products } = useQuery({ queryKey: ['products'], queryFn: () => api.get('/products') });
  const { data: suppliers } = useQuery({ queryKey: ['suppliers'], queryFn: () => api.get('/suppliers') });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-white">Purchases</h1>
          <p className="text-text-secondary text-sm mt-1">Supplier purchase records</p>
        </div>
        <button className="btn-primary" onClick={() => setAddOpen(true)}>+ New Purchase</button>
      </div>

      <div className="card hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="th">Supplier</th>
              <th className="th">Invoice #</th>
              <th className="th">Date</th>
              <th className="th">Currency</th>
              <th className="th">Amount (Foreign)</th>
              <th className="th">Amount (GHS)</th>
              <th className="th">FX Gain/Loss</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={7} />)}
            {(purchases || []).map((p) => (
              <tr key={p.id} className="table-row">
                <td className="td font-medium">{p.supplier.name}</td>
                <td className="td text-text-secondary">{p.invoiceNumber || '—'}</td>
                <td className="td text-text-secondary">{formatDate(p.purchaseDate)}</td>
                <td className="td text-text-secondary">{p.currency}</td>
                <td className="td">{p.totalForeign.toFixed(2)}</td>
                <td className="td font-medium">{formatCurrency(p.totalGHS)}</td>
                <td className="td">
                  {p.fxGainLoss !== 0 ? (
                    <span className={p.fxGainLoss > 0 ? 'text-success' : 'text-danger'}>
                      {p.fxGainLoss > 0 ? '+' : ''}{formatCurrency(p.fxGainLoss)}
                    </span>
                  ) : <span className="text-text-tertiary">—</span>}
                </td>
              </tr>
            ))}
            {!isLoading && !purchases?.length && (
              <tr><td colSpan={7} className="td text-center text-text-tertiary py-8">No purchases recorded</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="lg:hidden space-y-3">
        {(purchases || []).map((p) => (
          <div key={p.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-white">{p.supplier.name}</p>
                <p className="text-text-tertiary text-xs mt-0.5">{formatDate(p.purchaseDate)} · {p.invoiceNumber || 'No invoice'}</p>
              </div>
              <span className="text-text-secondary text-xs">{p.currency}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border">
              <div><p className="text-xs text-text-tertiary">Foreign</p><p className="text-sm">{p.totalForeign.toFixed(2)}</p></div>
              <div><p className="text-xs text-text-tertiary">GHS</p><p className="text-sm">{formatCurrency(p.totalGHS)}</p></div>
            </div>
          </div>
        ))}
      </div>

      <NewPurchaseModal isOpen={addOpen} onClose={() => setAddOpen(false)} products={products} suppliers={suppliers} />
    </div>
  );
}
