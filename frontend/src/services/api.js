import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://45.147.179.241/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    },
    withCredentials: true,
    timeout: 10000,
});

// api.js - добавьте в interceptor.request
api.interceptors.request.use(
    (config) => {
        console.log(`[API] ${config.method.toUpperCase()} ${config.baseURL}${config.url}`, {
            headers: config.headers,
            data: config.data,
            timestamp: new Date().toISOString()
        });
        
        // 🔥 КРИТИЧЕСКИЙ ЛОГ: если запрашивают GET /login
        if (config.method === 'get' && config.url?.includes('/login')) {
            console.error('🚨 ОБНАРУЖЕН GET-запрос к /login! Stack:', new Error().stack);
        }
        
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        console.error('[API Request Error]', error);
        return Promise.reject(error);
    }
);

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (!error.response) {
            console.error('Ошибка сети:', error.message);
            return Promise.reject(error);
        }

        const { status } = error.response;
        
        if (status === 401) {
            const currentPath = window.location.pathname;

            if (!localStorage.getItem('user')) {
                return Promise.reject(error);
            }

            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('role');

            window.location.href = '/login?redirect=' + encodeURIComponent(currentPath);
        } else if (status === 419) {
            console.log('Сессия истекла, выполняется выход...');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('role');
            window.location.href = '/login?session=expired';
        }
        
        return Promise.reject(error);
    }
);

export const authService = {
    updateProfile: async (profileData) => {
        let formData = profileData;
        
        if (!(profileData instanceof FormData)) {
            formData = new FormData();
            Object.keys(profileData).forEach(key => {
                if (profileData[key] !== null && profileData[key] !== undefined) {
                    formData.append(key, profileData[key]);
                }
            });
        }

        // Добавляем _method для Laravel если нужно
        if (!formData.has('_method')) {
            formData.append('_method', 'PUT');
        }

        const response = await api.post('/profile', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },
    
    // Новые методы для двухфакторной аутентификации
    sendRegistrationCode: async (userData) => {
        const response = await api.post('/send-registration-code', userData);
        return response;
    },

    verifyAndRegister: async (data) => {
        const response = await api.post('/verify-and-register', data);
        return response;
    },

    sendPasswordResetCode: async (data) => {
        const response = await api.post('/send-password-reset-code', data);
        return response;
    },

    resetPassword: async (data) => {
        const response = await api.post('/reset-password', data);
        return response;
    },

    register: async (userData) => {
        // Этот метод теперь использует двухфакторную аутентификацию
        return authService.sendRegistrationCode(userData);
    },

    login: async (credentials) => {
        try {
            const response = await api.post('/login', credentials);
            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));
                localStorage.setItem('role', response.data.role || 'user');
            }
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    logout: async () => {
        try {
            await api.post('/logout');
        } catch (error) {
            console.error('Ошибка при выходе:', error);
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('role');
        }
    },

    getCurrentUser: async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            return null;
        }

        try {
            const response = await api.get('/me');
            return response.data;
        } catch (error) {
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('role');
                return null;
            }
            
            console.error('Ошибка получения данных пользователя:', error.message);
            return null;
        }
    },

    unsubscribe: async (authorId) => {
        const response = await api.delete(`/authors/${authorId}/unsubscribe`);
        return response.data;
    },

    getUserBackground: async () => {
        try {
            const response = await api.get('/profile');
            if (response.data.user?.background_url) {
                return {
                    url: response.data.user.background_url,
                    opacity: response.data.user.background_opacity || 0.7,
                };
            }
            return null;
        } catch (error) {
            console.error('Ошибка получения фона:', error);
            return null;
        }
    },

    isAuthenticated: () => {
        const token = localStorage.getItem('token');
        return !!token;
    },

    isAdmin: () => {
        const role = localStorage.getItem('role');
        return role === 'admin';
    },

    admin: {
        getUsers: async () => {
            const response = await api.get('/admin/users');
            return response.data;
        },
        
        getStats: async () => {
            const response = await api.get('/admin/stats');
            return response.data;
        },
        
        updateUserRole: async (userId, role) => {
            const response = await api.put(`/admin/users/${userId}/role`, { role });
            return response.data;
        },
        
        // НОВЫЙ МЕТОД: Блокировка пользователя
        blockUser: async (userId, reason) => {
            const response = await api.post(`/admin/users/${userId}/block`, { reason });
            return response.data;
        },
        
        // НОВЫЙ МЕТОД: Разблокировка пользователя
        unblockUser: async (userId) => {
            const response = await api.post(`/admin/users/${userId}/unblock`);
            return response.data;
        },
        
        // Существующий метод удаления (оставляем на всякий случай)
        deleteUser: async (userId) => {
            const response = await api.delete(`/admin/users/${userId}`);
            return response.data;
        }
    }
};

export default api;