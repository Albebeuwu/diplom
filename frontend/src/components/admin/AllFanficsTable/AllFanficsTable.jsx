import React, { useState, useEffect } from 'react';
import { fanficService } from '../../../services/fanficService';
import './AllFanficsTable.css';

function AllFanficsTable() {
    const [fanfics, setFanfics] = useState([]);
    const [pagination, setPagination] = useState({});
    const [filters, setFilters] = useState({
        search: '',
        status: '',
        rating_id: '',
        tags: []
    });
    const [sort, setSort] = useState({ field: 'created_at', order: 'desc' });
    const [loading, setLoading] = useState(true);
    const [tags, setTags] = useState([]);
    const [ratings, setRatings] = useState([]);

    useEffect(() => {
        loadFilters();
        loadFanfics();
    }, []);

    const loadFilters = async () => {
        try {
            const [tagsData, ratingsData] = await Promise.all([
                fanficService.getTags(),
                fanficService.getRatings()
            ]);
            setTags(tagsData);
            setRatings(ratingsData);
        } catch (err) {
            console.error('Ошибка загрузки фильтров:', err);
        }
    };

    const loadFanfics = async (page = 1) => {
        setLoading(true);
        try {
            const params = {
                page,
                per_page: 20,
                sort: sort.field,
                order: sort.order,
                ...filters
            };
            // Убираем пустые значения
            Object.keys(params).forEach(key => {
                if (!params[key] && params[key] !== 0) delete params[key];
            });
            
            const response = await fanficService.admin.getAllFanfics(page, 20, params);
            setFanfics(response.data);
            setPagination({
                current_page: response.current_page,
                last_page: response.last_page,
                total: response.total
            });
        } catch (err) {
            console.error('Ошибка загрузки фанфиков:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, title) => {
        if (!window.confirm(`Вы уверены, что хотите удалить фанфик "${title}"?`)) return;
        try {
            await fanficService.admin.deleteFanfic(id);
            setFanfics(fanfics.filter(f => f.id !== id));
            alert('Фанфик удалён');
        } catch (err) {
            alert('Ошибка удаления: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleSort = (field) => {
        setSort(prev => ({
            field,
            order: prev.field === field && prev.order === 'desc' ? 'asc' : 'desc'
        }));
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const applyFilters = () => {
        loadFanfics(1);
    };

    const resetFilters = () => {
        setFilters({ search: '', status: '', rating_id: '', tags: [] });
        loadFanfics(1);
    };

    if (loading && !fanfics.length) return <div className="loading">Загрузка...</div>;

    return (
        <div className="all-fanfics-table">
            {/* Фильтры */}
            <div className="filters-panel">
                <input
                    type="text"
                    placeholder="Поиск..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                />
                <select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}>
                    <option value="">Все статусы</option>
                    <option value="draft">Черновик</option>
                    <option value="pending">На модерации</option>
                    <option value="approved">Одобрен</option>
                    <option value="rejected">Отклонён</option>
                </select>
                <select value={filters.rating_id} onChange={(e) => handleFilterChange('rating_id', e.target.value)}>
                    <option value="">Все рейтинги</option>
                    {ratings.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <select 
                    multiple 
                    value={filters.tags} 
                    onChange={(e) => {
                        const values = Array.from(e.target.selectedOptions, opt => opt.value);
                        handleFilterChange('tags', values);
                    }}
                >
                    {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <button onClick={applyFilters}>Применить</button>
                <button onClick={resetFilters}>Сбросить</button>
            </div>

            {/* Таблица */}
            <table className="fanfics-table">
                <thead>
                    <tr>
                        <th onClick={() => handleSort('id')}>ID {sort.field === 'id' && (sort.order === 'desc' ? '↓' : '↑')}</th>
                        <th onClick={() => handleSort('title')}>Название {sort.field === 'title' && (sort.order === 'desc' ? '↓' : '↑')}</th>
                        <th>Автор</th>
                        <th onClick={() => handleSort('status')}>Статус {sort.field === 'status' && (sort.order === 'desc' ? '↓' : '↑')}</th>
                        <th onClick={() => handleSort('views')}>Просмотры {sort.field === 'views' && (sort.order === 'desc' ? '↓' : '↑')}</th>
                        <th onClick={() => handleSort('created_at')}>Дата {sort.field === 'created_at' && (sort.order === 'desc' ? '↓' : '↑')}</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
                    {fanfics.map(fanfic => (
                        <tr key={fanfic.id}>
                            <td>{fanfic.id}</td>
                            <td>{fanfic.title}</td>
                            <td>{fanfic.user?.name || '—'}</td>
                            <td>
                                <span className={`status-badge ${fanfic.status}`}>
                                    {fanfic.status === 'pending' && fanfic.previously_approved ? 'Повторная модерация' : fanfic.status}
                                </span>
                            </td>
                            <td>{fanfic.views || 0}</td>
                            <td>{new Date(fanfic.created_at).toLocaleDateString()}</td>
                            <td>
                                <a href={`/fanfic/${fanfic.id}`} target="_blank" rel="noopener">👁️</a>
                                <button onClick={() => handleDelete(fanfic.id, fanfic.title)} className="delete-btn">🗑️</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Пагинация */}
            {pagination.last_page > 1 && (
                <div className="pagination-all-table">
                    <button 
                        disabled={pagination.current_page === 1}
                        onClick={() => loadFanfics(pagination.current_page - 1)}
                    >← Назад</button>
                    <span>Страница {pagination.current_page} из {pagination.last_page}</span>
                    <button 
                        disabled={pagination.current_page === pagination.last_page}
                        onClick={() => loadFanfics(pagination.current_page + 1)}
                    >Вперёд →</button>
                </div>
            )}
        </div>
    );
}

export default AllFanficsTable;