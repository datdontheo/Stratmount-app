import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import Modal from '../../components/ui/Modal';
import { formatCurrency, formatDate } from '../../utils/format';
import { SkeletonRow } from '../../components/ui/Skeleton';
import { IconPlus } from '../../components/ui/Icons';

function RecordPaymentModal({ isOpen, onClose, sales }) {
  const qc = useQueryClient();
  const fileRef = useRef();
  const [form, setForm] = useState({
    saleId: '', amount: '', method: 'MOBILE_MONEY', notes: '', paymentDate: new Date().toISOString().split('T')[0],
  });
  const [proofImage, setProofImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  const uploadProof = async (file) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('proof', file);
      const res = await api.post('/payments/upload', fd);
      setProofImage(res.url);
      toast.success('Proof uploaded');
    } catch {
      toast.error('Failed to upload proof');
    } finally {
      setUploading(false);
    }
  };

  const record = useMutation({
    mutationFn: (data) => api.post('/payments', data),
    onSuccess: () => {
      toast.success('Payment recorded');
      qc.invalidateQueries(['payments']);
      qc.invalidateQueries(['sales']);
      onClose();
      setForm({ saleId: '', amount: '', method: 'MOBILE_MONEY', notes: '', paymentDate: new Date().toISOString().split('T')[0] });
      setProofImage(null);
    },
    onError: (err) => toast.error(err.error || 'Failed to record payment'),
  });

  const handleClose = () => {
    setProofImage(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Record Payment" size="sm">
      <div className="space-y-4">
        <div>
          <label className="label">Linked Sale (optional)</label>
          <select className="input" value={form.saleId} onChange={(e) => {
            const sale = sales?.find((s) => s.id === e.target.value);
            setForm({ ...form, saleId: e.target.value, amount: sale ? sale.balance : form.amount });
          }}>
            <option value="">No linked sale</option>
            {(sales || []).filter((s) => s.status !== 'PAID').map((s) => (
              <option key={s.id} value={s.id}>{s.customer?.name || 'Walk-in'} — Balance: {formatCurrency(s.balance)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Amount (GHS) *</label>
          <input type="number" className="input" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: +e.target.value })} required />
        </div>
        <div>
          <label className="label">Payment Method</label>
          <select className="input" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
            <option value="MOBILE_MONEY">Mobile Money</option>
            <option value="CASH">Cash</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
          </select>
        </div>
        <div>
          <label className="label">Date</label>
          <input type="date" className="input" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} />
        </div>
        <div>
          <label className="label">Proof of Payment</label>
          <div
            className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-text-secondary/30 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {proofImage ? (
              <img src={proofImage} alt="Proof" className="max-h-32 mx-auto rounded-lg" />
            ) : (
              <div>
                <p className="text-text-secondary text-sm">Click to upload or drag & drop</p>
                <p className="text-text-tertiary text-xs mt-1">JPG, PNG, WebP — max 5MB</p>
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && uploadProof(e.target.files[0])}
          />
          {uploading && <p className="text-text-secondary text-xs mt-1">Uploading...</p>}
        </div>
        <div>
          <label className="label">Notes</label>
          <input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div className="flex gap-3 pt-2">
          <button className="btn-secondary flex-1" onClick={handleClose}>Cancel</button>
          <button
            className="btn-primary flex-1"
            onClick={() => record.mutate({ ...form, amount: +form.amount, proofImage })}
            disabled={!form.amount || record.isPending}
          >
            {record.isPending ? 'Saving...' : 'Record Payment'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function PaymentsPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [proofModal, setProofModal] = useState(null);

  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: () => api.get('/payments'),
  });

  const { data: sales } = useQuery({ queryKey: ['sales'], queryFn: () => api.get('/sales') });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-text-primary">Payments</h1>
          <p className="text-text-secondary text-sm mt-1">{payments?.length || 0} records</p>
        </div>
        <button className="btn-primary" onClick={() => setAddOpen(true)}>+ Record Payment</button>
      </div>

      <div className="card hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="th">Paid By</th>
              <th className="th">Sale / Customer</th>
              <th className="th">Amount</th>
              <th className="th">Method</th>
              <th className="th">Date</th>
              <th className="th">Proof</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={6} />)}
            {(payments || []).map((p) => (
              <tr key={p.id} className="table-row">
                <td className="td font-medium">{p.paidBy?.name}</td>
                <td className="td text-text-secondary">{p.sale ? (p.sale.customer?.name || 'Walk-in') : '—'}</td>
                <td className="td font-medium text-success">{formatCurrency(p.amount)}</td>
                <td className="td">
                  <span className="text-xs bg-bg-tertiary px-2 py-0.5 rounded text-text-secondary">
                    {p.method?.replace('_', ' ')}
                  </span>
                </td>
                <td className="td text-text-secondary">{formatDate(p.paymentDate)}</td>
                <td className="td">
                  {p.proofImage ? (
                    <button onClick={() => setProofModal(p.proofImage)} className="text-success text-xs hover:underline">
                      ✓ View Proof
                    </button>
                  ) : (
                    <span className="text-text-tertiary text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
            {!isLoading && !payments?.length && (
              <tr><td colSpan={6} className="td text-center text-text-tertiary py-8">No payments recorded</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="lg:hidden space-y-3">
        {(payments || []).map((p) => (
          <div key={p.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-text-primary">{formatCurrency(p.amount)}</p>
                <p className="text-text-tertiary text-xs mt-0.5">{p.method?.replace('_', ' ')} · {p.paidBy?.name}</p>
              </div>
              {p.proofImage ? (
                <button onClick={() => setProofModal(p.proofImage)} className="text-success text-xs">✓ Proof</button>
              ) : null}
            </div>
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-border text-xs text-text-secondary">
              <span>{formatDate(p.paymentDate)}</span>
              {p.notes && <span>{p.notes}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* FAB */}
      <button
        onClick={() => setAddOpen(true)}
        className="lg:hidden fixed bottom-20 right-4 w-14 h-14 rounded-full flex items-center justify-center shadow-lg z-20"
        style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
      >
        <IconPlus size={24} />
      </button>

      <RecordPaymentModal isOpen={addOpen} onClose={() => setAddOpen(false)} sales={sales} />

      {/* Proof image modal */}
      {proofModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setProofModal(null)}>
          <div className="absolute inset-0 bg-black/80" />
          <img src={proofModal} alt="Proof of payment" className="relative max-w-full max-h-[80vh] rounded-xl" />
        </div>
      )}
    </div>
  );
}
