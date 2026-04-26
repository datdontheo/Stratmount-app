import { useState } from 'react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [businessName, setBusinessName] = useState('Strat Mount');
  const [whatsapp, setWhatsapp] = useState('');
  const [baseCurrency, setBaseCurrency] = useState('GHS');

  const save = (e) => {
    e.preventDefault();
    localStorage.setItem('sm_settings', JSON.stringify({ businessName, whatsapp, baseCurrency }));
    toast.success('Settings saved');
  };

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-white">Settings</h1>
        <p className="text-text-secondary text-sm mt-1">Business configuration</p>
      </div>

      <form onSubmit={save} className="card space-y-5">
        <div>
          <label className="label">Business Name</label>
          <input className="input" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
        </div>
        <div>
          <label className="label">Base Currency</label>
          <select className="input" value={baseCurrency} onChange={(e) => setBaseCurrency(e.target.value)}>
            <option value="GHS">GHS — Ghana Cedi (GH₵)</option>
            <option value="USD">USD — US Dollar ($)</option>
          </select>
        </div>
        <div>
          <label className="label">WhatsApp Number (for receipt sharing)</label>
          <input className="input" placeholder="+233 24 000 0000" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
          <p className="text-text-tertiary text-xs mt-1">Include country code e.g. +233...</p>
        </div>

        <button type="submit" className="btn-primary w-full">Save Settings</button>
      </form>

      <div className="card">
        <h2 className="font-heading font-semibold text-white mb-3">About</h2>
        <div className="space-y-2 text-sm text-text-secondary">
          <div className="flex justify-between"><span>Application</span><span className="text-white">Strat Mount</span></div>
          <div className="flex justify-between"><span>Version</span><span className="text-white">1.0.0</span></div>
          <div className="flex justify-between"><span>Region</span><span className="text-white">Ghana · UAE · UK</span></div>
        </div>
      </div>

      <div className="card border-danger/30">
        <h2 className="font-heading font-semibold text-danger mb-2">Danger Zone</h2>
        <p className="text-text-secondary text-sm mb-3">These actions are irreversible. Proceed with caution.</p>
        <button
          className="btn-danger text-sm"
          onClick={() => {
            if (window.confirm('Log out of all sessions?')) {
              localStorage.clear();
              window.location.href = '/login';
            }
          }}
        >
          Clear Local Data & Logout
        </button>
      </div>
    </div>
  );
}
