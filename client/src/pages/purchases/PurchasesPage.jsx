import { Fragment, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { formatCurrency, formatDate } from '../../utils/format';
import { IconPlus, IconX, IconShoppingCart, IconEdit, IconTrash } from '../../components/ui/Icons';

const CURRENCIES = ['GHS', 'AED', 'USD', 'GBP', 'EUR'];
const CATEGORIES = ['All', 'PERFUME', 'GADGET', 'OTHER'];
const DEFAULT_MARGIN = 20;

const safe = (v) => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string' || typeof v === 'number') return v;
  if (typeof v === 'boolean') return String(v);
  try { return JSON.stringify(v); } catch { return ''; }
};

function emptyItem() {
  return { productId: '', quantity: 1, unitCost: 0, totalCost: 0, profitMargin: DEFAULT_MARGIN };
}

function calcItems(rows, effectiveRate, shippingCostGHS) {
  const totalQty = rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
  return rows.map((r) => {
    const qty = Number(r.quantity) || 0;
    const unitCostForeign = Number(r.unitCost) || 0;
    const unitCostGHS = unitCostForeign * effectiveRate;
    const lineTotalGHS = unitCostGHS * qty;
    const defaultShipping = totalQty > 0 ? (shippingCostGHS * qty) / totalQty : 0;
    const shippingAllocated = r._shippingOverride !== undefined ? r._shippingOverride : defaultShipping;
    const trueCostPerUnit = qty > 0 ? unitCostGHS + shippingAllocated / qty : unitCostGHS;
    const margin = Number(r.profitMargin) ?? DEFAULT_MARGIN;
    const outletPrice = trueCostPerUnit * (1 + margin / 100);
    return { ...r, unitCostGHS, lineTotalGHS, shippingAllocated, trueCostPerUnit, outletPrice };
  });
}

