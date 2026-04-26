import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import Drawer from '../../components/ui/Drawer';
import ConfirmModal from '../../components/ui/ConfirmModal';
import Badge from '../../components/ui/Badge';
import { formatCurrency } from '../../utils/format';
import { SkeletonRow } from '../../components/ui/Skeleton';

const emptyForm = { name: '', sku: '', brand: '', category: 'PERFUME', description: '', unit: 'bottle', costPrice: '', sellingPrice: '', currency: 'GHS' };

export default function ProductsPage() {
  const qc = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');

  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.get('/products'),
  });

  const save = useMutation({
    mutationFn: (data) => editProduct ? api.put(`/products/${editProduct.id}`, data) : api.post('/products', data),
    onSuccess: () => {
      toast.success(editProduct ? 'Product updated' : 'Product created');
      qc.invalidateQueries(['products']);
      setDrawerOpen(false);
    },
    onError: (err) => toast.error(err.error || 'Failed to save product'),
  });

  const del = useMutation({
    mutationFn: (id) => api.delete(`/products/${id}`),
    onSuccess: () => { toast.success('Product deleted'); qc.invalidateQueries(['products']); },
    onError: (err) => toast.error(err.error || 'Failed to delete'),
  });

  const openAdd = () => { setEditProduct(null); setForm(emptyForm); setDrawerOpen(true); };
  const openEdit = (p) => { setEditProduct(p); setForm({ ...p }); setDrawerOpen(true); };

  const filtered = (products || []).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-white">Products</h1>
          <p className="text-text-secondary text-sm mt-1">{products?.length || 0} products</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>+ Add Product</button>
      </div>

      <input
        className="input max-w-sm"
        placeholder="Search by name or SKU..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Desktop */}
      <div className="card hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="th">Name</th>
              <th className="th">SKU</th>
              <th className="th">Brand</th>
              <th className="th">Category</th>
              <th className="th">Cost</th>
              <th className="th">Price</th>
              <th className="th">Currency</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={8} />)}
            {filtered.map((p) => (
              <tr key={p.id} className="table-row">
                <td className="td font-medium">{p.name}</td>
                <td className="td text-text-secondary">{p.sku}</td>
                <td className="td text-text-secondary">{p.brand || '—'}</td>
                <td className="td"><Badge value={p.category} /></td>
                <td className="td">{formatCurrency(p.costPrice, p.currency)}</td>
                <td className="td">{formatCurrency(p.sellingPrice, p.currency)}</td>
                <td className="td text-text-secondary">{p.currency}</td>
                <td className="td">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(p)} className="text-text-secondary hover:text-white text-xs">Edit</button>
                    <button onClick={() => setDeleteTarget(p)} className="text-text-secondary hover:text-danger text-xs">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && !filtered.length && (
              <tr><td colSpan={8} className="td text-center text-text-tertiary py-8">No products found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="lg:hidden space-y-3">
        {filtered.map((p) => (
          <div key={p.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-white">{p.name}</p>
                <p className="text-text-tertiary text-xs mt-0.5">{p.sku} · {p.brand}</p>
              </div>
              <Badge value={p.category} />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border">
              <div><p className="text-xs text-text-tertiary">Cost</p><p className="text-sm">{formatCurrency(p.costPrice, p.currency)}</p></div>
              <div><p className="text-xs text-text-tertiary">Price</p><p className="text-sm">{formatCurrency(p.sellingPrice, p.currency)}</p></div>
            </div>
            <div className="flex gap-3 mt-3 pt-2 border-t border-border">
              <button onClick={() => openEdit(p)} className="text-text-secondary hover:text-white text-sm">Edit</button>
              <button onClick={() => setDeleteTarget(p)} className="text-text-secondary hover:text-danger text-sm">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {/* Drawer */}
      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title={editProduct ? 'Edit Product' : 'New Product'}>
        <div className="space-y-4">
          <div><label className="label">Name *</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label">SKU *</label><input className="input" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
          <div><label className="label">Brand</label><input className="input" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="PERFUME">Perfume</option>
              <option value="GADGET">Gadget</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="label">Currency</label>
            <select className="input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              <option value="GHS">GHS (GH₵)</option>
              <option value="USD">USD ($)</option>
              <option value="GBP">GBP (£)</option>
              <option value="AED">AED</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Cost Price</label><input type="number" className="input" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: +e.target.value })} /></div>
            <div><label className="label">Selling Price</label><input type="number" className="input" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: +e.target.value })} /></div>
          </div>
          <div><label className="label">Unit</label><input className="input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="bottle, piece..." /></div>
          <div><label className="label">Description</label><textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setDrawerOpen(false)}>Cancel</button>
            <button className="btn-primary flex-1" onClick={() => save.mutate(form)} disabled={save.isPending}>
              {save.isPending ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        </div>
      </Drawer>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => del.mutate(deleteTarget.id)}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
