// AllFanfics.js
import React, { useState, useEffect, useCallback } from 'react';
import { fanficService } from '../../services/fanficService';
import { useSearchParams } from 'react-router-dom';
import FanfikCards from '../../components/cards/FanfikCards/FanfikCards';
import FiltersPanel from './components/FiltersPanel';
import './AllFanfics.css';

function AllFanfics() {
    const [fanfics, setFanfics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchParams] = useSearchParams();

    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        perPage: 8
    });

    const [filters, setFilters] = useState({
        search: '',
        tags: [],
        rating_id: '',
        work_status: '',
        sort_by: 'created_at',
        sort_order: 'desc'
    });
    
    useEffect(() => {
        const q = searchParams.get('q') || '';

        setFilters(prev => ({
            ...prev,
            search: q
        }));

        setPagination(prev => ({
            ...prev,
            currentPage: 1
        }));
    }, [searchParams]);
    
    const loadFanfics = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            
            const params = {
                page: pagination.currentPage,
                per_page: pagination.perPage,
                q: filters.search || undefined,
                rating: filters.rating_id || undefined,
                status: filters.work_status || undefined,
                sort: filters.sort_by || 'created_at',
                order: filters.sort_order || 'desc',
                tags: filters.tags.length ? filters.tags : undefined
            };

            // Удаляем пустые параметры
            Object.keys(params).forEach(key => {
                if (params[key] === '' || params[key] === undefined || 
                    (Array.isArray(params[key]) && params[key].length === 0)) {
                    delete params[key];
                }
            });

            const response = await fanficService.getPublishedFanfics(params);

            let likedIds = [];
            try {
                const likedResponse = await fanficService.getLikedFanfics();
                likedIds = (likedResponse.data || likedResponse || []).map(f => f.id);
            } catch (e) {
                console.warn('Не удалось загрузить лайкнутые фанфики');
            }
            
            // Обрабатываем ответ от сервера
            const fanficsData = response.data || [];
            const paginationData = {
                current_page: response.current_page || response.currentPage || 1,
                last_page: response.last_page || response.totalPages || 1,
                total: response.total || 0
            };

            const formattedFanfics = fanficsData.map(fanfic => ({
                id: fanfic.id,
                title: fanfic.title,
                author: fanfic.user?.name || 'Аноним',
                authorId: fanfic.user?.id,
                fandom: fanfic.fandom || 'Не указан',
                description: fanfic.description || 'Без описания',
                rating: fanfic.rating?.code || 'Не указан',
                category: 'Фанфик',
                status: fanfic.work_status === 'in_progress' ? 'в процессе' :
                        fanfic.work_status === 'completed' ? 'завершен' : 'заброшен',
                tags: fanfic.tags?.map(tag => tag.name).join(', ') || 'Без тегов',
                likes: fanfic.likes_count ?? fanfic.likes ?? 0,
                views: fanfic.views ?? 0,
                liked: likedIds.includes(fanfic.id),
                cover_image: fanfic.cover_image
                    ? `http://45.147.179.241/storage/${fanfic.cover_image}`
                    : null,
                is_early_access: fanfic.is_early_access || false,
                early_access_until: fanfic.early_access_until,
                is_exclusive: fanfic.is_exclusive || false
            }));

            setFanfics(formattedFanfics);
            setPagination({
                currentPage: paginationData.current_page,
                totalPages: paginationData.last_page,
                totalItems: paginationData.total,
                perPage: pagination.perPage
            });

        } catch (error) {
            console.error('Ошибка загрузки фанфиков:', error);
            setError('Не удалось загрузить фанфики. Пожалуйста, попробуйте позже.');
            setFanfics([]);
        } finally {
            setLoading(false);
        }
    }, [pagination.currentPage, pagination.perPage, filters]);

    useEffect(() => {
        loadFanfics();
    }, [loadFanfics]);

    const handleFilterChange = (newFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    };

    const handleResetFilters = () => {
        setFilters({
            search: '',
            tags: [],
            rating_id: '',
            work_status: '',
            sort_by: 'created_at',
            sort_order: 'desc'
        });
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    };

    const handlePageChange = (page) => {
        setPagination(prev => ({ ...prev, currentPage: page }));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleFanficClick = (card) => {
        window.location.href = `/fanfic/${card.id}`;
    };

    const handleLike = async (fanficId) => {
        try {
            await fanficService.likeFanfic(fanficId);
            setFanfics(prev => prev.map(f => 
                f.id === fanficId ? { ...f, liked: true, likes: f.likes + 1 } : f
            ));
        } catch (error) {
            console.error('Ошибка при лайке:', error);
        }
    };

    const handleUnlike = async (fanficId) => {
        try {
            await fanficService.unlikeFanfic(fanficId);
            setFanfics(prev => prev.map(f => 
                f.id === fanficId ? { ...f, liked: false, likes: f.likes - 1 } : f
            ));
        } catch (error) {
            console.error('Ошибка при удалении лайка:', error);
        }
    };

    // Функция для генерации номеров страниц
    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        let startPage = Math.max(1, pagination.currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(pagination.totalPages, startPage + maxVisible - 1);
        
        if (endPage - startPage + 1 < maxVisible) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }
        return pages;
    };

    return (
        <div className="all-fanfics-page">
            <div className="all-fanfics-container">
                <div className="filters-sidebar">
                    <FiltersPanel 
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        onReset={handleResetFilters}
                    />
                </div>

                <div className="fanfics-content">
                    <div className="fanfics-header">
                        <h1>Все фанфики</h1>
                        {pagination.totalItems > 0 && (
                            <span className="total-count">Найдено: {pagination.totalItems}</span>
                        )}
                    </div>

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="loading">Загрузка фанфиков...</div>
                    ) : fanfics.length === 0 ? (
                        <div className="no-results">
                            <p>Фанфики не найдены</p>
                            <p className="hint">
                                Попробуйте изменить параметры фильтрации
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="fanfics-grid">
                                {fanfics.map(fanfic => (
                                    <div key={fanfic.id} className="fanfic-card-wrapper">
                                        <div className="fanfic-badges">
                                            {fanfic.is_exclusive && (
                                                <span className="premium-badge exclusive-badge" title="Эксклюзивный контент">
                                                    ✧˖°. Эксклюзив
                                                </span>
                                            )}
                                        </div>
                                        <FanfikCards
                                            imageUrl={fanfic.cover_image}
                                            title={fanfic.title}
                                            author={fanfic.author}
                                            authorId={fanfic.authorId}
                                            fandom={fanfic.fandom}
                                            description={fanfic.description}
                                            rating={fanfic.rating}
                                            category={fanfic.category}
                                            showCategory={true}
                                            status={fanfic.status}
                                            tags={fanfic.tags}
                                            likes={fanfic.likes}
                                            liked={fanfic.liked}
                                            views={fanfic.views}
                                            onLikeClick={() => fanfic.liked 
                                                ? handleUnlike(fanfic.id) 
                                                : handleLike(fanfic.id)
                                            }
                                            onClick={() => handleFanficClick(fanfic)}
                                        />
                                    </div>
                                ))}
                            </div>

                            {pagination.totalPages > 1 && (
                                <div className="pagination-all-fanfics">
                                    <button 
                                        className="pagination-btn"
                                        disabled={pagination.currentPage === 1}
                                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                                    >
                                        ← Назад
                                    </button>
                                    
                                    <div className="pagination-pages">
                                        {getPageNumbers().map(pageNum => (
                                            <button
                                                key={pageNum}
                                                className={`pagination-number ${pagination.currentPage === pageNum ? 'active' : ''}`}
                                                onClick={() => handlePageChange(pageNum)}
                                            >
                                                {pageNum}
                                            </button>
                                        ))}
                                    </div>
                                    <button 
                                        className="pagination-btn"
                                        disabled={pagination.currentPage === pagination.totalPages}
                                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                                    >
                                        Вперед →
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AllFanfics;