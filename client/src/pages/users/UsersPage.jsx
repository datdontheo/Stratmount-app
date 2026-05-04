import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import Drawer from '../../components/ui/Drawer';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import { formatDate } from '../../utils/format';

const emptyForm = { name: '', email: '', password: '', role: 'OUTLET' };

export default function UsersPage() {
  const qc = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const { data: users } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users') });

  const save = useMutation({
    mutationFn: (data) => editUser ? api.put(`/users/${editUser.id}`, data) : api.post('/users', data),
    onSuccess: () => { toast.success(editUser ? 'User updated' : 'User created'); qc.invalidateQueries(['users']); setDrawerOpen(false); },
    onError: (err) => toast.error(err.error || 'Failed'),
  });

  const deleteUser = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess: () => { toast.success('User deleted'); qc.invalidateQueries(['users']); setDeleteConfirm(null); },
    onError: (err) => toast.error(err.error || 'Failed to delete'),
  });

  const openAdd = () => { setEditUser(null); setForm(emptyForm); setDrawerOpen(true); };
  const openEdit = (u) => { setEditUser(u); setForm({ name: u.name, email: u.email, role: u.role, password: '' }); setDrawerOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-text-primary">Users</h1>
          <p className="text-text-secondary text-sm mt-1">{users?.length || 0} users</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>+ Add User</button>
      </div>

      <div className="card hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="th">Name</th>
              <th className="th">Email</th>
              <th className="th">Role</th>
              <th className="th">Status</th>
              <th className="th">Created</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {(users || []).map((u) => (
              <tr key={u.id} className="table-row">
                <td className="td font-medium">{u.name}</td>
                <td className="td text-text-secondary">{u.email}</td>
                <td className="td"><Badge value={u.role} /></td>
                <td className="td">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${u.isActive ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="td text-text-secondary">{formatDate(u.createdAt)}</td>
                <td className="td">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(u)} className="text-text-secondary hover:text-text-primary text-xs">Edit</button>
                    {u.role === 'OUTLET' && (
                      <button onClick={() => setDeleteConfirm(u)} className="text-text-secondary hover:text-danger text-xs">Delete</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="lg:hidden space-y-3">
        {(users || []).map((u) => (
          <div key={u.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-text-primary">{u.name}</p>
                <p className="text-text-tertiary text-xs mt-0.5">{u.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge value={u.role} />
                <span className={`text-xs px-2 py-0.5 rounded-full ${u.isActive ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                  {u.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            <div className="flex gap-3 mt-3 pt-2 border-t border-border">
              <button onClick={() => openEdit(u)} className="text-text-secondary text-sm">Edit</button>
              {u.role === 'OUTLET' && (
                <button onClick={() => setDeleteConfirm(u)} className="text-text-secondary hover:text-danger text-sm">Delete</button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title={editUser ? 'Edit User' : 'New User'}>
        <div className="space-y-4">
          <div><label className="label">Full Name *</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label">Email *</label><input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="OUTLET">Outlet Partner</option>
              <option value="WAREHOUSE">Warehouse Manager</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div>
            <label className="label">{editUser ? 'New Password (leave blank to keep)' : 'Password *'}</label>
            <input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editUser ? '••••••••' : 'Min. 8 characters'} />
          </div>
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setDrawerOpen(false)}>Cancel</button>
            <button className="btn-primary flex-1" onClick={() => save.mutate(form)} disabled={(!editUser && !form.password) || !form.name || !form.email || save.isPending}>
              {save.isPending ? 'Saving...' : 'Save User'}
            </button>
          </div>
        </div>
      </Drawer>

      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete User" size="sm">
        <div className="space-y-4">
          <p className="text-text-secondary">Are you sure you want to delete <span className="font-semibold text-text-primary">{deleteConfirm?.name}</span>? This action cannot be undone.</p>
          <div className="flex gap-3">
            <button className="btn-secondary flex-1" onClick={() => setDeleteConfirm(null)}>Cancel</button>
            <button className="bg-danger text-white px-4 py-2 rounded-lg text-sm font-medium flex-1 disabled:opacity-50" onClick={() => deleteUser.mutate(deleteConfirm.id)} disabled={deleteUser.isPending}>
              {deleteUser.isPending ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
