import { create } from 'zustand';

const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('sm_user') || 'null'),
  token: localStorage.getItem('sm_token'),

  login: (user, token) => {
    localStorage.setItem('sm_token', token);
    localStorage.setItem('sm_user', JSON.stringify(user));
    set({ user, token });
  },

  logout: () => {
    localStorage.removeItem('sm_token');
    localStorage.removeItem('sm_user');
    set({ user: null, token: null });
  },

  updateUser: (user) => {
    localStorage.setItem('sm_user', JSON.stringify(user));
    set({ user });
  },
}));

export default useAuthStore;
