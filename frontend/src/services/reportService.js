import api from './api';

export const reportService = {
    // Для пользователей
    getUserReports: (page = 1) => 
        api.get(`/my-reports?page=${page}`),

    createReport: (fanficId, reason) => 
        api.post(`/fanfics/${fanficId}/reports`, { reason }),

    getReportDetails: (reportId) => 
        api.get(`/reports/${reportId}`),

    // Для админов
    admin: {
        getAllReports: (params = {}) => 
            api.get('/admin/reports', { params }),

        getReportStats: () => 
            api.get('/admin/reports/stats'),

        getReportDetails: (reportId) => 
            api.get(`/admin/reports/${reportId}`),

        approveReport: (reportId, action, adminNote = '') => 
            api.post(`/admin/reports/${reportId}/approve`, { action, admin_note: adminNote }),

        rejectReport: (reportId, reason) => 
            api.post(`/admin/reports/${reportId}/reject`, { reason }),
    }
};