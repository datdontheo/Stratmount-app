import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import useAuthStore from '../../store/authStore';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import { formatCurrency, formatDate } from '../../utils/format';
import { SkeletonRow } from '../../components/ui/Skeleton';
import { IconX, IconPlus, IconChevronRight } from '../../components/ui/Icons';

const CATEGORIES = ['All', 'PERFUME', 'GADGET', 'OTHER'];

function NewSaleModal({ isOpen, onClose, products, customers, defaultMargin }) {
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const [productSearch, setProductSearch] = useState('');
  const [productCategory, setProductCategory] = useState('All');

  const [form, setForm] = useState({
    customerId: '', notes: '', currency: 'GHS', amountPaid: 0, saleDate: new Date().toISOString().split('T')[0],
    items: [{ productId: '', quantity: 1, unitPrice: 0 }],
  });

  const filteredProducts = (products || []).filter((p) => {
    const matchesSearch = !productSearch ||
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.brand || '').toLowerCase().includes(productSearch.toLowerCase());
    const matchesCategory = productCategory === 'All' || p.category === productCategory;
    return matchesSearch && matchesCategory;
  });

  const totalAmount = form.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const balance = totalAmount - (form.amountPaid || 0);
  const status = balance <= 0 ? 'PAID' : form.amountPaid > 0 ? 'PARTIAL' : 'PENDING';

  const addItem = () => setForm({ ...form, items: [...form.items, { productId: '', quantity: 1, unitPrice: 0 }] });
  const removeItem = (idx) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  const updateItem = (idx, field, val) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: field === 'quantity' || field === 'unitPrice' ? +val : val };
    if (field === 'productId') {
      const product = products?.find((p) => p.id === val);
      if (product) {
        // Outlet: auto-fill using default margin if set; else use admin-set selling price
        if (user?.role === 'OUTLET' && defaultMargin != null && defaultMargin > 0) {
          items[idx].unitPrice = +(product.costPrice * (1 + defaultMargin / 100)).toFixed(2);
        } else {
          items[idx].unitPrice = product.sellingPrice;
        }
      }
    }
    setForm({ ...form, items });
  };

  const handleClose = () => {
    setProductSearch('');
    setProductCategory('All');
    onClose();
  };

  const create = useMutation({
    mutationFn: (data) => api.post('/sales', data),
    onSuccess: () => {
      toast.success('Sale recorded');
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      handleClose();
      setForm({ customerId: '', notes: '', currency: 'GHS', amountPaid: 0, saleDate: new Date().toISOString().split('T')[0], items: [{ productId: '', quantity: 1, unitPrice: 0 }] });
    },
    onError: (err) => toast.error(err.error || 'Failed to record sale'),
  });

  const statusColors = { PAID: 'text-success', PARTIAL: 'text-warning', PENDING: 'text-danger' };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New Sale" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Customer</label>
            <select className="input" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
              <option value="">Walk-in / No customer</option>
              {customers?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={form.saleDate} onChange={(e) => setForm({ ...form, saleDate: e.target.value })} />
          </div>
        </div>

        {/* Product filter */}
        <div className="bg-bg-tertiary rounded-lg p-3 space-y-2">
          <p className="text-xs text-text-tertiary font-medium">Filter products</p>
          <input
            className="input text-sm"
            placeholder="Search by name, SKU or brand..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
          />
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setProductCategory(cat)}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${productCategory === cat ? 'font-semibold' : 'bg-bg-secondary text-text-secondary hover:text-text-primary'}`}
                style={productCategory === cat ? { backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' } : {}}
              >
                {cat === 'All' ? 'All' : cat.charAt(0) + cat.slice(1).toLowerCase()}
              </button>
            ))}
            {filteredProducts.length !== (products || []).length && (
              <span className="text-xs text-text-tertiary self-center ml-1">{filteredProducts.length} shown</span>
            )}
          </div>
        </div>

        {/* Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">Items</label>
            <button onClick={addItem} className="text-text-secondary hover:text-text-primary text-sm">+ Add item</button>
          </div>
          <div className="space-y-2">
            {form.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <select className="input text-sm" value={item.productId} onChange={(e) => updateItem(idx, 'productId', e.target.value)}>
                    <option value="">Select product</option>
                    {filteredProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.brand ? ` (${p.brand})` : ''}
                      </option>
                    ))}
                    {/* Show already-selected product even if outside filter */}
                    {item.productId && !filteredProducts.find((p) => p.id === item.productId) && (() => {
                      const p = products?.find((pr) => pr.id === item.productId);
                      return p ? <option key={p.id} value={p.id}>⚠ {p.name} (outside filter)</option> : null;
                    })()}
                  </select>
                </div>
                <div className="col-span-2">
                  <input type="number" className="input text-sm" placeholder="Qty" min={1} value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} />
                </div>
                <div className="col-span-3">
                  <input type="number" className="input text-sm" placeholder="Unit price" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)} />
                </div>
                <div className="col-span-1 text-text-secondary text-xs text-right">
                  {formatCurrency(item.quantity * item.unitPrice)}
                </div>
                <div className="col-span-1 text-right">
                  {form.items.length > 1 && <button onClick={() => removeItem(idx)} className="text-danger text-sm"><IconX size={14} /></button>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="bg-bg-tertiary rounded-lg p-3 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-text-secondary">Subtotal</span>
            <span className="font-medium">{formatCurrency(totalAmount)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-secondary">Amount Paid</span>
            <input
              type="number"
              className="input w-32 text-right text-sm py-1"
              step="0.01"
              min={0}
              max={totalAmount}
              value={form.amountPaid}
              onChange={(e) => setForm({ ...form, amountPaid: +e.target.value })}
            />
          </div>
          <div className="flex justify-between font-medium border-t border-border pt-1.5">
            <span className="text-text-secondary">Balance</span>
            <span className={statusColors[status]}>{formatCurrency(Math.max(0, balance))} — {status}</span>
          </div>
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>

        <div className="flex gap-3 pt-2">
          <button className="btn-secondary flex-1" onClick={handleClose}>Cancel</button>
          <button
            className="btn-primary flex-1"
            onClick={() => create.mutate(form)}
            disabled={!form.items[0]?.productId || create.isPending}
          >
            {create.isPending ? 'Saving...' : 'Record Sale'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function SalesPage() {
  const { user } = useAuthStore();
  const [addOpen, setAddOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const { data: sales, isLoading } = useQuery({
    queryKey: ['sales', statusFilter],
    queryFn: () => api.get(`/sales${statusFilter ? `?status=${statusFilter}` : ''}`),
  });

  const { data: products } = useQuery({ queryKey: ['products'], queryFn: () => api.get('/products') });
  const { data: customers } = useQuery({ queryKey: ['customers'], queryFn: () => api.get('/customers') });

  // Outlet: load default margin for price auto-fill
  const { data: userProfile } = useQuery({
    queryKey: ['user-me'],
    queryFn: () => api.get('/users/me'),
    enabled: user?.role === 'OUTLET',
  });

  const filteredSales = (sales || []).filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (s.customer?.name || 'walk-in').toLowerCase().includes(q) ||
      (s.soldBy?.name || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-text-primary">Sales</h1>
          <p className="text-text-secondary text-sm mt-1">{filteredSales.length} records</p>
        </div>
        <button className="btn-primary" onClick={() => setAddOpen(true)}>+ New Sale</button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-2">
          {['', 'PENDING', 'PARTIAL', 'PAID'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${statusFilter === s ? 'font-semibold' : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'}`}
              style={statusFilter === s ? { backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' } : {}}>
              {s || 'All'}
            </button>
          ))}
        </div>
        <input
          className="input max-w-xs"
          placeholder="Search customer or seller..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="th">Customer</th>
              <th className="th">Sold By</th>
              <th className="th">Date</th>
              <th className="th">Total</th>
              <th className="th">Paid</th>
              <th className="th">Balance</th>
              <th className="th">Status</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={8} />)}
            {filteredSales.map((sale) => (
              <tr key={sale.id} className="table-row">
                <td className="td font-medium">{sale.customer?.name || 'Walk-in'}</td>
                <td className="td text-text-secondary">{sale.soldBy?.name}</td>
                <td className="td text-text-secondary">{formatDate(sale.saleDate)}</td>
                <td className="td">{formatCurrency(sale.totalAmount)}</td>
                <td className="td text-success">{formatCurrency(sale.amountPaid)}</td>
                <td className="td text-danger">{formatCurrency(sale.balance)}</td>
                <td className="td"><Badge value={sale.status} /></td>
                <td className="td">
                  <Link to={`/sales/${sale.id}`} className="text-text-secondary hover:text-text-primary text-xs flex items-center gap-1">View <IconChevronRight size={12} /></Link>
                </td>
              </tr>
            ))}
            {!isLoading && !filteredSales.length && (
              <tr><td colSpan={8} className="td text-center text-text-tertiary py-8">No sales found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="lg:hidden space-y-3">
        {filteredSales.map((sale) => (
          <Link key={sale.id} to={`/sales/${sale.id}`} className="card block hover:bg-bg-tertiary transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-text-primary">{sale.customer?.name || 'Walk-in'}</p>
                <p className="text-text-tertiary text-xs mt-0.5">{formatDate(sale.saleDate)} · {sale.soldBy?.name}</p>
              </div>
              <Badge value={sale.status} />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border text-sm">
              <div><p className="text-xs text-text-tertiary">Total</p><p>{formatCurrency(sale.totalAmount)}</p></div>
              <div><p className="text-xs text-text-tertiary">Paid</p><p className="text-success">{formatCurrency(sale.amountPaid)}</p></div>
              <div><p className="text-xs text-text-tertiary">Balance</p><p className="text-danger">{formatCurrency(sale.balance)}</p></div>
            </div>
          </Link>
        ))}
      </div>

      {/* FAB mobile */}
      <button
        onClick={() => setAddOpen(true)}
        className="lg:hidden fixed bottom-20 right-4 w-14 h-14 rounded-full flex items-center justify-center shadow-lg z-20"
        style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
      >
        <IconPlus size={24} />
      </button>

      <NewSaleModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        products={products}
        customers={customers}
        defaultMargin={userProfile?.defaultMargin ?? null}
      />
    </div>
  );
}
