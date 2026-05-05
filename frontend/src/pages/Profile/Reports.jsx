import React, { useState, useEffect } from 'react';
import { reportService } from '../../services/reportService';
import './Profile.css';

function ReportsTab() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [selectedReport, setSelectedReport] = useState(null);

    useEffect(() => {
        loadReports();
    }, [page]);

    const loadReports = async () => {
        try {
            setLoading(true);
            const response = await reportService.getUserReports(page);
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

    if (loading && page === 1) {
        return <div className="loading">Загрузка жалоб...</div>;
    }

    return (
        <div className="reports-tab">

            {error && <div className="error-message">{error}</div>}

            {reports.length === 0 ? (
                <div className="no-reports">
                    <div className="empty-icon">📋</div>
                    <h3>У вас пока нет жалоб</h3>
                    <p>Вы можете пожаловаться на фанфик, если он нарушает правила сайта</p>
                </div>
            ) : (
                <>
                    <div className="reports-list">
                        {reports.map(report => (
                            <div 
                                key={report.id} 
                                className="report-card"
                                onClick={() => setSelectedReport(report)}
                            >
                                <div className="report-header">
                                    <h3 className="report-title">
                                        {report.fanfic?.title || 'Фанфик удален'}
                                    </h3>
                                    <span className={`status-badge ${getStatusClass(report.status_name)}`}>
                                        {report.status_label}
                                    </span>
                                </div>
                                
                                <p className="report-reason">
                                    {report.reason.length > 100 
                                        ? report.reason.substring(0, 100) + '...' 
                                        : report.reason}
                                </p>
                                
                                <div className="report-footer">
                                    <span className="report-date">
                                        {formatDate(report.created_at)}
                                    </span>
                                    <button className="view-details-btn">
                                        Подробнее →
                                    </button>
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
                                <label>Фанфик:</label>
                                <p className="detail-value">
                                    {selectedReport.fanfic?.title || 'Фанфик удален'}
                                </p>
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
                                    <label>Ответ администратора:</label>
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
        </div>
    );
}

export default ReportsTab;