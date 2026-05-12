import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fanficService } from '../../services/fanficService';
import './Profile.css';

function Drafts() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [drafts, setDrafts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [selectedDrafts, setSelectedDrafts] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [activeFilter, setActiveFilter] = useState(searchParams.get('filter') || 'all');
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        total: 0,
        per_page: 6 
    });

    const loadDrafts = useCallback(async (filter, page = 1) => {
        try {
            setLoading(true);
            const data = await fanficService.getMyFanfics('draft', page, pagination.per_page);
            let draftsData = Array.isArray(data.data) ? data.data : (data || []);
            
            // Применяем дополнительную фильтрацию на клиенте
            if (filter !== 'all') {
                draftsData = draftsData.filter(draft => {
                    switch(filter) {
                        case 'has_tags':
                            return draft.tags && draft.tags.length > 0;
                        case 'no_tags':
                            return !draft.tags || draft.tags.length === 0;
                        case 'has_description':
                            return draft.description && draft.description.length > 50;
                        case 'recent': {
                            const recentDate = new Date();
                            recentDate.setDate(recentDate.getDate() - 7);
                            return new Date(draft.updated_at) > recentDate;
                        }
                        case 'old': {
                            const oldDate = new Date();
                            oldDate.setDate(oldDate.getDate() - 30);
                            return new Date(draft.updated_at) < oldDate;
                        }
                        default:
                            return true;
                    }
                });
            }
            
            setDrafts(draftsData);
            setPagination({
                current_page: data.current_page || 1,
                last_page: data.last_page || 1,
                total: data.total || 0,
                per_page: pagination.per_page
            });
        } catch (error) {
            console.error('Ошибка загрузки черновиков:', error);
            setMessage({ type: 'error', text: 'Не удалось загрузить черновики' });
        } finally {
            setLoading(false);
        }
    }, [pagination.per_page]);

    useEffect(() => {
        loadDrafts(activeFilter, pagination.current_page);
    }, [activeFilter, pagination.current_page, loadDrafts]);

    const handleFilterChange = (filterId) => {
        setActiveFilter(filterId);
        setPagination(prev => ({ ...prev, current_page: 1 }));
        setSearchParams({ tab: 'drafts', filter: filterId });
        setSelectedDrafts([]);
        setSelectAll(false);
    };

    const handlePageChange = (page) => {
        setPagination(prev => ({ ...prev, current_page: page }));
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
        navigate(`/fanfic/${id}`);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Вы уверены, что хотите удалить этот черновик?')) {
            return;
        }
        try {
            await fanficService.deleteFanfic(id);
            await loadDrafts(activeFilter, pagination.current_page);
            setSelectedDrafts(selectedDrafts.filter(draftId => draftId !== id));
            setMessage({ type: 'success', text: 'Черновик успешно удален' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
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
            
            await loadDrafts(activeFilter, pagination.current_page);
            setSelectedDrafts([]);
            setSelectAll(false);
            setMessage({ type: 'success', text: `Удалено ${selectedDrafts.length} черновик(ов)` });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: 'Ошибка удаления черновиков' });
        }
    };

    const handleSubmitForReview = async (id) => {
        try {
            await fanficService.submitForReview(id);
            await loadDrafts(activeFilter, pagination.current_page);
            setSelectedDrafts(selectedDrafts.filter(draftId => draftId !== id));
            setMessage({ type: 'success', text: 'Черновик отправлен на модерацию' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
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
            
            await loadDrafts(activeFilter, pagination.current_page);
            setSelectedDrafts([]);
            setSelectAll(false);
            setMessage({ type: 'success', text: `${selectedDrafts.length} черновик(ов) отправлено на модерацию` });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
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

    const filters = [
        { id: 'all', label: 'Все черновики', count: pagination.total },
        { id: 'has_tags', label: 'С тегами' },
        { id: 'no_tags', label: 'Без тегов' },
        { id: 'has_description', label: 'С описанием' },
        { id: 'recent', label: 'Недавние' },
        { id: 'old', label: 'Старые (>30 дней)' },
    ];

    return (
        <div className="drafts">
            <div className="fanfics-header">
                <button className="create-btn" onClick={handleCreateNew}>
                    + Создать новый
                </button>
            </div>

            {message.text && (
                <div className={`message ${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="fanfics-filters">
                {filters.map(filter => (
                    <button
                        key={filter.id}
                        className={`filter-btn ${activeFilter === filter.id ? 'active' : ''}`}
                        onClick={() => handleFilterChange(filter.id)}
                    >
                        {filter.label}
                        {filter.id === 'all' && (
                            <span className="filter-count"> ({pagination.total})</span>
                        )}
                    </button>
                ))}
            </div>

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
                <>
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
                    
                    {pagination.last_page > 1 && (
                        <div className="pagination-all-table">
                            <button 
                                className="pagination-btn"
                                disabled={pagination.current_page === 1}
                                onClick={() => handlePageChange(pagination.current_page - 1)}
                            >
                                ← Назад
                            </button>
                            <div className="pagination-pages">
                                {[...Array(Math.min(5, pagination.last_page))].map((_, i) => {
                                    let pageNum;
                                    if (pagination.last_page <= 5) {
                                        pageNum = i + 1;
                                    } else if (pagination.current_page <= 3) {
                                        pageNum = i + 1;
                                    } else if (pagination.current_page >= pagination.last_page - 2) {
                                        pageNum = pagination.last_page - 4 + i;
                                    } else {
                                        pageNum = pagination.current_page - 2 + i;
                                    }
                                    
                                    if (pageNum >= 1 && pageNum <= pagination.last_page) {
                                        return (
                                            <button
                                                key={pageNum}
                                                className={`pagination-number ${pagination.current_page === pageNum ? 'active' : ''}`}
                                                onClick={() => handlePageChange(pageNum)}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    }
                                    return null;
                                })}
                            </div>
                            <span className="pagination-info">
                                Страница {pagination.current_page} из {pagination.last_page}
                            </span>
                            <button 
                                className="pagination-btn"
                                disabled={pagination.current_page === pagination.last_page}
                                onClick={() => handlePageChange(pagination.current_page + 1)}
                            >
                                Вперед →
                            </button>
                        </div>
                    )}

                    <div className="drafts-stats">
                        <p>
                            Всего черновиков: <strong>{pagination.total}</strong> | 
                            Выбрано: <strong>{selectedDrafts.length}</strong>
                        </p>
                        <div className="stats-help">
                            <small>💡 Совет: Регулярно сохраняйте черновики и отправляйте готовые работы на модерацию</small>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default Drafts;