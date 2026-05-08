import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { formatCurrency, formatDate } from '../../utils/format';
import { IconPlus, IconX, IconShoppingCart } from '../../components/ui/Icons';

const CURRENCIES = ['GHS', 'AED', 'USD', 'GBP', 'EUR'];
const CATEGORIES = ['All', 'PERFUME', 'GADGET', 'OTHER'];
const DEFAULT_MARGIN = 20;

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

function ItemsTable({ rows, computed, currency, onUpdate, onAdd, onRemove, productList, shippingTotal, allRows }) {
  const fmt = (n) => (Number(n) || 0).toFixed(2);
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full text-sm min-w-[1050px]">
          <thead>
            <tr className="border-b border-border">
              <th className="th">Product</th>
              <th className="th">Qty</th>
              <th className="th">Unit Cost ({currency})</th>
              <th className="th">Total Cost ({currency})</th>
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
                          {p.name}{p.brand ? ` (${p.brand})` : ''} [{p.category}]
                        </option>
                      ))}
                      {row.productId && !productList.find((p) => p.id === row.productId) && (() => {
                        const allProducts = productList;
                        const sel = allProducts.find((p) => p.id === row.productId);
                        return sel ? <option key={sel.id} value={sel.id}>{sel.name} ⚠ (outside filter)</option> : null;
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

export default function PurchasesPage() {
  const qc = useQueryClient();
  const [showHistory, setShowHistory] = useState(true);
  const [expandedPurchaseId, setExpandedPurchaseId] = useState(null);
  const [editingPurchase, setEditingPurchase] = useState(null);

  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [currency, setCurrency] = useState('GHS');
  const [exchangeRate, setExchangeRate] = useState('');
  const [shippingCostGHS, setShippingCostGHS] = useState(0);
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState([emptyItem()]);

  const [editForm, setEditForm] = useState({});
  const [editRows, setEditRows] = useState([]);

  const [productSearch, setProductSearch] = useState('');
  const [productCategory, setProductCategory] = useState('All');

  const { data: suppliers } = useQuery({ queryKey: ['suppliers'], queryFn: () => api.get('/suppliers') });
  const { data: products } = useQuery({ queryKey: ['products'], queryFn: () => api.get('/products') });
  const { data: history } = useQuery({ queryKey: ['purchases'], queryFn: () => api.get('/purchases'), enabled: showHistory });
  const { data: currentRates } = useQuery({ queryKey: ['exchange-rates-current'], queryFn: () => api.get('/exchange-rates/current') });

  const filteredProducts = (products || []).filter((p) => {
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

  const editEffectiveRate = (editForm.currency === 'GHS' || !editForm.currency) ? 1 : (Number(editForm.exchangeRate) || 0);
  const editComputed = calcItems(editRows, editEffectiveRate, Number(editForm.shippingCostGHS || 0));

  const updateRow = makeUpdateRow(setRows);
  const updateEditRow = makeUpdateRow(setEditRows);

  const fmt = (n) => (Number(n) || 0).toFixed(2);

  const save = useMutation({
    mutationFn: (data) => api.post('/purchases', data),
    onSuccess: () => {
      toast.success('Shipment saved — inventory updated');
      qc.invalidateQueries({ queryKey: ['purchases'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      setSupplierId(''); setInvoiceNumber(''); setCurrency('GHS');
      setExchangeRate(''); setShippingCostGHS(0); setNotes('');
      setRows([emptyItem()]);
      setPurchaseDate(new Date().toISOString().slice(0, 10));
      setProductSearch(''); setProductCategory('All');
    },
    onError: (err) => toast.error(err.error || 'Failed to save shipment'),
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
    onError: (err) => toast.error(err.error || 'Failed to update shipment'),
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

  const openEdit = (purchase) => {
    setEditingPurchase(purchase);
    setEditForm({
      supplierId: purchase.supplierId,
      invoiceNumber: purchase.invoiceNumber || '',
      purchaseDate: new Date(purchase.purchaseDate).toISOString().slice(0, 10),
      currency: purchase.currency,
      exchangeRate: purchase.currency !== 'GHS' ? String(purchase.exchangeRate || '') : '',
      shippingCostGHS: purchase.shippingCostGHS || 0,
      notes: purchase.notes || '',
    });
    setEditRows((purchase.items || []).map((item) => {
      const trueCost = item.trueCostPerUnit || 0;
      const savedMargin = item.profitMargin ?? DEFAULT_MARGIN;
      const margin = trueCost > 0 && item.outletPrice
        ? Math.round(((item.outletPrice / trueCost) - 1) * 10000) / 100
        : savedMargin;
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitCost: item.unitCost,
        totalCost: item.totalCost || item.quantity * item.unitCost,
        profitMargin: margin,
        _shippingOverride: item.shippingAllocated,
      };
    }));
  };

  const handleUpdate = () => {
    if (!editForm.supplierId) return toast.error('Select a supplier');
    if (editRows.some((r) => !r.productId)) return toast.error('Select a product for each row');

    const editTotalForeign = editRows.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.unitCost) || 0), 0);
    const editTotalGHS = editComputed.reduce((s, r) => s + r.lineTotalGHS, 0);

    update.mutate({
      id: editingPurchase.id,
      data: {
        supplierId: editForm.supplierId,
        invoiceNumber: editForm.invoiceNumber,
        purchaseDate: editForm.purchaseDate,
        currency: editForm.currency,
        exchangeRate: editForm.currency === 'GHS' ? 1 : Number(editForm.exchangeRate),
        shippingCostGHS: Number(editForm.shippingCostGHS),
        totalForeign: editTotalForeign,
        totalGHS: editTotalGHS,
        fxGainLoss: 0,
        notes: editForm.notes,
        items: editComputed.map((r) => ({
          productId: r.productId,
          quantity: Number(r.quantity),
          unitCost: Number(r.unitCost),
          unitCostGHS: r.unitCostGHS,
          shippingAllocated: r.shippingAllocated,
          trueCostPerUnit: r.trueCostPerUnit,
          profitMargin: Number(r.profitMargin),
          outletPrice: r.outletPrice,
        })),
      },
    });
  };

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
              {(suppliers || []).map((s) => <option key={s.id} value={s.id}>{s.name} ({s.country})</option>)}
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
                  Saved rate: {currentRates[currency]}
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
            {shippingCostGHS > 0 && (() => {
              const allocated = rows.reduce((s, r) => r._shippingOverride !== undefined ? s + r._shippingOverride : s, 0);
              const remaining = (Number(shippingCostGHS) || 0) - allocated;
              const hasAnyOverride = rows.some((r) => r._shippingOverride !== undefined);
              if (!hasAnyOverride) return null;
              return (
                <p className={`text-xs mt-1 ${Math.abs(remaining) < 0.01 ? 'text-success' : remaining < 0 ? 'text-danger' : 'text-warning'}`}>
                  {Math.abs(remaining) < 0.01 ? '✓ Fully allocated' : remaining > 0 ? `Remaining: GH₵ ${remaining.toFixed(2)}` : `Over by GH₵ ${Math.abs(remaining).toFixed(2)}`}
                </p>
              );
            })()}
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
        <button onClick={handleSave} disabled={save.isPending} className="btn-primary w-full flex items-center justify-center gap-2">
          <IconShoppingCart size={16} />
          {save.isPending ? 'Saving...' : 'Save Shipment & Update Inventory'}
        </button>
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
                  <>
                    <tr
                      key={p.id}
                      className="table-row cursor-pointer"
                      onClick={() => setExpandedPurchaseId(expandedPurchaseId === p.id ? null : p.id)}
                    >
                      <td className="td">{formatDate(p.purchaseDate)}</td>
                      <td className="td font-medium">{p.supplier?.name}</td>
                      <td className="td text-text-secondary">{p.invoiceNumber || '—'}</td>
                      <td className="td">{p.currency}</td>
                      <td className="td font-medium">{formatCurrency(p.totalGHS)}</td>
                      <td className="td">{formatCurrency(p.shippingCostGHS || 0)}</td>
                      <td className="td text-text-secondary">
                        {p.items?.length} product{p.items?.length !== 1 ? 's' : ''}
                        <span className="ml-1 text-text-tertiary">{expandedPurchaseId === p.id ? '▲' : '▼'}</span>
                      </td>
                      <td className="td">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEdit(p); }}
                          className="text-xs px-2 py-1 rounded bg-bg-tertiary hover:bg-bg-secondary text-text-secondary hover:text-text-primary transition-colors"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                    {expandedPurchaseId === p.id && (
                      <tr key={`${p.id}-detail`}>
                        <td colSpan={8} className="px-4 pb-4 bg-bg-tertiary">
                          <table className="w-full text-xs mt-2">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="th">Product</th>
                                <th className="th">Qty</th>
                                <th className="th">Unit Cost (GHS)</th>
                                <th className="th">Shipping Alloc.</th>
                                <th className="th">True Cost/Unit</th>
                                <th className="th">Margin</th>
                                <th className="th">Outlet Price</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(p.items || []).map((item) => (
                                <tr key={item.id} className="border-b border-border">
                                  <td className="td font-medium">{item.product?.name}</td>
                                  <td className="td">{item.quantity}</td>
                                  <td className="td">{formatCurrency(item.unitCostGHS || item.unitCost)}</td>
                                  <td className="td">{formatCurrency(item.shippingAllocated || 0)}</td>
                                  <td className="td">{formatCurrency(item.trueCostPerUnit || 0)}</td>
                                  <td className="td">{item.profitMargin ?? '—'}%</td>
                                  <td className="td font-semibold text-success">{formatCurrency(item.outletPrice || 0)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
                {!history?.length && (
                  <tr><td colSpan={8} className="td text-center text-text-tertiary py-6">No shipments recorded yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Shipment Modal */}
      {editingPurchase && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-8 px-4">
          <div className="bg-bg-primary rounded-xl shadow-2xl w-full max-w-5xl space-y-6 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading font-bold text-xl text-text-primary">Edit Shipment</h2>
                <p className="text-text-secondary text-sm mt-0.5">Adjusts inventory automatically based on quantity changes</p>
              </div>
              <button onClick={() => setEditingPurchase(null)} className="text-text-tertiary hover:text-text-primary p-1">
                <IconX size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="label">Supplier</label>
                <select className="input" value={editForm.supplierId} onChange={(e) => setEditForm({ ...editForm, supplierId: e.target.value })}>
                  <option value="">Select supplier</option>
                  {(suppliers || []).map((s) => <option key={s.id} value={s.id}>{s.name} ({s.country})</option>)}
                </select>
              </div>
              <div>
                <label className="label">Invoice #</label>
                <input className="input" value={editForm.invoiceNumber} onChange={(e) => setEditForm({ ...editForm, invoiceNumber: e.target.value })} placeholder="INV-001" />
              </div>
              <div>
                <label className="label">Date</label>
                <input type="date" className="input" value={editForm.purchaseDate} onChange={(e) => setEditForm({ ...editForm, purchaseDate: e.target.value })} />
              </div>
              <div>
                <label className="label">Currency</label>
                <select className="input" value={editForm.currency} onChange={(e) => setEditForm({ ...editForm, currency: e.target.value, exchangeRate: '' })}>
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {editForm.currency !== 'GHS' && (
                <div>
                  <label className="label">{editForm.currency} → GHS Rate</label>
                  <input
                    type="number" step="0.01" className="input"
                    value={editForm.exchangeRate}
                    onChange={(e) => setEditForm({ ...editForm, exchangeRate: e.target.value })}
                    placeholder="e.g. 14.5"
                  />
                </div>
              )}
              <div>
                <label className="label">Shipping Cost (GHS)</label>
                <input
                  type="number" step="0.01" min={0} className="input"
                  value={editForm.shippingCostGHS}
                  onChange={(e) => setEditForm({ ...editForm, shippingCostGHS: Math.max(0, +e.target.value) })}
                />
                {editForm.shippingCostGHS > 0 && (() => {
                  const allocated = editRows.reduce((s, r) => r._shippingOverride !== undefined ? s + r._shippingOverride : s, 0);
                  const remaining = (Number(editForm.shippingCostGHS) || 0) - allocated;
                  const hasAnyOverride = editRows.some((r) => r._shippingOverride !== undefined);
                  if (!hasAnyOverride) return null;
                  return (
                    <p className={`text-xs mt-1 ${Math.abs(remaining) < 0.01 ? 'text-success' : remaining < 0 ? 'text-danger' : 'text-warning'}`}>
                      {Math.abs(remaining) < 0.01 ? '✓ Fully allocated' : remaining > 0 ? `Remaining: GH₵ ${remaining.toFixed(2)}` : `Over by GH₵ ${Math.abs(remaining).toFixed(2)}`}
                    </p>
                  );
                })()}
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="label">Notes</label>
                <input className="input" value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Any notes about this shipment" />
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-text-primary mb-3">Products</h3>
              <ItemsTable
                rows={editRows} computed={editComputed} currency={editForm.currency || 'GHS'}
                onUpdate={updateEditRow}
                onAdd={() => setEditRows((prev) => [...prev, emptyItem()])}
                onRemove={(i) => setEditRows((prev) => prev.filter((_, idx) => idx !== i))}
                productList={products || []}
                shippingTotal={editForm.shippingCostGHS}
                allRows={editRows}
              />
            </div>

            <div className="flex gap-3 pt-2 border-t border-border">
              <button className="btn-secondary flex-1" onClick={() => setEditingPurchase(null)}>Cancel</button>
              <button
                className="btn-primary flex-1 flex items-center justify-center gap-2"
                onClick={handleUpdate}
                disabled={update.isPending}
              >
                <IconShoppingCart size={16} />
                {update.isPending ? 'Updating...' : 'Update Shipment & Adjust Inventory'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
