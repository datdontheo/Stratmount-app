import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import Badge from '../../components/ui/Badge';
import { formatCurrency, formatDate } from '../../utils/format';
import { SkeletonList } from '../../components/ui/Skeleton';

export default function OutletDashboard() {
  const { data: inventory, isLoading: invLoading } = useQuery({
    queryKey: ['my-inventory'],
    queryFn: () => api.get('/inventory/my'),
  });

  const { data: sales, isLoading: salesLoading } = useQuery({
    queryKey: ['my-sales'],
    queryFn: () => api.get('/sales'),
  });

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['my-payments'],
    queryFn: () => api.get('/payments'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-white">My Dashboard</h1>
          <p className="text-text-secondary text-sm mt-1">Your outlet overview</p>
        </div>
        <Link to="/payments" className="btn-primary text-sm">+ Record Payment</Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Stock */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading font-semibold text-white">My Stock</h2>
            <Link to="/inventory" className="text-text-secondary text-xs hover:text-white">View →</Link>
          </div>
          {invLoading ? <SkeletonList rows={3} /> : (
            <div className="space-y-2">
              {(inventory || []).map((item) => (
                <div key={item.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm text-white">{item.product.name}</p>
                    <p className="text-xs text-text-tertiary">{item.product.sku}</p>
                  </div>
                  <span className={`text-sm font-medium ${item.quantity <= 3 ? 'text-danger' : 'text-white'}`}>
                    {item.quantity} {item.product.unit}s
                  </span>
                </div>
              ))}
              {!inventory?.length && <p className="text-text-tertiary text-sm">No stock assigned</p>}
            </div>
          )}
        </div>

        {/* My Sales */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading font-semibold text-white">Recent Sales</h2>
            <Link to="/sales" className="text-text-secondary text-xs hover:text-white">View →</Link>
          </div>
          {salesLoading ? <SkeletonList rows={3} /> : (
            <div className="space-y-2">
              {(sales || []).slice(0, 5).map((sale) => (
                <div key={sale.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm text-white">{sale.customer?.name || 'Walk-in'}</p>
                    <p className="text-xs text-text-tertiary">{formatDate(sale.saleDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">{formatCurrency(sale.totalAmount)}</p>
                    <Badge value={sale.status} />
                  </div>
                </div>
              ))}
              {!sales?.length && <p className="text-text-tertiary text-sm">No sales yet</p>}
            </div>
          )}
        </div>

        {/* My Payments */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading font-semibold text-white">My Payments</h2>
            <Link to="/payments" className="text-text-secondary text-xs hover:text-white">View →</Link>
          </div>
          {paymentsLoading ? <SkeletonList rows={3} /> : (
            <div className="space-y-2">
              {(payments || []).slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm text-white">{formatCurrency(p.amount)}</p>
                    <p className="text-xs text-text-tertiary">{p.method?.replace('_', ' ')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text-secondary">{formatDate(p.paymentDate)}</p>
                    {p.proofImage && <span className="text-xs text-success">✓ Proof</span>}
                  </div>
                </div>
              ))}
              {!payments?.length && <p className="text-text-tertiary text-sm">No payments recorded</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