function ItemsTable({ rows, computed, currency, onUpdate, onAdd, onRemove, productList, allProductList, shippingTotal, allRows }) {
  const fmt = (n) => (Number(n) || 0).toFixed(2);
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full text-sm min-w-[1050px]">
          <thead>
            <tr className="border-b border-border">
              <th className="th">Product</th>
              <th className="th">Qty</th>
              <th className="th">Unit Cost ({safe(currency)})</th>
              <th className="th">Total Cost ({safe(currency)})</th>
              {currency !== 'GHS' && <th className="th">Unit Cost (GHS)</th>}
              <th className="th">Shipping Alloc. (GHS)</th>
              <th className="th">True Cost/Unit</th>
              <th className="th">Margin %</th>
              <th className="th">Outlet Price (GHS)</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const c = computed[i] || {};
              return (
                <tr key={i} className="border-b border-border">
                  <td className="td min-w-[200px]">
                    <select
                      className="input text-xs py-1.5"
                      value={row.productId}
                      onChange={(e) => onUpdate(i, 'productId', e.target.value)}
                    >
                      <option value="">— Select product —</option>
                      {productList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {safe(p.name)}{p.brand ? ` (${safe(p.brand)})` : ''} [{safe(p.category)}]
                        </option>
                      ))}
                      {row.productId && !productList.find((p) => p.id === row.productId) && (() => {
                        const sel = (allProductList || productList).find((p) => p.id === row.productId);
                        return sel ? <option key={sel.id} value={sel.id}>{safe(sel.name)} ⚠ (outside filter)</option> : null;
                      })()}
                    </select>
                  </td>
                  <td className="td">
                    <input type="number" min={1} className="input text-xs py-1.5 w-20" value={row.quantity} onChange={(e) => onUpdate(i, 'quantity', e.target.value)} />
                  </td>
                  <td className="td">
                    <input type="number" step="0.01" className="input text-xs py-1.5 w-28" value={row.unitCost} onChange={(e) => onUpdate(i, 'unitCost', e.target.value)} />
                  </td>
                  <td className="td">
                    <input type="number" step="0.01" className="input text-xs py-1.5 w-28" value={fmt(row.totalCost)} onChange={(e) => onUpdate(i, 'totalCost', e.target.value)} />
                  </td>
                  {currency !== 'GHS' && <td className="td text-text-secondary">{fmt(c.unitCostGHS)}</td>}
                  <td className="td">
                    <input
                      type="number" step="0.01" className="input text-xs py-1.5 w-28"
                      value={row._shippingOverride !== undefined ? row._shippingOverride : fmt(c.shippingAllocated)}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        onUpdate(i, '_shippingOverride', val);
                        if (allRows && shippingTotal > 0) {
                          const otherUnset = (allRows).filter((r, idx) => idx !== i && r._shippingOverride === undefined);
                          if (otherUnset.length === 1) {
                            const alreadySet = allRows.reduce((s, r, idx) =>
                              idx !== i && r._shippingOverride !== undefined ? s + r._shippingOverride : s, 0);
                            const remaining = (Number(shippingTotal) || 0) - alreadySet - val;
                            const autoIdx = allRows.findIndex((r, idx) => idx !== i && r._shippingOverride === undefined);
                            onUpdate(autoIdx, '_shippingOverride', Math.max(0, Math.round(remaining * 100) / 100));
                          }
                        }
                      }}
                    />
                  </td>
                  <td className="td font-medium">{fmt(c.trueCostPerUnit)}</td>
                  <td className="td">
                    <input
                      type="number" step="0.01" className="input text-xs py-1.5 w-20"
                      value={fmt(row.profitMargin)}
                      onChange={(e) => onUpdate(i, 'profitMargin', e.target.value)}
                    />
                  </td>
                  <td className="td">
                    <input
                      type="number" step="0.01" className="input text-xs py-1.5 w-28 font-semibold"
                      style={{ color: 'var(--success)' }}
                      value={fmt(c.outletPrice)}
                      onChange={(e) => {
                        const price = Number(e.target.value) || 0;
                        const trueCost = c.trueCostPerUnit || 0;
                        const impliedMargin = trueCost > 0 ? Math.round(((price / trueCost) - 1) * 10000) / 100 : 0;
                        onUpdate(i, 'profitMargin', impliedMargin);
                      }}
                    />
                  </td>
                  <td className="td">
                    {rows.length > 1 && (
                      <button onClick={() => onRemove(i)} className="text-text-tertiary hover:text-danger transition-colors">
                        <IconX size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button onClick={onAdd} className="btn-secondary text-sm flex items-center gap-2">
        <IconPlus size={14} /> Add Product
      </button>
    </div>
  );
}

function makeUpdateRow(setRows) {
  return (i, field, value) => {
    setRows((prev) => prev.map((r, idx) => {
      if (idx !== i) return r;
      const updated = { ...r, [field]: value };
      const qty = Number(field === 'quantity' ? value : updated.quantity) || 1;
      if (field === 'unitCost') updated.totalCost = (Number(value) || 0) * qty;
      else if (field === 'totalCost') updated.unitCost = qty > 0 ? (Number(value) || 0) / qty : 0;
      else if (field === 'quantity') updated.totalCost = (Number(updated.unitCost) || 0) * qty;
      return updated;
    }));
  };
}

