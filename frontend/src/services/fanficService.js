import api from './api';

export const fanficService = {
    
    // Получить опубликованный фанфик без увеличения просмотров (для превью)
    getPublishedFanficNoIncrement: async (id) => {
        const response = await api.get(`/fanfics/published/${id}?no_increment=true`);
        return response.data;
    },

    // Получить рейтинги
    getRatings: async () => {
        const response = await api.get('/fanfics/ratings');
        return response.data;
    },

    // Получить теги
    getTags: async () => {
        const response = await api.get('/fanfics/tags');
        return response.data;
    },

    // Создать фанфик
    createFanfic: async (fanficData, submitForReview = false) => {
        const formData = new FormData();
        
        if (fanficData.content_file) {
            formData.append('content_file', fanficData.content_file);
        }
        
        if (fanficData.cover_image) {
            formData.append('cover_image', fanficData.cover_image);
        }
        
        if (submitForReview) {
            formData.append('status', 'pending');
        }
        
        const fields = ['title', 'description', 'rating_id', 'fandom', 'work_status'];
        fields.forEach(field => {
            if (fanficData[field]) {
                formData.append(field, fanficData[field]);
            }
        });
        
        if (fanficData.tags && Array.isArray(fanficData.tags)) {
            fanficData.tags.forEach(tag => {
                formData.append('tags[]', tag);
            });
        }
        
        if (fanficData.is_early_access) {
            formData.append('is_early_access', '1');
            if (fanficData.days_early_access) {
                formData.append('days_early_access', fanficData.days_early_access.toString());
            }
        } else {
            formData.append('is_early_access', '0');
        }
        
        if (fanficData.is_exclusive) {
            formData.append('is_exclusive', '1');
        } else {
            formData.append('is_exclusive', '0');
        }

        const response = await api.post('/my-fanfics', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    // Получить черновики пользователя
    getDrafts: async () => {
        const response = await api.get('/my-fanfics', { 
            params: { status: 'draft' } 
        });
        return response.data;
    },

    // Получить фанфик по ID
    getFanfic: async (id) => {
        const response = await api.get(`/my-fanfics/${id}`);
        return response.data;
    },

    // Получить опубликованный фанфик по ID (для чтения)
    getPublishedFanfic: async (id) => {
        const response = await api.get(`/fanfics/published/${id}`);
        return response.data;
    },

    getFanficWithLikeStatus: async (id, isOwner = false) => {
        try {
            const fanficData = isOwner 
                ? await fanficService.getFanfic(id)  
                : await fanficService.getPublishedFanfic(id); 
            
            try {
                const likeData = await fanficService.checkLike(id);
                return {
                    ...fanficData,
                    liked: likeData.liked || false
                };
            } catch (likeError) {
                console.warn('Не удалось проверить лайк:', likeError);
                return {
                    ...fanficData,
                    liked: false
                };
            }
        } catch (error) {
            throw error;
        }
    },

    // Получить контент фанфика
    getFanficContent: async (id) => {
        const response = await api.get(`/my-fanfics/${id}/content`);
        return response.data;
    },

    // Обновить фанфик
    updateFanfic: async (id, fanficData) => {
        const formData = new FormData();

        Object.keys(fanficData).forEach(key => {
            if (key === 'tags' && Array.isArray(fanficData[key])) {
                fanficData[key].forEach(tag => {
                    formData.append('tags[]', tag);
                });
            } else if (key === 'content_file' && fanficData[key]) {
                formData.append('content_file', fanficData[key]);
            } else if (key === 'append_to_content') {
                formData.append('append_to_content', fanficData[key] ? '1' : '0');
            } else if (fanficData[key] !== null && fanficData[key] !== undefined) {
                formData.append(key, fanficData[key]);
            }
        });

        const response = await api.post(`/my-fanfics/${id}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    // Получить мои фанфики (с пагинацией)
    getMyFanfics: async (status = null, page = 1, perPage = 6) => {
        let url = '/my-fanfics';
        const params = { page, per_page: perPage };
        
        if (status && status !== 'all') {
            url = `/my-fanfics/filter/${status}`;
        }
        
        const response = await api.get(url, { params });
        
        if (response.data.data) {
            response.data.data = response.data.data.map(fanfic => ({
                ...fanfic,
                previously_approved: fanfic.status === 'pending' && fanfic.published_at !== null
            }));
        }
        
        return response.data;
    },

    // Удалить фанфик
    deleteFanfic: async (id) => {
        const response = await api.delete(`/my-fanfics/${id}`);
        return response.data;
    },

    // Отправить на модерацию
    submitForReview: async (id) => {
        const response = await api.post(`/my-fanfics/${id}/submit`);
        return response.data;
    },

    // Поставить лайк
    likeFanfic: async (id) => {
        const response = await api.post(`/fanfics/${id}/like`);
        return response.data;
    },

    // Убрать лайк
    unlikeFanfic: async (id) => {
        const response = await api.post(`/fanfics/${id}/unlike`);
        return response.data;
    },

    // Проверить лайк
    checkLike: async (id) => {
        const response = await api.get(`/likes/${id}/check`);
        return response.data;
    },

    // Скачать файл фанфика
    downloadFile: async (id) => {
        const response = await api.get(`/fanfics/${id}/download`, {
            responseType: 'blob'
        });
        return response.data;
    },

    // Получить похожие фанфики
    getSimilarFanfics: async (id) => {
        const response = await api.get(`/fanfics/${id}/similar`);
        return response.data;
    },

    getPublishedFanficContent: async (id) => {
        const response = await api.get(`/fanfics/published/${id}/content`);
        return response.data;
    },

    // Поиск фанфиков
    searchFanfics: async (query, filters = {}) => {
        const params = { q: query, ...filters };
        const response = await api.get('/fanfics/search', { params });
        return response.data;
    },

    // Получить опубликованные фанфики (с пагинацией)
    getPublishedFanfics: async (params = {}) => {
        const queryParams = {
            page: params.page || 1,
            per_page: params.per_page || 8,
            sort: params.sort || 'created_at',
            order: params.order || 'desc'
        };
        
        if (params.q) queryParams.q = params.q;
        if (params.rating) queryParams.rating = params.rating;
        if (params.status) queryParams.status = params.status;
        if (params.tags && params.tags.length) {
            params.tags.forEach(tag => queryParams['tags[]'] = tag);
        }
        
        const response = await api.get('/fanfics/published', { params: queryParams });
        return response.data;
    },

    // Получить новинки
    getNewFanfics: async (limit = 10) => {
        const response = await api.get('/fanfics/new', { params: { limit } });
        return response.data;
    },

    // Админские методы
    admin: {
        getPendingFanfics: async (page = 1, perPage = 20) => {
            const response = await api.get('/admin/fanfics/pending', {
                params: { page, per_page: perPage }
            });
            return response.data;
        },

        approveFanfic: async (id) => {
            const response = await api.post(`/admin/fanfics/${id}/approve`);
            return response.data;
        },

        rejectFanfic: async (id, reason) => {
            const response = await api.post(`/admin/fanfics/${id}/reject`, { reason });
            return response.data;
        },

        getFanficStats: async () => {
            const response = await api.get('/admin/fanfics/stats');
            return response.data;
        },

        getAllFanfics: async (page = 1, perPage = 50, filters = {}) => {
            const params = { page, per_page: perPage, ...filters };
            const response = await api.get('/admin/fanfics', { params });
            return response.data;
        },

        updateFanficStatus: async (id, status, reason = null) => {
            const data = reason ? { status, reason } : { status };
            const response = await api.put(`/admin/fanfics/${id}/status`, data);
            return response.data;
        },

        getFanficForAdmin: async (id) => {
            const response = await api.get(`/admin/fanfics/${id}`);
            return response.data;
        },

        deleteFanfic: async (id) => {
            const response = await api.delete(`/admin/fanfics/${id}`);
            return response.data;
        },

        restoreFanfic: async (id) => {
            const response = await api.post(`/admin/fanfics/${id}/restore`);
            return response.data;
        },

        getFanficComments: async (id) => {
            const response = await api.get(`/admin/fanfics/${id}/comments`);
            return response.data;
        },

        deleteComment: async (fanficId, commentId) => {
            const response = await api.delete(`/admin/fanfics/${fanficId}/comments/${commentId}`);
            return response.data;
        },
    },

    // Получить рекомендованные фанфики
    getRecommendedFanfics: async (limit = 10) => {
        const response = await api.get('/fanfics/recommended', { params: { limit } });
        return response.data;
    },

    // Получить огненные работы
    getFireFanfics: async (limit = 10) => {
        const response = await api.get('/fanfics/fire', { params: { limit } });
        return response.data;
    },
    
    // Получить лайкнутые фанфики пользователя (с пагинацией)
    getLikedFanfics: async (page = 1, perPage = 6) => {
        const response = await api.get('/profile/liked-fanfics', {
            params: { page, per_page: perPage }
        });
        return response.data;
    },
};