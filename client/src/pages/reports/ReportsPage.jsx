import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import { formatCurrency, formatDate } from '../../utils/format';
import Badge from '../../components/ui/Badge';

const tabs = ['Sales', 'Inventory', 'Profit & Loss', 'Expenses'];

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
    queryFn: () => api.get(`/reports/expenses`),
    enabled: activeTab === 'Expenses',
  });

  const exportType = { 'Sales': 'sales', 'Inventory': 'inventory', 'Profit & Loss': 'pl', 'Expenses': 'expenses' };
  const handleExport = () => {
    const type = exportType[activeTab];
    window.open(`/api/reports/export/${type}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading font-bold text-2xl text-white">Reports</h1>
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
              activeTab === t ? 'border-white text-white' : 'border-transparent text-text-secondary hover:text-white'
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
                <tr className="font-bold border-t-2 border-border"><td className="py-3 text-white">Net Profit</td><td className={`py-3 text-right text-lg ${plReport.netProfit >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(plReport.netProfit)}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expenses report */}
      {activeTab === 'Expenses' && expensesReport && (
        <div className="space-y-4">
          {/* By category */}
          <div className="card">
            <h3 className="font-heading font-semibold text-white mb-4">By Category</h3>
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
    </div>
  );
}
