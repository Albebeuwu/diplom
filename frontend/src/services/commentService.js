import api from './api';

export const commentService = {
    // Получить комментарии для фанфика
    getComments: (fanficId, page = 1) => 
        api.get(`/fanfics/${fanficId}/comments?page=${page}`),

    // Добавить комментарий
    addComment: (fanficId, content) => 
        api.post(`/fanfics/${fanficId}/comments`, { content }),

    // Обновить комментарий
    updateComment: (commentId, content) => 
        api.put(`/comments/${commentId}`, { content }),

    // Удалить комментарий
    deleteComment: (commentId) => 
        api.delete(`/comments/${commentId}`),
};