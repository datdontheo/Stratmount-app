import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import useAuthStore from '../../store/authStore';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import { formatCurrency } from '../../utils/format';
import { SkeletonRow } from '../../components/ui/Skeleton';

function ReceiveModal({ isOpen, onClose, products }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ productId: '', quantity: 1 });

  const receive = useMutation({
    mutationFn: (data) => api.post('/inventory/receive', data),
    onSuccess: () => {
      toast.success('Stock received into warehouse');
      qc.invalidateQueries(['inventory']);
      onClose();
      setForm({ productId: '', quantity: 1 });
    },
    onError: (err) => toast.error(err.error || 'Failed to receive stock'),
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Receive Stock into Warehouse" size="sm">
      <div className="space-y-4">
        <div>
          <label className="label">Product</label>
          <select className="input" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
            <option value="">Select product</option>
            {products?.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
          </select>
        </div>
        <div>
          <label className="label">Quantity</label>
          <input type="number" className="input" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: +e.target.value })} />
        </div>
        <div className="flex gap-3 pt-2">
          <button className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary flex-1"
            onClick={() => receive.mutate(form)}
            disabled={!form.productId || form.quantity < 1 || receive.isPending}
          >
            {receive.isPending ? 'Receiving...' : 'Receive Stock'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function AssignModal({ isOpen, onClose, products, users }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ productId: '', toUserId: '', quantity: 1, notes: '' });

  const assign = useMutation({
    mutationFn: (data) => api.post('/inventory/assign', data),
    onSuccess: () => {
      toast.success('Stock assigned successfully');
      qc.invalidateQueries(['inventory']);
      onClose();
      setForm({ productId: '', toUserId: '', quantity: 1, notes: '' });
    },
    onError: (err) => toast.error(err.error || 'Failed to assign stock'),
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assign Stock to Outlet" size="sm">
      <div className="space-y-4">
        <div>
          <label className="label">Product</label>
          <select className="input" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
            <option value="">Select product</option>
            {products?.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
          </select>
        </div>
        <div>
          <label className="label">Assign To</label>
          <select className="input" value={form.toUserId} onChange={(e) => setForm({ ...form, toUserId: e.target.value })}>
            <option value="">Select user</option>
            {users?.filter((u) => u.role !== 'ADMIN').map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
          </select>
        </div>
        <div>
          <label className="label">Quantity</label>
          <input type="number" className="input" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: +e.target.value })} />
        </div>
        <div>
          <label className="label">Notes (optional)</label>
          <input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div className="flex gap-3 pt-2">
          <button className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary flex-1"
            onClick={() => assign.mutate(form)}
            disabled={!form.productId || !form.toUserId || assign.isPending}
          >
            {assign.isPending ? 'Assigning...' : 'Assign Stock'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ReturnModal({ isOpen, onClose, products, users }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ productId: '', fromUserId: '', quantity: 1, notes: '' });

  const returnStock = useMutation({
    mutationFn: (data) => api.post('/inventory/return', data),
    onSuccess: () => {
      toast.success('Stock returned to warehouse');
      qc.invalidateQueries(['inventory']);
      onClose();
      setForm({ productId: '', fromUserId: '', quantity: 1, notes: '' });
    },
    onError: (err) => toast.error(err.error || 'Failed to return stock'),
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Return Stock to Warehouse" size="sm">
      <div className="space-y-4">
        <p className="text-text-secondary text-sm">Move unsold stock from an outlet back to the warehouse.</p>
        <div>
          <label className="label">Product</label>
          <select className="input" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
            <option value="">Select product</option>
            {products?.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
          </select>
        </div>
        <div>
          <label className="label">Return From (Outlet)</label>
          <select className="input" value={form.fromUserId} onChange={(e) => setForm({ ...form, fromUserId: e.target.value })}>
            <option value="">Select outlet user</option>
            {users?.filter((u) => u.role !== 'ADMIN').map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
          </select>
        </div>
        <div>
          <label className="label">Quantity</label>
          <input type="number" className="input" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: +e.target.value })} />
        </div>
        <div className="flex gap-3 pt-2">
          <button className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary flex-1"
            onClick={() => returnStock.mutate(form)}
            disabled={!form.productId || !form.fromUserId || returnStock.isPending}
          >
            {returnStock.isPending ? 'Returning...' : 'Return to Warehouse'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function WriteOffModal({ isOpen, onClose, inventory }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ productId: '', location: 'WAREHOUSE', quantity: 1, reason: '' });

  // Unique locations from inventory
  const locations = [...new Set((inventory || []).map((i) => i.location))];

  const writeOff = useMutation({
    mutationFn: (data) => api.post('/inventory/writeoff', data),
    onSuccess: () => {
      toast.success('Stock written off');
      qc.invalidateQueries(['inventory']);
      onClose();
      setForm({ productId: '', location: 'WAREHOUSE', quantity: 1, reason: '' });
    },
    onError: (err) => toast.error(err.error || 'Failed to write off stock'),
  });

  // Filter inventory to selected product+location
  const available = (inventory || []).find(
    (i) => i.productId === form.productId && i.location === form.location
  )?.quantity ?? 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Write Off Stock" size="sm">
      <div className="space-y-4">
        <p className="text-text-secondary text-sm">Remove damaged, lost, or expired stock from inventory.</p>
        <div>
          <label className="label">Product</label>
          <select className="input" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
            <option value="">Select product</option>
            {[...new Map((inventory || []).map((i) => [i.productId, i.product])).entries()].map(([id, p]) => (
              <option key={id} value={id}>{p.name} ({p.sku})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Location</label>
          <select className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}>
            {locations.map((loc) => (
              <option key={loc} value={loc}>{loc === 'WAREHOUSE' ? 'Warehouse' : loc.replace('OUTLET_', 'Outlet: ')}</option>
            ))}
          </select>
        </div>
        {form.productId && <p className="text-text-tertiary text-xs">Available: {available}</p>}
        <div>
          <label className="label">Quantity to Write Off</label>
          <input type="number" className="input" min={1} max={available} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: +e.target.value })} />
        </div>
        <div>
          <label className="label">Reason (optional)</label>
          <input className="input" placeholder="Damaged, expired, lost..." value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        </div>
        <div className="flex gap-3 pt-2">
          <button className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button
            className="bg-danger text-white px-4 py-2 rounded-lg text-sm font-medium flex-1 disabled:opacity-50"
            onClick={() => writeOff.mutate(form)}
            disabled={!form.productId || form.quantity < 1 || writeOff.isPending}
          >
            {writeOff.isPending ? 'Writing Off...' : 'Write Off Stock'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function InventoryPage() {
  const { user } = useAuthStore();
  const [assignOpen, setAssignOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [writeOffOpen, setWriteOffOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');

  const isOutlet = user?.role === 'OUTLET';

  const { data: inventory, isLoading } = useQuery({
    queryKey: ['inventory', isOutlet],
    queryFn: () => api.get(isOutlet ? '/inventory/my' : '/inventory'),
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.get('/products'),
    enabled: !isOutlet,
  });

  const { data: holders } = useQuery({
    queryKey: ['inventory-holders'],
    queryFn: () => api.get('/inventory/holders'),
    enabled: !isOutlet,
  });

  const filtered = (inventory || []).filter((item) =>
    categoryFilter ? item.product.category === categoryFilter : true
  );

  // Group by product for admin view
  const grouped = {};
  if (!isOutlet) {
    filtered.forEach((item) => {
      if (!grouped[item.productId]) {
        grouped[item.productId] = { product: item.product, entries: [] };
      }
      grouped[item.productId].entries.push(item);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-text-primary">Inventory</h1>
          <p className="text-text-secondary text-sm mt-1">
            {isOutlet ? 'Your assigned stock' : 'All stock locations'}
          </p>
        </div>
        {!isOutlet && (
          <div className="flex gap-2 flex-wrap justify-end">
            <button className="btn-secondary text-sm" onClick={() => setReceiveOpen(true)}>+ Receive</button>
            <button className="btn-primary text-sm" onClick={() => setAssignOpen(true)}>+ Assign</button>
            <button className="btn-secondary text-sm" onClick={() => setReturnOpen(true)}>Return</button>
            <button className="btn-secondary text-sm text-danger hover:bg-danger/10" onClick={() => setWriteOffOpen(true)}>Write Off</button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        {['', 'PERFUME', 'GADGET', 'OTHER'].map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              categoryFilter === cat ? 'font-semibold' : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
            }`}
            style={categoryFilter === cat ? { backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' } : {}}
          >
            {cat || 'All'}
          </button>
        ))}
      </div>

      {/* Desktop table */}
      <div className="card hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="th">Product</th>
              <th className="th">SKU</th>
              <th className="th">Category</th>
              {isOutlet ? (
                <th className="th">Qty</th>
              ) : (
                <>
                  <th className="th">Warehouse</th>
                  <th className="th">Outlets</th>
                  <th className="th">Total</th>
                </>
              )}
              <th className="th">Value</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={isOutlet ? 5 : 7} />)}
            {isOutlet
              ? filtered.map((item) => (
                  <tr key={item.id} className="table-row">
                    <td className="td font-medium">{item.product.name}</td>
                    <td className="td text-text-secondary">{item.product.sku}</td>
                    <td className="td"><Badge value={item.product.category} /></td>
                    <td className="td">
                      <span className={item.quantity <= 3 ? 'text-danger font-medium' : ''}>{item.quantity}</span>
                    </td>
                    <td className="td">{formatCurrency(item.quantity * item.product.sellingPrice)}</td>
                  </tr>
                ))
              : Object.values(grouped).map(({ product, entries }) => {
                  const warehouseQty = entries.find((e) => e.location === 'WAREHOUSE')?.quantity || 0;
                  const outletEntries = entries.filter((e) => e.location !== 'WAREHOUSE');
                  const total = entries.reduce((s, e) => s + e.quantity, 0);
                  return (
                    <tr key={product.id} className="table-row">
                      <td className="td font-medium">{product.name}</td>
                      <td className="td text-text-secondary">{product.sku}</td>
                      <td className="td"><Badge value={product.category} /></td>
                      <td className="td">
                        <span className={warehouseQty <= 5 ? 'text-warning' : ''}>{warehouseQty}</span>
                      </td>
                      <td className="td text-text-secondary text-xs">
                        {outletEntries.map((e) => `${e.location.replace('OUTLET_', '').slice(0, 6)}: ${e.quantity}`).join(', ') || '—'}
                      </td>
                      <td className="td font-medium">{total}</td>
                      <td className="td">{formatCurrency(total * product.costPrice)}</td>
                    </tr>
                  );
                })}
            {!isLoading && !filtered.length && (
              <tr><td colSpan={8} className="td text-center text-text-tertiary py-8">No inventory records</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden space-y-3">
        {isLoading && <div className="text-center py-8 text-text-tertiary">Loading...</div>}
        {filtered.map((item) => (
          <div key={item.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-text-primary">{item.product.name}</p>
                <p className="text-text-tertiary text-xs mt-0.5">{item.product.sku}</p>
              </div>
              <Badge value={item.product.category} />
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
              <span className="text-text-secondary text-sm">Quantity</span>
              <span className={`font-medium ${item.quantity <= 3 ? 'text-danger' : 'text-text-primary'}`}>
                {item.quantity} {item.product.unit}s
              </span>
            </div>
          </div>
        ))}
      </div>

      <ReceiveModal isOpen={receiveOpen} onClose={() => setReceiveOpen(false)} products={products} />
      <AssignModal isOpen={assignOpen} onClose={() => setAssignOpen(false)} products={products} users={holders?.users} />
      <ReturnModal isOpen={returnOpen} onClose={() => setReturnOpen(false)} products={products} users={holders?.users} />
      <WriteOffModal isOpen={writeOffOpen} onClose={() => setWriteOffOpen(false)} inventory={inventory} />
    </div>
  );
}
