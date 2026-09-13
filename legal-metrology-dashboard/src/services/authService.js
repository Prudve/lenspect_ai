import api from './api';

export const authService = {
  /**
   * Post credentials to backend /users/login
   * Supports username or email
   */
  async login(identifier, password) {
    const isEmail = identifier.includes('@');
    const payload = {
      [isEmail ? 'email' : 'username']: identifier.trim(),
      password,
    };

    const response = await api.post('/users/login', payload);

    if (response?.data?.accessToken) {
      api.setToken(response.data.accessToken);
      const user = response.data.user || {
        username: identifier,
        fullName: 'Senior Enforcement Officer',
        role: 'ADMIN',
      };
      localStorage.setItem('lmpc_user', JSON.stringify(user));
      return { success: true, user, token: response.data.accessToken };
    }

    throw new Error(response?.message || 'Login failed: Invalid server response');
  },

  /**
   * Invalidate session and clear stored tokens
   */
  async logout() {
    try {
      await api.post('/users/logout', {}).catch(() => {});
    } finally {
      api.clearAuth();
    }
  },

  /**
   * Fetch profile of currently authenticated user from backend
   */
  async getCurrentUser() {
    try {
      const response = await api.get('/users/current-user');
      if (response?.data) {
        localStorage.setItem('lmpc_user', JSON.stringify(response.data));
        return response.data;
      }
      return null;
    } catch {
      return null;
    }
  },

  getStoredToken() {
    return api.getToken();
  },

  getStoredUser() {
    try {
      const raw = localStorage.getItem('lmpc_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  isAuthenticated() {
    return Boolean(this.getStoredToken());
  },
};

export default authService;
