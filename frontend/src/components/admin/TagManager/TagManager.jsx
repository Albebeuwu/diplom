import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import './TagManager.css';

function TagManager() {
    const [tags, setTags] = useState([]);
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        total: 0,
        per_page: 20
    });
    const [newTag, setNewTag] = useState({ name: '', slug: '', category: '', description: '' });
    const [editingTag, setEditingTag] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({ search: '', category: '' });

    // Доступные категории с русскими названиями
    const categoryOptions = [
        { value: '', label: 'Все категории' },
        { value: 'genre', label: 'Жанр' },
        { value: 'theme', label: 'Тема' },
        { value: 'content_warning', label: 'Предупреждение' }
    ];

    // Функция для получения русского названия категории
    const getCategoryLabel = (categoryValue) => {
        if (!categoryValue) return '—';
        const option = categoryOptions.find(opt => opt.value === categoryValue);
        return option ? option.label : categoryValue;
    };

    const loadTags = async (page = 1) => {
        setLoading(true);
        try {
            const params = {
                page,
                per_page: pagination.per_page,
                ...filters
            };
            // Убираем пустые фильтры
            Object.keys(params).forEach(key => {
                if (!params[key] && params[key] !== 0) delete params[key];
            });
            
            const response = await api.get('/admin/tags', { params });
            setTags(response.data.data);
            setPagination({
                current_page: response.data.current_page,
                last_page: response.data.last_page,
                total: response.data.total,
                per_page: response.data.per_page
            });
        } catch (err) {
            setError('Ошибка загрузки тегов: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadTags(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            if (editingTag) {
                await api.put(`/admin/tags/${editingTag.id}`, newTag);
            } else {
                await api.post('/admin/tags', newTag);
            }
            setNewTag({ name: '', slug: '', category: '', description: '' });
            setEditingTag(null);
            loadTags(pagination.current_page);
        } catch (err) {
            setError(err.response?.data?.message || 'Ошибка сохранения');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Удалить этот тег?')) return;
        try {
            await api.delete(`/admin/tags/${id}`);
            loadTags(pagination.current_page);
        } catch (err) {
            alert(err.response?.data?.error || 'Ошибка удаления');
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const applyFilters = () => {
        loadTags(1);
    };

    const resetFilters = () => {
        setFilters({ search: '', category: '' });
        loadTags(1);
    };

    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        let start = Math.max(1, pagination.current_page - Math.floor(maxVisible / 2));
        let end = Math.min(pagination.last_page, start + maxVisible - 1);
        
        if (end - start < maxVisible - 1) {
            start = Math.max(1, end - maxVisible + 1);
        }
        
        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        return pages;
    };

    return (
        <div className="tag-manager">
            <h3>Управление тегами</h3>
            {error && <div className="error">{error}</div>}
            
            {/* Форма создания/редактирования */}
            <form onSubmit={handleSubmit} className="tag-form">
                <input 
                    className='tag-input'
                    placeholder="Название тега *" 
                    value={newTag.name}
                    onChange={e => setNewTag({...newTag, name: e.target.value})}
                    required
                />
                <input 
                    placeholder="Slug (авто, если пусто)" 
                    value={newTag.slug}
                    onChange={e => setNewTag({...newTag, slug: e.target.value})}
                />
                <select 
                    value={newTag.category}
                    onChange={e => setNewTag({...newTag, category: e.target.value})}
                >
		    <option value={''}>Выберите категорию</option>
                    {categoryOptions.slice(1).map(option => ( 
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <textarea 
                    placeholder="Описание" 
                    value={newTag.description}
                    onChange={e => setNewTag({...newTag, description: e.target.value})}
                />
                <button type="submit" disabled={loading}>
                    {editingTag ? '💾 Обновить' : '✨ Создать'} тег
                </button>
                {editingTag && (
                    <button type="button" onClick={() => {
                        setEditingTag(null);
                        setNewTag({ name: '', slug: '', category: '', description: '' });
                    }}>✕ Отмена</button>
                )}
            </form>

            {/* Фильтры */}
            <div className="tag-filters">
                <input
                    type="text"
                    placeholder="🔍 Поиск по названию..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && applyFilters()}
                />
                <select 
                    value={filters.category}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                >
                    {categoryOptions.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <button onClick={applyFilters}>🔎 Найти</button>
                <button onClick={resetFilters}>🔄 Сброс</button>
            </div>

            {/* Таблица тегов */}
            {loading && !tags.length ? (
                <div className="loading">Загрузка...</div>
            ) : (
                <>
                    <table className="tags-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Название</th>
                                <th>Slug</th>
                                <th>Категория</th>
                                <th>Использований</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tags.map(tag => (
                                <tr key={tag.id} className={editingTag?.id === tag.id ? 'editing' : ''}>
                                    <td>{tag.id}</td>
                                    <td className="tag-name">{tag.name}</td>
                                    <td className="tag-slug">{tag.slug}</td>
                                    <td>
                                        {tag.category ? (
                                            <span className="category-badge">{getCategoryLabel(tag.category)}</span>
                                        ) : '—'}
                                    </td>
                                    <td className="usage-count">
                                        <span className={`usage-badge ${tag.fanfics_count > 0 ? 'used' : 'unused'}`}>
                                            {tag.fanfics_count}
                                        </span>
                                    </td>
                                    <td className="actions">
                                        <button 
                                            className="action-btn edit"
                                            onClick={() => {
                                                setEditingTag(tag);
                                                setNewTag(tag);
                                            }}
                                            title="Редактировать"
                                        >✏️</button>
                                        <button 
                                            className="action-btn delete"
                                            onClick={() => handleDelete(tag.id)}
                                            title="Удалить"
                                            disabled={tag.fanfics_count > 0}
                                        >🗑️</button>
                                     </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Пагинация */}
                    {pagination.last_page > 1 && (
                        <div className="pagination">
                            <button 
                                className="page-btn"
                                onClick={() => loadTags(1)}
                                disabled={pagination.current_page === 1}
                                title="Первая страница"
                            >«</button>
                            <button 
                                className="page-btn"
                                onClick={() => loadTags(pagination.current_page - 1)}
                                disabled={pagination.current_page === 1}
                                title="Назад"
                            >‹</button>
                            
                            {getPageNumbers().map(page => (
                                <button
                                    key={page}
                                    className={`page-btn ${page === pagination.current_page ? 'active' : ''}`}
                                    onClick={() => loadTags(page)}
                                >{page}</button>
                            ))}
                            
                            <button 
                                className="page-btn"
                                onClick={() => loadTags(pagination.current_page + 1)}
                                disabled={pagination.current_page === pagination.last_page}
                                title="Вперёд"
                            >›</button>
                            <button 
                                className="page-btn"
                                onClick={() => loadTags(pagination.last_page)}
                                disabled={pagination.current_page === pagination.last_page}
                                title="Последняя страница"
                            >»</button>
                            
                            <span className="page-info">
                                Стр. {pagination.current_page} из {pagination.last_page} 
                                ({pagination.total} тегов)
                            </span>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default TagManager;