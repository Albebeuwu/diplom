import React, { useState } from 'react';
import { reportService } from '../../../services/reportService';
import './ReportModal.css';

function ReportModal({ fanficId, fanficTitle, onClose, onSuccess }) {
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!reason.trim()) return;

        setSubmitting(true);
        setError('');

        try {
            await reportService.createReport(fanficId, reason);
            onSuccess?.();
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || 'Ошибка при отправке жалобы');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Пожаловаться на фанфик</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    <p className="fanfic-title-info">
                        Фанфик: <strong>{fanficTitle}</strong>
                    </p>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="reason">Причина жалобы *</label>
                            <textarea
                                id="reason"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Опишите причину жалобы..."
                                rows={5}
                                maxLength={2000}
                                required
                            />
                            <div className="char-counter">
                                {reason.length}/2000
                            </div>
                        </div>

                        {error && <div className="error-message">{error}</div>}

                        <div className="modal-actions">
                            <button 
                                type="button" 
                                className="cancel-btn"
                                onClick={onClose}
                                disabled={submitting}
                            >
                                Отмена
                            </button>
                            <button 
                                type="submit" 
                                className="submit-btn"
                                disabled={submitting || !reason.trim()}
                            >
                                {submitting ? 'Отправка...' : 'Отправить жалобу'}
                            </button>
                        </div>
                    </form>

                    <div className="report-info">
                        <p>
                            <span className="info-icon">ℹ️</span>
                            Ваша жалоба будет рассмотрена администратором. 
                            Вы сможете отслеживать статус жалобы в своем профиле.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ReportModal;