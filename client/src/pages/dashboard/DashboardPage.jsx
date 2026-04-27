import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import useAuthStore from '../../store/authStore';
import { StatCard } from '../../components/ui/Card';
import { SkeletonCard } from '../../components/ui/Skeleton';
import Badge from '../../components/ui/Badge';
import { formatCurrency, formatDate } from '../../utils/format';
import OutletDashboard from './OutletDashboard';

export default function DashboardPage() {
  const { user } = useAuthStore();

  if (user?.role === 'OUTLET') return <OutletDashboard />;

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.get('/reports/summary'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-white">Dashboard</h1>
        <p className="text-text-secondary text-sm mt-1">Overview of your business</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard label="Total Revenue" value={formatCurrency(data?.totalRevenue)} color="success" />
            <StatCard label="Stock Value" value={formatCurrency(data?.stockValue)} color="white" />
            <StatCard label="Outstanding" value={formatCurrency(data?.outstandingBalance)} color="warning" />
            <StatCard label="Total Expenses" value={formatCurrency(data?.totalExpenses)} color="danger" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Sales */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-semibold text-white">Recent Sales</h2>
              <Link to="/sales" className="text-text-secondary text-sm hover:text-white">View all →</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="th">Customer</th>
                    <th className="th">Date</th>
                    <th className="th">Amount</th>
                    <th className="th">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.recentSales || []).map((sale) => (
                    <tr key={sale.id} className="table-row">
                      <td className="td">{sale.customer?.name || 'Walk-in'}</td>
                      <td className="td text-text-secondary">{formatDate(sale.saleDate)}</td>
                      <td className="td font-medium">{formatCurrency(sale.totalAmount)}</td>
                      <td className="td"><Badge value={sale.status} /></td>
                    </tr>
                  ))}
                  {!isLoading && !data?.recentSales?.length && (
                    <tr><td colSpan={4} className="td text-center text-text-tertiary py-6">No sales yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Low Stock Alerts + Quick Actions */}
        <div className="space-y-4">
          <div className="card">
            <h2 className="font-heading font-semibold text-white mb-3">Low Stock Alerts</h2>
            {data?.lowStock?.length ? (
              <div className="space-y-2">
                {data.lowStock.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                    <p className="text-sm text-text-primary truncate">{item.product.name}</p>
                    <span className="text-danger text-sm font-medium ml-2">{item.quantity}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-text-tertiary text-sm">No low stock items</p>
            )}
          </div>

          <div className="card">
            <h2 className="font-heading font-semibold text-white mb-3">Quick Actions</h2>
            <div className="space-y-2">
              <Link to="/sales" className="flex items-center gap-2 w-full btn-secondary text-sm">
                💳 New Sale
              </Link>
              <Link to="/inventory" className="flex items-center gap-2 w-full btn-secondary text-sm">
                📦 Assign Stock
              </Link>
              <Link to="/expenses" className="flex items-center gap-2 w-full btn-secondary text-sm">
                📉 Record Expense
              </Link>
              <Link to="/reports" className="flex items-center gap-2 w-full btn-secondary text-sm">
                📊 View Reports
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
