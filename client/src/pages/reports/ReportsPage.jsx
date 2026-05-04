import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import { formatCurrency, formatDate } from '../../utils/format';
import Badge from '../../components/ui/Badge';

const tabs = ['Sales', 'Inventory', 'Profit & Loss', 'Expenses', 'Product Velocity'];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('Sales');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const queryParams = new URLSearchParams();
  if (startDate) queryParams.set('startDate', startDate);
  if (endDate) queryParams.set('endDate', endDate);
  const qs = queryParams.toString() ? `?${queryParams}` : '';

  const { data: salesReport } = useQuery({
    queryKey: ['report-sales', startDate, endDate],
    queryFn: () => api.get(`/reports/sales${qs}`),
    enabled: activeTab === 'Sales',
  });

  const { data: inventoryReport } = useQuery({
    queryKey: ['report-inventory'],
    queryFn: () => api.get('/reports/inventory'),
    enabled: activeTab === 'Inventory',
  });

  const { data: plReport } = useQuery({
    queryKey: ['report-pl', startDate, endDate],
    queryFn: () => api.get(`/reports/profit-loss${qs}`),
    enabled: activeTab === 'Profit & Loss',
  });

  const { data: expensesReport } = useQuery({
    queryKey: ['report-expenses', startDate, endDate],
    queryFn: () => api.get(`/reports/expenses${qs}`),
    enabled: activeTab === 'Expenses',
  });

  const { data: velocityReport } = useQuery({
    queryKey: ['report-velocity'],
    queryFn: () => api.get('/reports/product-velocity'),
    enabled: activeTab === 'Product Velocity',
  });

  const [velocitySearch, setVelocitySearch] = useState('');
  const [velocityFilter, setVelocityFilter] = useState('ALL');
  const [velocitySort, setVelocitySort] = useState('weeklyVelocity');
  const [velocitySortDir, setVelocitySortDir] = useState('desc');

  const filteredVelocity = (velocityReport || [])
    .filter((r) =>
      (velocityFilter === 'ALL' || r.classification === velocityFilter) &&
      (!velocitySearch ||
        r.name.toLowerCase().includes(velocitySearch.toLowerCase()) ||
        r.sku.toLowerCase().includes(velocitySearch.toLowerCase()))
    )
    .sort((a, b) => {
      const va = a[velocitySort] ?? -Infinity;
      const vb = b[velocitySort] ?? -Infinity;
      return velocitySortDir === 'asc' ? va - vb : vb - va;
    });

  const handleVelocitySort = (field) => {
    if (velocitySort === field) setVelocitySortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setVelocitySort(field); setVelocitySortDir('desc'); }
  };

  const sortIndicator = (field) => velocitySort === field ? (velocitySortDir === 'asc' ? ' ▲' : ' ▼') : '';

  const exportType = { 'Sales': 'sales', 'Inventory': 'inventory', 'Profit & Loss': 'pl', 'Expenses': 'expenses', 'Product Velocity': 'velocity' };
  const handleExport = () => {
    const type = exportType[activeTab];
    if (type) window.open(`/api/reports/export/${type}${qs}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading font-bold text-2xl text-text-primary">Reports</h1>
          <p className="text-text-secondary text-sm mt-1">Business analytics & exports</p>
        </div>
        <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
          ⬇ Export Excel
        </button>
      </div>

      {/* Date filters */}
      <div className="flex gap-3 flex-wrap items-end">
        <div>
          <label className="label">From</label>
          <input type="date" className="input w-40" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input w-40" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        {(startDate || endDate) && (
          <button onClick={() => { setStartDate(''); setEndDate(''); }} className="btn-secondary text-sm self-end">Clear</button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === t ? 'border-[var(--accent)] text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Sales report */}
      {activeTab === 'Sales' && (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="th">Date</th>
                <th className="th">Customer</th>
                <th className="th">Sold By</th>
                <th className="th">Total</th>
                <th className="th">Paid</th>
                <th className="th">Balance</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody>
              {(salesReport || []).map((s) => (
                <tr key={s.id} className="table-row">
                  <td className="td text-text-secondary">{formatDate(s.saleDate)}</td>
                  <td className="td">{s.customer?.name || 'Walk-in'}</td>
                  <td className="td text-text-secondary">{s.soldBy?.name}</td>
                  <td className="td font-medium">{formatCurrency(s.totalAmount)}</td>
                  <td className="td text-success">{formatCurrency(s.amountPaid)}</td>
                  <td className="td text-danger">{formatCurrency(s.balance)}</td>
                  <td className="td"><Badge value={s.status} /></td>
                </tr>
              ))}
              {!salesReport?.length && (
                <tr><td colSpan={7} className="td text-center text-text-tertiary py-8">No sales in this period</td></tr>
              )}
            </tbody>
          </table>
          {salesReport?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border flex justify-between text-sm">
              <span className="text-text-secondary">Total Revenue Collected</span>
              <span className="font-medium text-success">
                {formatCurrency(salesReport.reduce((s, sale) => s + sale.amountPaid, 0))}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Inventory report */}
      {activeTab === 'Inventory' && (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="th">Product</th>
                <th className="th">SKU</th>
                <th className="th">Category</th>
                <th className="th">Warehouse</th>
                <th className="th">Total</th>
                <th className="th">Stock Value</th>
              </tr>
            </thead>
            <tbody>
              {(inventoryReport || []).map((r) => (
                <tr key={r.product.id} className="table-row">
                  <td className="td font-medium">{r.product.name}</td>
                  <td className="td text-text-secondary">{r.product.sku}</td>
                  <td className="td"><Badge value={r.product.category} /></td>
                  <td className="td">{r.warehouse}</td>
                  <td className="td font-medium">{r.total}</td>
                  <td className="td">{formatCurrency(r.total * r.product.costPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* P&L report */}
      {activeTab === 'Profit & Loss' && plReport && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card">
              <p className="text-text-secondary text-sm">Revenue</p>
              <p className="font-heading font-bold text-xl text-success mt-1">{formatCurrency(plReport.totalRevenue)}</p>
            </div>
            <div className="card">
              <p className="text-text-secondary text-sm">Cost of Goods</p>
              <p className="font-heading font-bold text-xl text-warning mt-1">{formatCurrency(plReport.cogs)}</p>
            </div>
            <div className="card">
              <p className="text-text-secondary text-sm">Gross Profit</p>
              <p className={`font-heading font-bold text-xl mt-1 ${plReport.grossProfit >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(plReport.grossProfit)}</p>
            </div>
            <div className="card">
              <p className="text-text-secondary text-sm">Net Profit</p>
              <p className={`font-heading font-bold text-xl mt-1 ${plReport.netProfit >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(plReport.netProfit)}</p>
            </div>
          </div>
          <div className="card">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                <tr><td className="py-3 text-text-secondary">Total Revenue</td><td className="py-3 text-right text-success font-medium">{formatCurrency(plReport.totalRevenue)}</td></tr>
                <tr><td className="py-3 text-text-secondary pl-4">— Cost of Goods Sold</td><td className="py-3 text-right text-warning">({formatCurrency(plReport.cogs)})</td></tr>
                <tr className="font-semibold"><td className="py-3">Gross Profit</td><td className="py-3 text-right">{formatCurrency(plReport.grossProfit)}</td></tr>
                <tr><td className="py-3 text-text-secondary pl-4">— Expenses</td><td className="py-3 text-right text-danger">({formatCurrency(plReport.totalExpenses)})</td></tr>
                <tr><td className="py-3 text-text-secondary pl-4">— Owner Drawings</td><td className="py-3 text-right text-warning">({formatCurrency(plReport.totalDrawings)})</td></tr>
                <tr><td className="py-3 text-text-secondary pl-4">FX Gain / Loss</td><td className={`py-3 text-right ${plReport.fxGainLoss >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(plReport.fxGainLoss)}</td></tr>
                <tr className="font-bold border-t-2 border-border"><td className="py-3 text-text-primary">Net Profit</td><td className={`py-3 text-right text-lg ${plReport.netProfit >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(plReport.netProfit)}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expenses report */}
      {activeTab === 'Expenses' && expensesReport && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-heading font-semibold text-text-primary mb-4">By Category</h3>
            <div className="space-y-2">
              {Object.entries(expensesReport.byCategory || {}).map(([cat, amt]) => (
                <div key={cat} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-text-secondary">{cat}</span>
                  <span className="text-danger font-medium">{formatCurrency(amt)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-semibold border-t border-border pt-3 mt-2">
              <span>Total</span>
              <span className="text-danger">{formatCurrency(Object.values(expensesReport.byCategory || {}).reduce((s, a) => s + a, 0))}</span>
            </div>
          </div>
        </div>
      )}

      {/* Product Velocity report */}
      {activeTab === 'Product Velocity' && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Products Tracked', value: (velocityReport || []).filter((r) => r.totalReceived > 0).length, color: 'text-text-primary' },
              { label: 'Fast Movers', value: (velocityReport || []).filter((r) => r.classification === 'FAST').length, color: 'text-success' },
              { label: 'Slow Movers', value: (velocityReport || []).filter((r) => r.classification === 'SLOW').length, color: 'text-warning' },
              { label: 'Stagnant / Unsold', value: (velocityReport || []).filter((r) => r.classification === 'STAGNANT').length, color: 'text-danger' },
            ].map((card) => (
              <div key={card.label} className="card">
                <p className="text-text-secondary text-sm">{card.label}</p>
                <p className={`font-heading font-bold text-2xl mt-1 ${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* Search + filter */}
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-end">
            <input
              className="input sm:max-w-xs"
              placeholder="Search by name or SKU..."
              value={velocitySearch}
              onChange={(e) => setVelocitySearch(e.target.value)}
            />
            <div className="flex gap-2 flex-wrap">
              {['ALL', 'FAST', 'SLOW', 'STAGNANT'].map((cls) => (
                <button
                  key={cls}
                  onClick={() => setVelocityFilter(cls)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    velocityFilter === cls ? 'font-semibold' : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
                  }`}
                  style={velocityFilter === cls ? { backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' } : {}}
                >
                  {cls}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop table */}
          <div className="card hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="th">Product</th>
                  <th className="th">Category</th>
                  <th className="th cursor-pointer hover:text-text-primary" onClick={() => handleVelocitySort('totalReceived')}>Received{sortIndicator('totalReceived')}</th>
                  <th className="th cursor-pointer hover:text-text-primary" onClick={() => handleVelocitySort('totalSold')}>Sold{sortIndicator('totalSold')}</th>
                  <th className="th cursor-pointer hover:text-text-primary" onClick={() => handleVelocitySort('currentStock')}>Stock{sortIndicator('currentStock')}</th>
                  <th className="th cursor-pointer hover:text-text-primary" onClick={() => handleVelocitySort('weeklyVelocity')}>Weekly Vel.{sortIndicator('weeklyVelocity')}</th>
                  <th className="th cursor-pointer hover:text-text-primary" onClick={() => handleVelocitySort('daysSinceLastSale')}>Days Since Sale{sortIndicator('daysSinceLastSale')}</th>
                  <th className="th cursor-pointer hover:text-text-primary" onClick={() => handleVelocitySort('stockWeeksRemaining')}>Weeks Left{sortIndicator('stockWeeksRemaining')}</th>
                  <th className="th">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredVelocity.map((r) => (
                  <tr key={r.productId} className="table-row">
                    <td className="td">
                      <p className="font-medium text-text-primary">{r.name}</p>
                      <p className="text-text-tertiary text-xs">{r.sku}</p>
                    </td>
                    <td className="td"><Badge value={r.category} /></td>
                    <td className="td text-text-secondary">{r.totalReceived}</td>
                    <td className="td text-text-secondary">{r.totalSold}</td>
                    <td className="td font-medium">{r.currentStock}</td>
                    <td className="td font-medium">{r.weeklyVelocity > 0 ? `${r.weeklyVelocity}/wk` : '—'}</td>
                    <td className="td text-text-secondary">{r.daysSinceLastSale !== null ? `${r.daysSinceLastSale}d ago` : 'Never sold'}</td>
                    <td className="td text-text-secondary">{r.stockWeeksRemaining !== null ? `${r.stockWeeksRemaining} wks` : '—'}</td>
                    <td className="td"><Badge value={r.classification} /></td>
                  </tr>
                ))}
                {!filteredVelocity.length && (
                  <tr><td colSpan={9} className="td text-center text-text-tertiary py-8">No products found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {filteredVelocity.map((r) => (
              <div key={r.productId} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-text-primary">{r.name}</p>
                    <p className="text-text-tertiary text-xs mt-0.5">{r.sku}</p>
                  </div>
                  <Badge value={r.classification} />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border text-sm">
                  <div><p className="text-xs text-text-tertiary">Stock</p><p className="font-medium">{r.currentStock}</p></div>
                  <div><p className="text-xs text-text-tertiary">Sold</p><p>{r.totalSold}</p></div>
                  <div><p className="text-xs text-text-tertiary">Velocity</p><p>{r.weeklyVelocity > 0 ? `${r.weeklyVelocity}/wk` : '—'}</p></div>
                </div>
                <p className="text-text-tertiary text-xs mt-2">
                  {r.daysSinceLastSale !== null ? `Last sold ${r.daysSinceLastSale}d ago` : 'Never sold'}
                  {r.stockWeeksRemaining !== null ? ` · ${r.stockWeeksRemaining} wks stock left` : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
