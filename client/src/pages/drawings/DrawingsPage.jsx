import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import Modal from '../../components/ui/Modal';
import { formatCurrency, formatDate } from '../../utils/format';

export default function DrawingsPage() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ amount: '', description: '', date: new Date().toISOString().split('T')[0] });

  const { data: drawings } = useQuery({ queryKey: ['drawings'], queryFn: () => api.get('/drawings') });

  const total = (drawings || []).reduce((s, d) => s + d.amount, 0);

  const add = useMutation({
    mutationFn: (data) => api.post('/drawings', data),
    onSuccess: () => { toast.success('Drawing recorded'); qc.invalidateQueries(['drawings']); setAddOpen(false); setForm({ amount: '', description: '', date: new Date().toISOString().split('T')[0] }); },
    onError: (err) => toast.error(err.error || 'Failed'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-white">Drawings</h1>
          <p className="text-text-secondary text-sm mt-1">Total withdrawn: {formatCurrency(total)}</p>
        </div>
        <button className="btn-primary" onClick={() => setAddOpen(true)}>+ Record Drawing</button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="th">Date</th>
              <th className="th">Description</th>
              <th className="th">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(drawings || []).map((d) => (
              <tr key={d.id} className="table-row">
                <td className="td text-text-secondary">{formatDate(d.date)}</td>
                <td className="td">{d.description || '—'}</td>
                <td className="td font-medium text-warning">{formatCurrency(d.amount)}</td>
              </tr>
            ))}
            {!drawings?.length && (
              <tr><td colSpan={3} className="td text-center text-text-tertiary py-8">No drawings recorded</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Record Drawing" size="sm">
        <div className="space-y-4">
          <div><label className="label">Amount (GHS) *</label><input type="number" className="input" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: +e.target.value })} /></div>
          <div><label className="label">Description</label><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><label className="label">Date</label><input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setAddOpen(false)}>Cancel</button>
            <button className="btn-primary flex-1" onClick={() => add.mutate(form)} disabled={!form.amount || add.isPending}>
              {add.isPending ? 'Saving...' : 'Record Drawing'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
