import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import useAuthStore from '../../store/authStore';

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const qc = useQueryClient();
  const isAdmin = user?.role === 'ADMIN';
  const logoRef = useRef();

  // Admin-only local settings
  const saved = JSON.parse(localStorage.getItem('sm_settings') || '{}');
  const [businessName, setBusinessName] = useState(saved.businessName || 'Strat Mount');
  const [whatsapp, setWhatsapp] = useState(saved.whatsapp || '');
  const [baseCurrency, setBaseCurrency] = useState(saved.baseCurrency || 'GHS');
  const [appLogo, setAppLogo] = useState(saved.appLogo || '');
  const [appLogoUploading, setAppLogoUploading] = useState(false);

  // Company profile (OUTLET / WAREHOUSE)
  const [companyName, setCompanyName] = useState('');
  const [defaultMargin, setDefaultMargin] = useState('');
  const [companyLogo, setCompanyLogo] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  // Load current user profile
  useQuery({
    queryKey: ['user-me'],
    queryFn: () => api.get('/users/me'),
    onSuccess: (data) => {
      if (data.companyName) setCompanyName(data.companyName);
      if (data.defaultMargin != null) setDefaultMargin(String(data.defaultMargin));
      if (data.companyLogo) setCompanyLogo(data.companyLogo);
    },
  });

  const saveAdminSettings = (e) => {
    e.preventDefault();
    localStorage.setItem('sm_settings', JSON.stringify({ businessName, whatsapp, baseCurrency, appLogo }));
    toast.success('Settings saved');
  };

  const uploadAppLogo = async (file) => {
    setAppLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const res = await api.post('/users/upload-logo', fd);
      setAppLogo(res.url);
      localStorage.setItem('sm_settings', JSON.stringify({ businessName, whatsapp, baseCurrency, appLogo: res.url }));
      toast.success('App logo uploaded');
    } catch {
      toast.error('Failed to upload logo');
    } finally {
      setAppLogoUploading(false);
    }
  };

  const saveProfile = useMutation({
    mutationFn: (data) => api.put('/users/profile', data),
    onSuccess: () => {
      toast.success('Profile saved');
      qc.invalidateQueries({ queryKey: ['user-me'] });
    },
    onError: (err) => toast.error(err.error || 'Failed to save profile'),
  });

  const uploadLogo = async (file) => {
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const res = await api.post('/users/upload-logo', fd);
      setCompanyLogo(res.url);
      await api.put('/users/profile', { companyName, companyLogo: res.url, defaultMargin: defaultMargin ? +defaultMargin : null });
      toast.success('Logo uploaded');
      qc.invalidateQueries({ queryKey: ['user-me'] });
    } catch {
      toast.error('Failed to upload logo');
    } finally {
      setLogoUploading(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match');
    setPwLoading(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      updateUser({ ...user, mustChangePassword: false });
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.error || 'Failed to change password');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-text-primary">Settings</h1>
        <p className="text-text-secondary text-sm mt-1">{isAdmin ? 'Business configuration' : 'Your profile & preferences'}</p>
      </div>

      {/* Admin-only: Business settings */}
      {isAdmin && (
        <form onSubmit={saveAdminSettings} className="card space-y-5">
          <h2 className="font-heading font-semibold text-text-primary">Business Settings</h2>
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
          <div>
            <label className="label">App Logo</label>
            <div
              className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-text-secondary/30 transition-colors"
              onClick={() => logoRef.current?.click()}
            >
              {appLogo ? (
                <img src={appLogo} alt="App logo" className="max-h-20 mx-auto rounded" />
              ) : (
                <div>
                  <p className="text-text-secondary text-sm">Click to upload Stratmount logo</p>
                  <p className="text-text-tertiary text-xs mt-1">JPG, PNG, WebP — max 5MB (appears on receipts)</p>
                </div>
              )}
            </div>
            <input
              ref={logoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadAppLogo(e.target.files[0])}
            />
            {appLogoUploading && <p className="text-text-secondary text-xs mt-1">Uploading...</p>}
            {appLogo && (
              <button
                type="button"
                className="text-xs text-danger mt-1 hover:underline"
                onClick={() => setAppLogo('')}
              >
                Remove logo
              </button>
            )}
          </div>
          <button type="submit" className="btn-primary w-full">Save Settings</button>
        </form>
      )}

      {/* OUTLET / WAREHOUSE: Company profile */}
      {!isAdmin && (
        <div className="card space-y-5">
          <div>
            <h2 className="font-heading font-semibold text-text-primary">My Company Profile</h2>
            <p className="text-text-secondary text-xs mt-1">This information appears on your sales receipts and PDFs.</p>
          </div>

          {/* Logo */}
          <div>
            <label className="label">Company Logo</label>
            <div
              className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-text-secondary/30 transition-colors"
              onClick={() => logoRef.current?.click()}
            >
              {companyLogo ? (
                <img src={companyLogo} alt="Company logo" className="max-h-20 mx-auto rounded" />
              ) : (
                <div>
                  <p className="text-text-secondary text-sm">Click to upload logo</p>
                  <p className="text-text-tertiary text-xs mt-1">JPG, PNG, WebP — max 5MB</p>
                </div>
              )}
            </div>
            <input
              ref={logoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])}
            />
            {logoUploading && <p className="text-text-secondary text-xs mt-1">Uploading...</p>}
            {companyLogo && (
              <button
                type="button"
                className="text-xs text-danger mt-1 hover:underline"
                onClick={() => setCompanyLogo('')}
              >
                Remove logo
              </button>
            )}
          </div>

          <div>
            <label className="label">Company / Trading Name</label>
            <input
              className="input"
              placeholder="e.g. Luxe Scents GH"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
            <p className="text-text-tertiary text-xs mt-1">Appears as the header on all your receipts</p>
          </div>

          <div>
            <label className="label">Default Profit Margin (%)</label>
            <input
              type="number"
              className="input"
              placeholder="e.g. 20"
              min={0}
              max={500}
              step="0.1"
              value={defaultMargin}
              onChange={(e) => setDefaultMargin(e.target.value)}
            />
            <p className="text-text-tertiary text-xs mt-1">
              Unit price in new sales auto-fills as: base cost × (1 + margin / 100)
            </p>
          </div>

          <button
            type="button"
            className="btn-primary w-full"
            disabled={saveProfile.isPending}
            onClick={() => saveProfile.mutate({
              companyName: companyName || null,
              companyLogo: companyLogo || null,
              defaultMargin: defaultMargin ? +defaultMargin : null,
            })}
          >
            {saveProfile.isPending ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      )}

      {/* Change Password */}
      <form onSubmit={changePassword} className="card space-y-4">
        <h2 className="font-heading font-semibold text-text-primary">Change Password</h2>
        <div>
          <label className="label">Current Password</label>
          <input type="password" className="input" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
        </div>
        <div>
          <label className="label">New Password</label>
          <input type="password" className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
        </div>
        <div>
          <label className="label">Confirm New Password</label>
          <input type="password" className="input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={pwLoading}>
          {pwLoading ? 'Updating...' : 'Update Password'}
        </button>
      </form>

      <div className="card">
        <h2 className="font-heading font-semibold text-text-primary mb-3">About</h2>
        <div className="space-y-2 text-sm text-text-secondary">
          <div className="flex justify-between"><span>Application</span><span className="text-text-primary">Strat Mount</span></div>
          <div className="flex justify-between"><span>Version</span><span className="text-text-primary">1.0.0</span></div>
          <div className="flex justify-between"><span>Region</span><span className="text-text-primary">Ghana · UAE · UK</span></div>
          <div className="flex justify-between"><span>Role</span><span className="text-text-primary capitalize">{user?.role?.toLowerCase()}</span></div>
        </div>
      </div>

      <div className="card border-danger/30">
        <h2 className="font-heading font-semibold text-danger mb-2">Danger Zone</h2>
        <p className="text-text-secondary text-sm mb-3">Clears your local session and logs you out.</p>
        <button
          className="btn-danger text-sm"
          onClick={() => {
            if (window.confirm('Log out of all sessions?')) {
              localStorage.removeItem('sm_token');
              localStorage.removeItem('sm_user');
              window.location.href = '/login';
            }
          }}
        >
          Clear Local Data & Logout
        </button>
        {isAdmin && (
          <div className="mt-4 pt-4 border-t border-danger/20">
            <p className="text-text-secondary text-sm mb-3">Permanently delete all sales records and payment history. Inventory is not affected.</p>
            <button
              className="btn-danger text-sm"
              onClick={async () => {
                if (window.confirm('DELETE ALL SALES AND PAYMENTS? This cannot be undone.') &&
                    window.confirm('Are you absolutely sure? All sales data will be lost permanently.')) {
                  try {
                    await api.delete('/sales/all');
                    toast.success('All sales and payments deleted');
                    qc.invalidateQueries();
                  } catch (err) {
                    toast.error(err.error || 'Failed to delete data');
                  }
                }
              }}
            >
              Reset Sales Data
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
