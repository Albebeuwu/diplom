import React, { useState, useEffect } from 'react';
import { reportService } from '../../../services/reportService';
import './ReportsManagement.css';

function ReportsManagement() {
    const [reports, setReports] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('pending');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [selectedReport, setSelectedReport] = useState(null);
    const [actionModal, setActionModal] = useState({ show: false, type: null, report: null });
    const [actionData, setActionData] = useState({ action: 'warn', reason: '' });

    useEffect(() => {
        loadStats();
        loadReports();
    }, [filter, search, page]);

    const loadStats = async () => {
        try {
            const data = await reportService.admin.getReportStats();
            setStats(data);
        } catch (err) {
            console.error('Ошибка загрузки статистики:', err);
        }
    };

    const loadReports = async () => {
        try {
            setLoading(true);
            const params = {
                status: filter !== 'all' ? filter : undefined,
                search: search || undefined,
                page
            };
            const response = await reportService.admin.getAllReports(params);
            const newReports = response.data.data;
            
            if (page === 1) {
                setReports(newReports);
            } else {
                setReports(prev => [...prev, ...newReports]);
            }
            
            setHasMore(response.data.current_page < response.data.last_page);
        } catch (err) {
            setError('Ошибка загрузки жалоб');
            console.error('Ошибка:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        loadReports();
    };

    const handleFilterChange = (newFilter) => {
        setFilter(newFilter);
        setPage(1);
    };

    const openActionModal = (type, report) => {
        setActionModal({ show: true, type, report });
        setActionData({ action: 'warn', reason: '' });
    };

    const closeActionModal = () => {
        setActionModal({ show: false, type: null, report: null });
        setActionData({ action: 'warn', reason: '' });
    };

    const handleApprove = async () => {
        try {
            await reportService.admin.approveReport(
                actionModal.report.id, 
                actionData.action, 
                actionData.reason
            );
            await loadReports();
            await loadStats();
            closeActionModal();
        } catch (err) {
            setError('Ошибка при одобрении жалобы');
            console.error('Ошибка:', err);
        }
    };

    const handleReject = async () => {
        if (!actionData.reason.trim()) {
            setError('Укажите причину отклонения');
            return;
        }

        try {
            await reportService.admin.rejectReport(
                actionModal.report.id, 
                actionData.reason
            );
            await loadReports();
            await loadStats();
            closeActionModal();
        } catch (err) {
            setError('Ошибка при отклонении жалобы');
            console.error('Ошибка:', err);
        }
    };

    const getStatusClass = (statusName) => {
        switch (statusName) {
            case 'approved': return 'status-approved';
            case 'rejected': return 'status-rejected';
            default: return 'status-pending';
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="reports-management">
            <h2>Управление жалобами</h2>

            {/* Фильтры и поиск */}
            <div className="filters-section">
                <div className="filter-buttons">
                    <button 
                        className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => handleFilterChange('all')}
                    >
                        Все
                    </button>
                    <button 
                        className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
                        onClick={() => handleFilterChange('pending')}
                    >
                        На рассмотрении
                    </button>
                    <button 
                        className={`filter-btn ${filter === 'approved' ? 'active' : ''}`}
                        onClick={() => handleFilterChange('approved')}
                    >
                        Принятые
                    </button>
                    <button 
                        className={`filter-btn ${filter === 'rejected' ? 'active' : ''}`}
                        onClick={() => handleFilterChange('rejected')}
                    >
                        Отклоненные
                    </button>
                </div>

                <form onSubmit={handleSearch} className="search-form">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Поиск по названию или причине..."
                        className="search-input"
                    />
                    <button type="submit" className="search-btn">Поиск</button>
                </form>
            </div>

            {error && <div className="error-message">{error}</div>}

            {/* Список жалоб */}
            {loading && page === 1 ? (
                <div className="loading">Загрузка жалоб...</div>
            ) : reports.length === 0 ? (
                <div className="no-reports">
                    <p>Жалоб не найдено</p>
                </div>
            ) : (
                <>
                    <div className="reports-table">
                        <div className="table-header">
                            <div className="col-date">Дата</div>
                            <div className="col-user">Пользователь</div>
                            <div className="col-fanfic">Фанфик</div>
                            <div className="col-reason">Причина</div>
                            <div className="col-status">Статус</div>
                            <div className="col-actions">Действия</div>
                        </div>

                        {reports.map(report => (
                            <div key={report.id} className="table-row">
                                <div className="col-date">{formatDate(report.created_at)}</div>
                                <div className="col-user">
                                    <div className="user-info">
                                        <span className="user-name">{report.user?.name}</span>
                                        <span className="user-email">{report.user?.email}</span>
                                    </div>
                                </div>
                                <div className="col-fanfic">
                                    <div className="fanfic-info">
                                        <span className="fanfic-title-admin">{report.fanfic?.title}</span>
                                        <span className="fanfic-author">Автор: {report.fanfic?.user?.name}</span>
                                    </div>
                                </div>
                                <div className="col-reason">
                                    <div className="reason-preview">
                                        {report.reason.length > 50 
                                            ? report.reason.substring(0, 50) + '...' 
                                            : report.reason}
                                    </div>
                                </div>
                                <div className="col-status">
                                    <span className={`status-badge ${getStatusClass(report.status_name)}`}>
                                        {report.status_label}
                                    </span>
                                </div>
                                <div className="col-actions">
                                    <button 
                                        className="view-btn"
                                        onClick={() => setSelectedReport(report)}
                                    >
                                        👁️
                                    </button>
                                    {report.status_name === 'pending' && (
                                        <>
                                            <button 
                                                className="approve-btn"
                                                onClick={() => openActionModal('approve', report)}
                                            >
                                                ✓
                                            </button>
                                            <button 
                                                className="reject-btn"
                                                onClick={() => openActionModal('reject', report)}
                                            >
                                                ✗
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {hasMore && (
                        <button 
                            className="load-more-btn"
                            onClick={() => setPage(p => p + 1)}
                            disabled={loading}
                        >
                            {loading ? 'Загрузка...' : 'Загрузить ещё'}
                        </button>
                    )}
                </>
            )}

            {/* Модальное окно с деталями жалобы */}
            {selectedReport && (
                <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Детали жалобы</h3>
                            <button className="close-btn" onClick={() => setSelectedReport(null)}>×</button>
                        </div>
                        
                        <div className="modal-body">
                            <div className="detail-group">
                                <label>Пользователь:</label>
                                <p className="detail-value">{selectedReport.user?.name} ({selectedReport.user?.email})</p>
                            </div>

                            <div className="detail-group">
                                <label>Фанфик:</label>
                                <p className="detail-value">{selectedReport.fanfic?.title}</p>
                                <p className="detail-sub">Автор: {selectedReport.fanfic?.user?.name}</p>
                            </div>

                            <div className="detail-group">
                                <label>Статус:</label>
                                <span className={`status-badge ${getStatusClass(selectedReport.status_name)}`}>
                                    {selectedReport.status_label}
                                </span>
                            </div>

                            <div className="detail-group">
                                <label>Дата отправки:</label>
                                <p className="detail-value">{formatDate(selectedReport.created_at)}</p>
                            </div>

                            <div className="detail-group">
                                <label>Причина жалобы:</label>
                                <p className="detail-value reason-text">{selectedReport.reason}</p>
                            </div>

                            {selectedReport.admin_comment && (
                                <div className="detail-group admin-comment">
                                    <label>Комментарий администратора:</label>
                                    <p className="detail-value">{selectedReport.admin_comment}</p>
                                </div>
                            )}
                        </div>
                        
                        <div className="modal-footer">
                            <button 
                                className="close-modal-btn"
                                onClick={() => setSelectedReport(null)}
                            >
                                Закрыть
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Модальное окно для действий с жалобой */}
            {actionModal.show && (
                <div className="modal-overlay" onClick={closeActionModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>
                                {actionModal.type === 'approve' ? 'Одобрение жалобы' : 'Отклонение жалобы'}
                            </h3>
                            <button className="close-btn" onClick={closeActionModal}>×</button>
                        </div>
                        
                        <div className="modal-body">
                            <p className="modal-info">
                                {actionModal.type === 'approve' 
                                    ? 'Вы собираетесь одобрить жалобу на фанфик:'
                                    : 'Вы собираетесь отклонить жалобу на фанфик:'}
                            </p>
                            <p className="modal-highlight">{actionModal.report?.fanfic?.title}</p>

                            {actionModal.type === 'approve' ? (
                                <div className="form-group">
                                    <label>Действие с фанфиком:</label>
                                    <select 
                                        value={actionData.action}
                                        onChange={(e) => setActionData({...actionData, action: e.target.value})}
                                        className="action-select"
                                    >
                                        <option value="warn">Отправить предупреждение автору</option>
                                        <option value="block">Заблокировать фанфик</option>
                                        <option value="delete">Удалить фанфик</option>
                                    </select>
                                </div>
                            ) : (
                                <div className="form-group">
                                    <label htmlFor="rejectReason">Причина отклонения *</label>
                                    <textarea
                                        id="rejectReason"
                                        value={actionData.reason}
                                        onChange={(e) => setActionData({...actionData, reason: e.target.value})}
                                        placeholder="Укажите причину отклонения жалобы..."
                                        rows={4}
                                        required
                                    />
                                </div>
                            )}

                            <div className="form-group">
                                <label>Комментарий для пользователя:</label>
                                <textarea
                                    value={actionData.reason}
                                    onChange={(e) => setActionData({...actionData, reason: e.target.value})}
                                    placeholder="Напишите комментарий для пользователя..."
                                    rows={3}
                                />
                            </div>
                        </div>
                        
                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={closeActionModal}>
                                Отмена
                            </button>
                            <button 
                                className={actionModal.type === 'approve' ? 'confirm-approve-btn' : 'confirm-reject-btn'}
                                onClick={actionModal.type === 'approve' ? handleApprove : handleReject}
                                disabled={actionModal.type === 'reject' && !actionData.reason.trim()}
                            >
                                {actionModal.type === 'approve' ? 'Одобрить' : 'Отклонить'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ReportsManagement;