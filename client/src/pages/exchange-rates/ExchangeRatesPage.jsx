import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import Modal from '../../components/ui/Modal';
import { formatDate } from '../../utils/format';

export default function ExchangeRatesPage() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ fromCurrency: 'USD', toCurrency: 'GHS', rate: '' });

  const { data: rates } = useQuery({ queryKey: ['exchange-rates'], queryFn: () => api.get('/exchange-rates') });
  const { data: current } = useQuery({ queryKey: ['exchange-rates-current'], queryFn: () => api.get('/exchange-rates/current') });

  const add = useMutation({
    mutationFn: (data) => api.post('/exchange-rates', data),
    onSuccess: () => { toast.success('Rate updated'); qc.invalidateQueries(['exchange-rates']); qc.invalidateQueries(['exchange-rates-current']); setAddOpen(false); setForm({ fromCurrency: 'USD', toCurrency: 'GHS', rate: '' }); },
    onError: (err) => toast.error(err.error || 'Failed'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-text-primary">Exchange Rates</h1>
          <p className="text-text-secondary text-sm mt-1">Current rates relative to GHS</p>
        </div>
        <button className="btn-primary" onClick={() => setAddOpen(true)}>+ Set Rate</button>
      </div>

      {/* Current rates */}
      <div className="grid grid-cols-3 gap-4">
        {['USD', 'GBP', 'AED'].map((c) => (
          <div key={c} className="card text-center">
            <p className="text-text-secondary text-sm">1 {c}</p>
            <p className="font-heading font-bold text-2xl text-text-primary mt-1">
              GH₵ {current?.[c]?.toFixed(2) || '—'}
            </p>
          </div>
        ))}
      </div>

      {/* History */}
      <div className="card overflow-x-auto">
        <h2 className="font-heading font-semibold text-text-primary mb-4">Rate History</h2>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="th">From</th>
              <th className="th">To</th>
              <th className="th">Rate</th>
              <th className="th">Date Set</th>
            </tr>
          </thead>
          <tbody>
            {(rates || []).map((r) => (
              <tr key={r.id} className="table-row">
                <td className="td font-medium">{r.fromCurrency}</td>
                <td className="td text-text-secondary">{r.toCurrency}</td>
                <td className="td">{r.rate.toFixed(4)}</td>
                <td className="td text-text-secondary">{formatDate(r.date)}</td>
              </tr>
            ))}
            {!rates?.length && (
              <tr><td colSpan={4} className="td text-center text-text-tertiary py-8">No rates set</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Set Exchange Rate" size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">From Currency</label>
            <select className="input" value={form.fromCurrency} onChange={(e) => setForm({ ...form, fromCurrency: e.target.value })}>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
              <option value="AED">AED</option>
            </select>
          </div>
          <div>
            <label className="label">To Currency</label>
            <select className="input" value={form.toCurrency} disabled>
              <option value="GHS">GHS</option>
            </select>
          </div>
          <div>
            <label className="label">Rate *</label>
            <input type="number" className="input" step="0.0001" placeholder="e.g. 14.5000" value={form.rate} onChange={(e) => setForm({ ...form, rate: +e.target.value })} />
          </div>
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setAddOpen(false)}>Cancel</button>
            <button className="btn-primary flex-1" onClick={() => add.mutate(form)} disabled={!form.rate || add.isPending}>
              {add.isPending ? 'Setting...' : 'Set Rate'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
