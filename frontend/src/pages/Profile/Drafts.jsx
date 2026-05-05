import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fanficService } from '../../services/fanficService';
import './Profile.css';

function Drafts() {
    const navigate = useNavigate();
    const [drafts, setDrafts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [selectedDrafts, setSelectedDrafts] = useState([]);
    const [selectAll, setSelectAll] = useState(false);

    useEffect(() => {
        loadDrafts();
    }, []);

    const loadDrafts = async () => {
        try {
            setLoading(true);
            const data = await fanficService.getMyFanfics('draft');
            setDrafts(Array.isArray(data.data) ? data.data : (data || []));
        } catch (error) {
            console.error('Ошибка загрузки черновиков:', error);
            setMessage({ type: 'error', text: 'Не удалось загрузить черновики' });
        } finally {
            setLoading(false);
        }
    };

    const handleSelectDraft = (id) => {
        setSelectedDrafts(prev =>
            prev.includes(id)
                ? prev.filter(draftId => draftId !== id)
                : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedDrafts([]);
        } else {
            setSelectedDrafts(drafts.map(draft => draft.id));
        }
        setSelectAll(!selectAll);
    };

    const handleEdit = (id) => {
        navigate(`/fanfic/${id}/edit`);
    };

    const handleView = (id) => {
        // Используем маршрут для чтения фанфика
        navigate(`/fanfic/${id}`);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Вы уверены, что хотите удалить этот черновик?')) {
            return;
        }
        try {
            await fanficService.deleteFanfic(id);
            setDrafts(drafts.filter(d => d.id !== id));
            setSelectedDrafts(selectedDrafts.filter(draftId => draftId !== id));
            setMessage({ type: 'success', text: 'Черновик успешно удален' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Ошибка удаления черновика' });
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedDrafts.length === 0) {
            setMessage({ type: 'error', text: 'Выберите черновики для удаления' });
            return;
        }

        if (!window.confirm(`Вы уверены, что хотите удалить ${selectedDrafts.length} черновик(ов)?`)) {
            return;
        }

        try {
            const deletePromises = selectedDrafts.map(id => fanficService.deleteFanfic(id));
            await Promise.all(deletePromises);
            
            setDrafts(drafts.filter(d => !selectedDrafts.includes(d.id)));
            setSelectedDrafts([]);
            setSelectAll(false);
            setMessage({ type: 'success', text: `Удалено ${selectedDrafts.length} черновик(ов)` });
        } catch (error) {
            setMessage({ type: 'error', text: 'Ошибка удаления черновиков' });
        }
    };

    const handleSubmitForReview = async (id) => {
        try {
            await fanficService.submitForReview(id);
            setDrafts(drafts.filter(d => d.id !== id));
            setSelectedDrafts(selectedDrafts.filter(draftId => draftId !== id));
            setMessage({ type: 'success', text: 'Черновик отправлен на модерацию' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Ошибка отправки на модерацию' });
        }
    };

    const handleSubmitSelected = async () => {
        if (selectedDrafts.length === 0) {
            setMessage({ type: 'error', text: 'Выберите черновики для отправки' });
            return;
        }

        try {
            const submitPromises = selectedDrafts.map(id => fanficService.submitForReview(id));
            await Promise.all(submitPromises);
            
            setDrafts(drafts.filter(d => !selectedDrafts.includes(d.id)));
            setSelectedDrafts([]);
            setSelectAll(false);
            setMessage({ type: 'success', text: `${selectedDrafts.length} черновик(ов) отправлено на модерацию` });
        } catch (error) {
            setMessage({ type: 'error', text: 'Ошибка отправки черновиков' });
        }
    };

    const handleCreateNew = () => {
        navigate('/create-fanfic');
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Неизвестно';
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const truncateText = (text, maxLength = 150) => {
        if (!text) return 'Нет описания';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    return (
        <div className="drafts">
            <div className="drafts-header">
                <button className="create-btn" onClick={handleCreateNew}>
                    + Создать новый
                </button>
            </div>

            {message.text && (
                <div className={`message ${message.type}`}>
                    {message.text}
                </div>
            )}

            {drafts.length > 0 && (
                <div className="drafts-actions">
                    <div className="select-all">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={selectAll}
                                onChange={handleSelectAll}
                                className="checkbox-input"
                            />
                            <span className="checkbox-text">
                                Выбрать все ({drafts.length})
                            </span>
                        </label>
                    </div>
                    
                    <div className="bulk-actions">
                        <button 
                            className="bulk-btn submit"
                            onClick={handleSubmitSelected}
                            disabled={selectedDrafts.length === 0}
                        >
                            Отправить выбранное ({selectedDrafts.length})
                        </button>
                        <button 
                            className="bulk-btn delete"
                            onClick={handleDeleteSelected}
                            disabled={selectedDrafts.length === 0}
                        >
                            Удалить выбранное ({selectedDrafts.length})
                        </button>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="loading">Загрузка черновиков...</div>
            ) : drafts.length === 0 ? (
                <div className="no-drafts">
                    <div className="empty-state-no-drafts">
                        <div className="empty-icon">📄</div>
                        <h3>Нет черновиков</h3>
                        <p>Создайте свой первый фанфик или сохраните текущую работу как черновик</p>
                        <button className="create-btn" onClick={handleCreateNew}>
                            Создать фанфик
                        </button>
                    </div>
                </div>
            ) : (
                <div className="drafts-list">
                    {drafts.map(draft => (
                        <div key={draft.id} className="draft-card">
                            <div className="draft-header">
                                <label className="draft-select">
                                    <input
                                        type="checkbox"
                                        checked={selectedDrafts.includes(draft.id)}
                                        onChange={() => handleSelectDraft(draft.id)}
                                        className="checkbox-input"
                                    />
                                </label>
                                
                                <div className="draft-title-section">
                                    <h3 
                                        onClick={() => handleView(draft.id)} 
                                        className="draft-title clickable"
                                    >
                                        {draft.title || 'Без названия'}
                                    </h3>
                                    <div className="draft-meta">
                                        <span className="meta-item">
                                            <strong>Обновлен:</strong> {formatDate(draft.updated_at)}
                                        </span>
                                        <span className="meta-item">
                                            <strong>Слов:</strong> {draft.words_count || 0}
                                        </span>
                                        <span className="meta-item">
                                            <strong>Размер:</strong> {draft.file_size ? Math.round(draft.file_size / 1024) : 0} КБ
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="draft-content">
                                <p className="draft-description">
                                    {truncateText(draft.description)}
                                </p>
                                
                                {draft.tags && draft.tags.length > 0 && (
                                    <div className="draft-tags">
                                        {draft.tags.slice(0, 3).map(tag => (
                                            <span key={tag.id} className="tag">
                                                {tag.name}
                                            </span>
                                        ))}
                                        {draft.tags.length > 3 && (
                                            <span className="tag-more">+{draft.tags.length - 3}</span>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="draft-actions">
                                <button 
                                    className="action-btn edit"
                                    onClick={() => handleEdit(draft.id)}
                                >
                                    Редактировать
                                </button>
                                <button 
                                    className="action-btn submit"
                                    onClick={() => handleSubmitForReview(draft.id)}
                                >
                                    Отправить на модерацию
                                </button>
                                <button 
                                    className="action-btn preview"
                                    onClick={() => handleView(draft.id)}
                                >
                                    Просмотреть
                                </button>
                                <button 
                                    className="action-btn delete"
                                    onClick={() => handleDelete(draft.id)}
                                >
                                    Удалить
                                </button>
                            </div>

                            <div className="draft-footer">
                                <span className="draft-info">
                                    Создан: {formatDate(draft.created_at)}
                                </span>
                                {draft.fandom && (
                                    <span className="draft-fandom">
                                        Фэндом: {draft.fandom}
                                    </span>
                                )}
                                {draft.file_type && (
                                    <span className="draft-format">
                                        Формат: {draft.file_type.toUpperCase()}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {drafts.length > 0 && (
                <div className="drafts-stats">
                    <p>
                        Всего черновиков: <strong>{drafts.length}</strong> | 
                        Выбрано: <strong>{selectedDrafts.length}</strong> 
                    </p>
                    <div className="stats-help">
                        <small>💡 Совет: Регулярно сохраняйте черновики и отправляйте готовые работы на модерацию</small>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Drafts;