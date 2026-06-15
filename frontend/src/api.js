const DIRECT_API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const getToken = () => localStorage.getItem('music_token') || '';

const getApiBases = () => {
  const bases = [''];

  if (
    typeof window !== 'undefined' &&
    window.location.origin !== DIRECT_API_BASE
  ) {
    bases.push(DIRECT_API_BASE);
  }

  return bases;
};

const request = async (url, options = {}) => {
  const headers = options.headers ? { ...options.headers } : {};
  const token = getToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  for (const base of getApiBases()) {
    try {
      response = await fetch(`${base}${url}`, {
        ...options,
        headers
      });
      break;
    } catch (error) {
      // 继续尝试下一个后端地址
    }
  }

  if (!response) {
    throw new Error(`无法连接后端服务，请确认后端已启动：${DIRECT_API_BASE}`);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || '请求失败');
  }

  return data;
};

export const api = {
  register(payload) {
    return request('/api/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  },

  login(payload) {
    return request('/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  },

  getProfile() {
    return request('/api/users/profile');
  },

  getSongs(params = {}) {
    const query = new URLSearchParams();

    if (params.keyword) {
      query.set('keyword', params.keyword);
    }

    if (params.category) {
      query.set('category', params.category);
    }

    const queryString = query.toString();
    return request(`/api/songs${queryString ? `?${queryString}` : ''}`);
  },

  uploadSong(formData) {
    return request('/api/songs', {
      method: 'POST',
      body: formData
    });
  },

  increasePlayCount(songId) {
    return request(`/api/songs/${songId}/play`, {
      method: 'POST'
    });
  },

  deleteSong(songId) {
    return request(`/api/songs/${songId}`, {
      method: 'DELETE'
    });
  },

  getFavorites() {
    return request('/api/favorites');
  },

  addFavorite(songId) {
    return request(`/api/favorites/${songId}`, {
      method: 'POST'
    });
  },

  removeFavorite(songId) {
    return request(`/api/favorites/${songId}`, {
      method: 'DELETE'
    });
  }
};
