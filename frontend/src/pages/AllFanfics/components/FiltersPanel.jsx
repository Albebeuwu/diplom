import React, { useState, useEffect } from 'react';
import { fanficService } from '../../../services/fanficService';
import './FiltersPanel.css';

function FiltersPanel({ filters, onFilterChange, onReset }) {
    const [tags, setTags] = useState([]);
    const [ratings, setRatings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSticky, setIsSticky] = useState(false);
    const [selectedTags, setSelectedTags] = useState(filters.tags || []);

    // Загрузка данных для фильтров
    useEffect(() => {
        const loadFilterData = async () => {
            try {
                const [tagsData, ratingsData] = await Promise.all([
                    fanficService.getTags(),
                    fanficService.getRatings()
                ]);

                setTags(tagsData.data || tagsData || []);
                setRatings(ratingsData.data || ratingsData || []);
            } catch (error) {
                console.error('Ошибка загрузки данных для фильтров:', error);
            } finally {
                setLoading(false);
            }
        };

        loadFilterData();
    }, []);

    // Обработка sticky при скролле
    useEffect(() => {
        const handleScroll = () => {
            const offset = window.scrollY;
            setIsSticky(offset > 100);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        setSelectedTags(filters.tags || []);
    }, [filters.tags]);


    // Обработчик изменения тегов
    const handleTagChange = (tagId) => {
        let newTags;
        if (selectedTags.includes(tagId)) {
            newTags = selectedTags.filter(id => id !== tagId);
        } else {
            newTags = [...selectedTags, tagId];
        }
        setSelectedTags(newTags);
        onFilterChange({ tags: newTags });
    };

    // Обработчик изменения рейтинга
    const handleRatingChange = (e) => {
        onFilterChange({ rating_id: e.target.value });
    };

    // Обработчик изменения статуса
    const handleStatusChange = (e) => {
        onFilterChange({ work_status: e.target.value });
    };

    // Обработчик изменения сортировки
    const handleSortChange = (e) => {
        const [sort_by, sort_order] = e.target.value.split(':');
        onFilterChange({ sort_by, sort_order });
    };

    // Обработчик сброса
    const handleReset = () => {
        setSelectedTags([]);
        onReset();
    };

    if (loading) {
        return <div className="filters-loading">Загрузка фильтров...</div>;
    }

    return (
        <div className={`filters-panel ${isSticky ? 'sticky' : ''}`}>
            <div className="filters-header">
                <h3>Фильтры</h3>
                <button className="reset-button" onClick={handleReset}>
                    Сбросить все
                </button>
            </div>

            {/* Рейтинг */}
            <div className="filter-section">
                <label className="filter-label">Рейтинг</label>
                <select 
                    className="filter-select"
                    value={filters.rating_id || ''}
                    onChange={handleRatingChange}
                >
                    <option value="">Все рейтинги</option>
                    {ratings.map(rating => (
                        <option key={rating.id} value={rating.id}>
                            {rating.code} - {rating.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Статус работы */}
            <div className="filter-section">
                <label className="filter-label">Статус работы</label>
                <select 
                    className="filter-select"
                    value={filters.work_status || ''}
                    onChange={handleStatusChange}
                >
                    <option value="">Все статусы</option>
                    <option value="in_progress">В процессе</option>
                    <option value="completed">Завершен</option>
                    <option value="abandoned">Заброшен</option>
                </select>
            </div>

            {/* Сортировка */}
            <div className="filter-section">
                <label className="filter-label">Сортировка</label>
                <select 
                    className="filter-select"
                    value={`${filters.sort_by || 'created_at'}:${filters.sort_order || 'desc'}`}
                    onChange={handleSortChange}
                >
                    <option value="created_at:desc">Сначала новые</option>
                    <option value="created_at:asc">Сначала старые</option>
                    <option value="likes_count:desc">По популярности</option>
                    <option value="title:asc">По названию (А-Я)</option>
                    <option value="title:desc">По названию (Я-А)</option>
                </select>
            </div>

            {/* Теги */}
            <div className="filter-section">
                <label className="filter-label">Метки</label>
                <div className="tags-filter">
                    {tags.length > 0 ? (
                        tags.map(tag => (
                            <label key={tag.id} className="tag-checkbox">
                                <input
                                    type="checkbox"
                                    checked={selectedTags.includes(tag.id)}
                                    onChange={() => handleTagChange(tag.id)}
                                />
                                <span>{tag.name}</span>
                            </label>
                        ))
                    ) : (
                        <p className="no-tags">Нет доступных меток</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default FiltersPanel;