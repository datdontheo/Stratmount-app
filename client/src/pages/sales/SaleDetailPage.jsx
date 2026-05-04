import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import Badge from '../../components/ui/Badge';
import { formatCurrency, formatDate } from '../../utils/format';
import { IconPhone, IconPrinter, IconArrowLeft, IconDownload } from '../../components/ui/Icons';

export default function SaleDetailPage() {
  const { id } = useParams();
  const [downloading, setDownloading] = useState(false);

  const { data: sale, isLoading } = useQuery({
    queryKey: ['sale', id],
    queryFn: () => api.get(`/sales/${id}/receipt`),
  });

  const shareWhatsApp = () => {
    const settings = JSON.parse(localStorage.getItem('sm_settings') || '{}');
    const companyDisplay = sale?.soldBy?.companyName || settings.businessName || 'Strat Mount';
    const text = `Receipt from ${companyDisplay}\n\nSale: ${id.slice(-8).toUpperCase()}\nCustomer: ${sale?.customer?.name || 'Walk-in'}\nDate: ${formatDate(sale?.saleDate)}\nTotal: ${formatCurrency(sale?.totalAmount)}\nPaid: ${formatCurrency(sale?.amountPaid)}\nBalance: ${formatCurrency(sale?.balance)}\n\nItems:\n${sale?.items?.map((i) => `- ${i.product.name} x${i.quantity} @ ${formatCurrency(i.unitPrice)} = ${formatCurrency(i.total)}`).join('\n')}`;
    const phone = settings.whatsapp ? settings.whatsapp.replace(/\D/g, '') : '';
    if (!phone) {
      toast.error('Set your WhatsApp number in Settings first');
      return;
    }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const token = localStorage.getItem('sm_token');
      const settings = JSON.parse(localStorage.getItem('sm_settings') || '{}');
      const appLogo = settings.appLogo ? `&appLogo=${encodeURIComponent(settings.appLogo)}` : '';
      const res = await fetch(`/api/sales/${id}/pdf?${appLogo}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        toast.error('Failed to download PDF');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${id.slice(-8).toUpperCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) return <div className="text-center py-12 text-text-secondary">Loading receipt...</div>;
  if (!sale) return <div className="text-center py-12 text-text-secondary">Sale not found</div>;

  const companyName = sale.soldBy?.companyName || 'STRAT MOUNT';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/sales" className="text-text-secondary hover:text-text-primary text-sm flex items-center gap-1"><IconArrowLeft size={14} /> Back to Sales</Link>
      </div>

      {/* Receipt card */}
      <div className="card" id="receipt">
        {/* Header */}
        <div className="text-center pb-6 border-b border-border">
          {sale.soldBy?.companyLogo ? (
            <img src={sale.soldBy.companyLogo} alt="Company logo" className="h-12 mx-auto mb-2 rounded object-contain" />
          ) : (
            <div className="inline-flex items-center justify-center w-10 h-10 bg-white rounded-lg mb-3">
              <span className="text-black font-heading font-bold text-sm">{companyName.slice(0, 2).toUpperCase()}</span>
            </div>
          )}
          <h1 className="font-heading font-bold text-xl text-text-primary">{companyName.toUpperCase()}</h1>
          <p className="text-text-secondary text-xs mt-1">Sales Receipt</p>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 gap-4 py-5 border-b border-border">
          <div>
            <p className="text-text-tertiary text-xs">Receipt #</p>
            <p className="font-heading font-semibold text-text-primary">{id.slice(-8).toUpperCase()}</p>
          </div>
          <div className="text-right">
            <p className="text-text-tertiary text-xs">Date</p>
            <p className="text-text-primary">{formatDate(sale.saleDate)}</p>
          </div>
          <div>
            <p className="text-text-tertiary text-xs">Customer</p>
            <p className="text-text-primary">{sale.customer?.name || 'Walk-in'}</p>
            {sale.customer?.phone && <p className="text-text-secondary text-xs">{sale.customer.phone}</p>}
          </div>
          <div className="text-right">
            <p className="text-text-tertiary text-xs">Sold By</p>
            <p className="text-text-primary">{sale.soldBy?.name}</p>
          </div>
        </div>

        {/* Items */}
        <div className="py-5 border-b border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-text-tertiary text-xs">
                <th className="text-left pb-2">Item</th>
                <th className="text-right pb-2">Qty</th>
                <th className="text-right pb-2">Price</th>
                <th className="text-right pb-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.items?.map((item) => (
                <tr key={item.id} className="border-t border-border/50">
                  <td className="py-2 text-text-primary">{item.product.name}</td>
                  <td className="py-2 text-right text-text-secondary">{item.quantity}</td>
                  <td className="py-2 text-right text-text-secondary">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-2 text-right font-medium text-text-primary">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="py-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-secondary">Subtotal</span>
            <span>{formatCurrency(sale.totalAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Amount Paid</span>
            <span className="text-success">{formatCurrency(sale.amountPaid)}</span>
          </div>
          <div className="flex justify-between font-semibold border-t border-border pt-2">
            <span>Balance Due</span>
            <span className={sale.balance > 0 ? 'text-danger' : 'text-success'}>{formatCurrency(sale.balance)}</span>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <Badge value={sale.status} />
          {sale.notes && <p className="text-text-tertiary text-xs">{sale.notes}</p>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <button onClick={shareWhatsApp} className="btn-secondary flex-1 flex items-center justify-center gap-2">
          <IconPhone size={16} /> Share via WhatsApp
        </button>
        <button onClick={() => window.print()} className="btn-secondary flex-1 flex items-center justify-center gap-2">
          <IconPrinter size={16} /> Print Receipt
        </button>
        <button onClick={downloadPdf} disabled={downloading} className="btn-secondary flex-1 flex items-center justify-center gap-2">
          <IconDownload size={16} /> {downloading ? 'Downloading...' : 'Download PDF'}
        </button>
      </div>
    </div>
  );
}
