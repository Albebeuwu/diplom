import api from './api';

export const authorService = {
    // Получить информацию об авторе
    getAuthor: async (userId) => {
        const response = await api.get(`/authors/${userId}`);
        return response.data?.data || response.data;
    },

    // Получить работы автора
    getAuthorFanfics: async (userId) => {
        const response = await api.get(`/authors/${userId}/fanfics`);
        const fanfics = response.data?.data || response.data;
        return Array.isArray(fanfics) ? fanfics : [];
    },

    // Подписаться на автора
    subscribe: async (authorId) => {
        const response = await api.post(`/authors/${authorId}/subscribe`);
        return response.data;
    },

    // Отписаться от автора
    unsubscribe: async (authorId) => {
        const response = await api.post(`/authors/${authorId}/unsubscribe`);
        return response.data;
    },

    // Проверить подписку
    checkSubscription: async (authorId) => {
        const response = await api.get(`/authors/${authorId}/subscription-status`);
        const data = response.data?.data || response.data;
        return data.isSubscribed || data.subscribed || false;
    },

    // Получить список подписок пользователя
    getSubscriptions: async () => {
        const response = await api.get('/profile/subscriptions');
        const subscriptions = response.data?.data || response.data;
        
        if (Array.isArray(subscriptions)) {
            return subscriptions.map(sub => {
                if (sub.author) {
                    return {
                        id: sub.author.id,
                        name: sub.author.name,
                        avatar_url: sub.author.avatar_url,
                        bio: sub.author.bio,
                        fanfics_count: sub.author.fanfics_count,
                        total_likes: sub.author.total_likes
                    };
                }
                return {
                    id: sub.id,
                    name: sub.name,
                    avatar_url: sub.avatar_url,
                    bio: sub.bio,
                    fanfics_count: sub.fanfics_count,
                    total_likes: sub.total_likes
                };
            });
        }
        
        return [];
    },

    // Получить дополнительный контент автора (ранний доступ + эксклюзив)
    getAuthorExtraContent: async (authorId) => {
        const response = await api.get(`/authors/${authorId}/extra-content`);
        return response.data?.data || response.data;
    },
    
    // Получить фанфики с ранним доступом
    getAuthorEarlyAccess: async (authorId) => {
        const response = await api.get(`/authors/${authorId}/early-access`);
        const data = response.data?.data || response.data;
        return Array.isArray(data) ? data : [];
    },
    
    // Получить эксклюзивные фанфики
    getAuthorExclusive: async (authorId) => {
        const response = await api.get(`/authors/${authorId}/exclusive`);
        const data = response.data?.data || response.data;
        return Array.isArray(data) ? data : [];
    },
    
    // Получить опросы автора
    getAuthorSurveys: async (authorId) => {
        try {
            console.log('Запрос опросов для автора:', authorId);
            const response = await api.get(`/surveys/author/${authorId}`);
            console.log('Ответ сервера:', response.data);
            const data = response.data?.data || response.data;
            
            // Проверяем структуру ответа
            if (Array.isArray(data)) {
                console.log(`Получено ${data.length} опросов`);
                return data;
            } else if (data && Array.isArray(data.surveys)) {
                console.log(`Получено ${data.surveys.length} опросов (из поля surveys)`);
                return data.surveys;
            } else if (data && typeof data === 'object') {
                // Если пришел объект, пытаемся извлечь массив
                console.warn('Неожиданный формат данных:', data);
                return [];
            }
            
            return [];
        } catch (error) {
            console.error('Ошибка загрузки опросов:', error);
            console.error('Детали ошибки:', error.response?.data);
            return [];
        }
    },
    
    // Получить результаты опроса
    getSurveyResults: async (surveyId) => {
        const response = await api.get(`/surveys/${surveyId}/results`);
        return response.data?.data || response.data;
    },
    
    // Проголосовать в опросе
    voteSurvey: async (surveyId, answers) => {
        const response = await api.post(`/surveys/${surveyId}/vote`, { answers });
        return response.data?.data || response.data;
    },
    
    // Создать опрос
    createSurvey: async (data) => {
        const response = await api.post('/surveys', data);
        return response.data?.data || response.data;
    }
};