function EditModal({ purchase, suppliers, products, onClose, onSave, isSaving }) {
  const [supplierId, setSupplierId] = useState(purchase.supplierId);
  const [invoiceNumber, setInvoiceNumber] = useState(purchase.invoiceNumber || '');
  const [purchaseDate, setPurchaseDate] = useState(purchase.purchaseDate?.slice(0, 10) || '');
  const [currency, setCurrency] = useState(purchase.currency || 'GHS');
  const [exchangeRate, setExchangeRate] = useState(String(purchase.exchangeRate || 1));
  const [shippingCostGHS, setShippingCostGHS] = useState(purchase.shippingCostGHS || 0);
  const [notes, setNotes] = useState(purchase.notes || '');
  const [rows, setRows] = useState(
    (purchase.items || []).map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitCost: item.unitCost,
      totalCost: item.totalCost,
      profitMargin: item.profitMargin ?? DEFAULT_MARGIN,
      _shippingOverride: item.shippingAllocated,
    }))
  );

  const effectiveRate = currency === 'GHS' ? 1 : (Number(exchangeRate) || 0);
  const computed = calcItems(rows, effectiveRate, Number(shippingCostGHS));
  const totalForeign = rows.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.unitCost) || 0), 0);
  const totalGHS = computed.reduce((s, r) => s + r.lineTotalGHS, 0);
  const grandTotal = totalGHS + Number(shippingCostGHS);
  const updateRow = makeUpdateRow(setRows);
  const fmt = (n) => (Number(n) || 0).toFixed(2);

  const handleSave = () => {
    if (!supplierId) return toast.error('Select a supplier');
    if (rows.some((r) => !r.productId)) return toast.error('Select a product for each row');
    onSave({
      supplierId, invoiceNumber, purchaseDate, currency,
      exchangeRate: currency === 'GHS' ? 1 : Number(exchangeRate),
      shippingCostGHS: Number(shippingCostGHS),
      totalForeign, totalGHS, fxGainLoss: 0, notes,
      items: computed.map((r) => ({
        productId: r.productId,
        quantity: Number(r.quantity),
        unitCost: Number(r.unitCost),
        unitCostGHS: r.unitCostGHS,
        shippingAllocated: r.shippingAllocated,
        trueCostPerUnit: r.trueCostPerUnit,
        profitMargin: Number(r.profitMargin),
        outletPrice: r.outletPrice,
      })),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-bg-primary rounded-xl shadow-xl w-full max-w-5xl m-4 my-8 space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-bold text-xl text-text-primary">Edit Shipment</h2>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary transition-colors"><IconX size={20} /></button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="label">Supplier</label>
            <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">Select supplier</option>
              {(suppliers || []).map((sup) => <option key={sup.id} value={sup.id}>{safe(sup.name)} ({safe(sup.country)})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Invoice #</label>
            <input className="input" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="INV-001" />
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Currency</label>
            <select className="input" value={currency} onChange={(e) => { setCurrency(e.target.value); setExchangeRate(''); }}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {currency !== 'GHS' && (
            <div>
              <label className="label">{currency} → GHS Rate</label>
              <input type="number" step="0.01" className="input" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} />
            </div>
          )}
          <div>
            <label className="label">Shipping Cost (GHS)</label>
            <input type="number" step="0.01" min={0} className="input" value={shippingCostGHS} onChange={(e) => setShippingCostGHS(Math.max(0, +e.target.value))} />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="label">Notes</label>
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <ItemsTable
          rows={rows} computed={computed} currency={currency}
          onUpdate={updateRow}
          onAdd={() => setRows((prev) => [...prev, emptyItem()])}
          onRemove={(i) => setRows((prev) => prev.filter((_, idx) => idx !== i))}
          productList={products || []}
          allProductList={products || []}
          shippingTotal={shippingCostGHS}
          allRows={rows}
        />

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="text-sm text-text-secondary">
            Grand Total: <span className="font-bold text-text-primary">{formatCurrency(grandTotal)}</span>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={isSaving} className="btn-primary">
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PurchasesPage() {
  const qc = useQueryClient();
  const [showHistory, setShowHistory] = useState(true);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [currency, setCurrency] = useState('GHS');
  const [exchangeRate, setExchangeRate] = useState('');
  const [shippingCostGHS, setShippingCostGHS] = useState(0);
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState([emptyItem()]);

  const [productSearch, setProductSearch] = useState('');
  const [productCategory, setProductCategory] = useState('All');

  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: () => api.get('/suppliers') });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => api.get('/products') });
  const { data: history = [] } = useQuery({ queryKey: ['purchases'], queryFn: () => api.get('/purchases'), enabled: showHistory });
  const { data: currentRates = {} } = useQuery({
    queryKey: ['exchange-rates-current'],
    queryFn: async () => {
      try { return await api.get('/exchange-rates/current'); } catch { return {}; }
    },
  });

  const filteredProducts = (Array.isArray(products) ? products : []).filter((p) => {
    const matchesSearch = !productSearch ||
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.brand || '').toLowerCase().includes(productSearch.toLowerCase());
    const matchesCategory = productCategory === 'All' || p.category === productCategory;
    return matchesSearch && matchesCategory;
  });

  const effectiveRate = currency === 'GHS' ? 1 : (Number(exchangeRate) || 0);
  const computed = calcItems(rows, effectiveRate, Number(shippingCostGHS));
  const totalForeign = rows.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.unitCost) || 0), 0);
  const totalGHS = computed.reduce((s, r) => s + r.lineTotalGHS, 0);
  const grandTotal = totalGHS + Number(shippingCostGHS);

  const newShippingAllocated = rows.reduce((s, r) => r._shippingOverride !== undefined ? s + r._shippingOverride : s, 0);
  const newShippingRemaining = (Number(shippingCostGHS) || 0) - newShippingAllocated;
  const newHasOverride = rows.some((r) => r._shippingOverride !== undefined);

  const updateRow = makeUpdateRow(setRows);
  const fmt = (n) => (Number(n) || 0).toFixed(2);

  const save = useMutation({
    mutationFn: (data) => editingId
      ? api.put(`/purchases/${editingId}`, data)
      : api.post('/purchases', data),
    onSuccess: () => {
      const msg = editingId ? 'Shipment updated — inventory adjusted' : 'Shipment saved — inventory updated';
      toast.success(msg);
      qc.invalidateQueries({ queryKey: ['purchases'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      setSupplierId(''); setInvoiceNumber(''); setCurrency('GHS');
      setExchangeRate(''); setShippingCostGHS(0); setNotes('');
      setRows([emptyItem()]);
      setPurchaseDate(new Date().toISOString().slice(0, 10));
      setProductSearch(''); setProductCategory('All');
      setEditingId(null);
    },
    onError: (err) => toast.error(typeof err === 'string' ? err : err?.error || 'Failed to save shipment'),
  });

  const update = useMutation({
    mutationFn: ({ id, data }) => api.put(`/purchases/${id}`, data),
    onSuccess: () => {
      toast.success('Shipment updated — inventory adjusted');
      qc.invalidateQueries({ queryKey: ['purchases'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      setEditingPurchase(null);
    },
    onError: (err) => toast.error(typeof err === 'string' ? err : err?.error || 'Failed to update shipment'),
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/purchases/${id}`),
    onSuccess: () => {
      toast.success('Shipment deleted — inventory reversed');
      qc.invalidateQueries({ queryKey: ['purchases'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      setDeletingId(null);
    },
    onError: (err) => toast.error(typeof err === 'string' ? err : err?.error || 'Failed to delete shipment'),
  });

  const handleSave = () => {
    if (!supplierId) return toast.error('Select a supplier');
    if (currency !== 'GHS' && !exchangeRate) return toast.error('Enter exchange rate');
    if (rows.some((r) => !r.productId)) return toast.error('Select a product for each row');
    if (currency !== 'GHS' && effectiveRate <= 0) return toast.error('Exchange rate must be greater than 0');

    save.mutate({
      supplierId, invoiceNumber, purchaseDate, currency,
      exchangeRate: currency === 'GHS' ? 1 : Number(exchangeRate),
      intermediaryCurrency: null, intermediaryRate: null,
      shippingCostForeign: 0, shippingCostGHS: Number(shippingCostGHS),
      totalForeign, totalGHS, fxGainLoss: 0, notes,
      ...(editingId ? {} : {}),
      items: computed.map((r) => ({
        productId: r.productId,
        quantity: Number(r.quantity),
        unitCost: Number(r.unitCost),
        unitCostGHS: r.unitCostGHS,
        shippingAllocated: r.shippingAllocated,
        trueCostPerUnit: r.trueCostPerUnit,
        profitMargin: Number(r.profitMargin),
        outletPrice: r.outletPrice,
      })),
    });
  };

  if (!Array.isArray(products) || !Array.isArray(suppliers) || !Array.isArray(history)) {
    return (
      <div className="space-y-6">
        <h1 className="font-heading font-bold text-2xl text-text-primary">Receive Stock</h1>
        <div className="card p-6 text-center">
          <p className="text-text-secondary">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-text-primary">Receive Stock</h1>
        <p className="text-text-secondary text-sm mt-1">Record a shipment, calculate true costs and update warehouse inventory</p>
      </div>

      {/* Shipment Details */}
      <div className="card space-y-4">
        <h2 className="font-heading font-semibold text-text-primary">Shipment Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="label">Supplier</label>
            <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">Select supplier</option>
              {(suppliers || []).map((sup) => <option key={sup.id} value={sup.id}>{safe(sup.name)} ({safe(sup.country)})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Invoice # (optional)</label>
            <input className="input" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="INV-001" />
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Purchase Currency</label>
            <select className="input" value={currency} onChange={(e) => { setCurrency(e.target.value); setExchangeRate(''); }}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {currency !== 'GHS' && (
            <div>
              <label className="label">{currency} → GHS Rate</label>
              <input
                type="number" step="0.01" className="input"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
                placeholder="e.g. 14.5"
              />
              {currentRates?.[currency] && (
                <p className="text-text-tertiary text-xs mt-1">
                  Saved rate: {safe(currentRates[currency])}
                  {!exchangeRate && (
                    <button className="ml-2 underline" onClick={() => setExchangeRate(String(currentRates[currency]))}>Use</button>
                  )}
                </p>
              )}
            </div>
          )}
          <div>
            <label className="label">Shipping Cost (GHS)</label>
            <input
              type="number" step="0.01" min={0} className="input"
              value={shippingCostGHS}
              onChange={(e) => setShippingCostGHS(Math.max(0, +e.target.value))}
              placeholder="0.00"
            />
            {shippingCostGHS > 0 && newHasOverride && (
              <p className={`text-xs mt-1 ${Math.abs(newShippingRemaining) < 0.01 ? 'text-success' : newShippingRemaining < 0 ? 'text-danger' : 'text-warning'}`}>
                {Math.abs(newShippingRemaining) < 0.01 ? '✓ Fully allocated' : newShippingRemaining > 0 ? `Remaining: GH₵ ${newShippingRemaining.toFixed(2)}` : `Over by GH₵ ${Math.abs(newShippingRemaining).toFixed(2)}`}
              </p>
            )}
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="label">Notes (optional)</label>
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes about this shipment" />
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="card space-y-4">
        <h2 className="font-heading font-semibold text-text-primary">Products</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            className="input sm:max-w-xs"
            placeholder="Search products by name, SKU, brand..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
          />
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setProductCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${productCategory === cat ? 'font-semibold' : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'}`}
                style={productCategory === cat ? { backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' } : {}}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <ItemsTable
          rows={rows} computed={computed} currency={currency}
          onUpdate={updateRow}
          onAdd={() => setRows((prev) => [...prev, emptyItem()])}
          onRemove={(i) => setRows((prev) => prev.filter((_, idx) => idx !== i))}
          productList={filteredProducts}
          allProductList={products || []}
          shippingTotal={shippingCostGHS}
          allRows={rows}
        />
      </div>

      {/* Summary */}
      <div className="card">
        <h2 className="font-heading font-semibold text-text-primary mb-4">Summary</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {currency !== 'GHS' && (
            <div>
              <p className="text-text-tertiary text-xs mb-1">Total Cost ({currency})</p>
              <p className="text-text-primary font-semibold">{fmt(totalForeign)}</p>
            </div>
          )}
          <div>
            <p className="text-text-tertiary text-xs mb-1">Total Cost (GHS)</p>
            <p className="text-text-primary font-semibold">{formatCurrency(totalGHS)}</p>
          </div>
          <div>
            <p className="text-text-tertiary text-xs mb-1">Shipping (GHS)</p>
            <p className="text-text-primary font-semibold">{formatCurrency(Number(shippingCostGHS))}</p>
          </div>
          <div>
            <p className="text-text-tertiary text-xs mb-1">Grand Total (GHS)</p>
            <p className="text-success font-bold text-lg">{formatCurrency(grandTotal)}</p>
          </div>
          <div>
            <p className="text-text-tertiary text-xs mb-1">Total Units</p>
            <p className="text-text-primary font-bold text-lg">{rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={save.isPending} className="btn-primary flex-1 flex items-center justify-center gap-2">
            <IconShoppingCart size={16} />
            {save.isPending ? 'Saving...' : editingId ? 'Update Shipment' : 'Save Shipment & Update Inventory'}
          </button>
          {editingId && (
            <button onClick={handleCancel} className="btn-secondary px-6">
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Shipment History */}
      <div className="card">
        <button className="flex items-center justify-between w-full" onClick={() => setShowHistory((v) => !v)}>
          <h2 className="font-heading font-semibold text-text-primary">Shipment History</h2>
          <span className="text-text-secondary text-sm">{showHistory ? '▲ Hide' : '▼ Show'}</span>
        </button>
        {showHistory && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="th">Date</th>
                  <th className="th">Supplier</th>
                  <th className="th">Invoice</th>
                  <th className="th">Currency</th>
                  <th className="th">Total (GHS)</th>
                  <th className="th">Shipping (GHS)</th>
                  <th className="th">Items</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody>
                {(history || []).map((p) => (
                  <Fragment key={p?.id}>
                    <tr className="table-row">
                      <td className="td">{safe(formatDate(p?.purchaseDate))}</td>
                      <td className="td font-medium">{safe(p?.supplier?.name)}</td>
                      <td className="td text-text-secondary">{safe(p?.invoiceNumber) || '—'}</td>
                      <td className="td">{safe(p?.currency)}</td>
                      <td className="td font-medium">{safe(formatCurrency(p?.totalGHS || 0))}</td>
                      <td className="td">{safe(formatCurrency(p?.shippingCostGHS || 0))}</td>
                      <td className="td text-text-secondary">{safe(p?.items?.length || 0)} item{p?.items?.length !== 1 ? 's' : ''}</td>
                      <td className="td">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingPurchase(p)}
                            className="text-xs px-2 py-1 rounded bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeletingId(p.id)}
                            className="text-xs px-2 py-1 rounded bg-bg-tertiary text-danger hover:bg-danger hover:text-white transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                    {deletingId === p.id && (
                      <tr>
                        <td colSpan={8} className="td bg-bg-secondary">
                          <div className="flex items-center justify-between py-1">
                            <span className="text-text-secondary text-xs">Delete this shipment? Inventory will be reversed.</span>
                            <div className="flex gap-2">
                              <button onClick={() => setDeletingId(null)} className="text-xs px-3 py-1 rounded bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
                              <button
                                onClick={() => remove.mutate(p.id)}
                                disabled={remove.isPending}
                                className="text-xs px-3 py-1 rounded bg-danger text-white hover:opacity-90 transition-opacity"
                              >
                                {remove.isPending ? 'Deleting...' : 'Confirm Delete'}
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {!history?.length && (
                  <tr><td colSpan={8} className="td text-center text-text-tertiary py-6">No shipments recorded yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingPurchase && (
        <EditModal
          purchase={editingPurchase}
          suppliers={suppliers}
          products={products}
          onClose={() => setEditingPurchase(null)}
          onSave={(data) => update.mutate({ id: editingPurchase.id, data })}
          isSaving={update.isPending}
        />
      )}
    </div>
  );
}
