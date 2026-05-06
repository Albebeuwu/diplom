// AllFanfics.js - исправленная версия
import React, { useState, useEffect, useCallback } from 'react';
import { fanficService } from '../../services/fanficService';
import { useSearchParams } from 'react-router-dom';
import FanfikCards from '../../components/cards/FanfikCards/FanfikCards';
import FiltersPanel from './components/FiltersPanel';
import Pagination from './components/Pagination';
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
        perPage: 16
    });

    // Состояние для фильтров
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
    
    // Загрузка фанфиков с фильтрами и пагинацией
    const loadFanfics = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            
            // Подготавливаем параметры запроса
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
                if (key === 'search') delete params[key];
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
            const fanficsData = response.data || response.fanfics || response;
            const paginationData = response.pagination || response.meta || {
                current_page: pagination.currentPage,
                last_page: 1,
                total: 0
            };

            const formattedFanfics = fanficsData.map(fanfic => ({
                id: fanfic.id,
                title: fanfic.title,
                author: fanfic.user?.name || 'Аноним',
                authorId: fanfic.user?.id, // ДОБАВЛЕНО: ID автора
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
                // ДОБАВЛЕНО: поля для эксклюзивного контента
                is_early_access: fanfic.is_early_access || false,
                early_access_until: fanfic.early_access_until,
                is_exclusive: fanfic.is_exclusive || false
            }));

            setFanfics(formattedFanfics);
            setPagination(prev => ({
                ...prev,
                totalPages: paginationData.last_page || 1,
                totalItems: paginationData.total || 0,
                currentPage: paginationData.current_page || prev.currentPage
            }));

        } catch (error) {
            console.error('Ошибка загрузки фанфиков:', error);
            setError('Не удалось загрузить фанфики. Пожалуйста, попробуйте позже.');
            setFanfics([]);
        } finally {
            setLoading(false);
        }
    }, [pagination.currentPage, pagination.perPage, filters]);

    // Загрузка при монтировании и изменении фильтров/страницы
    useEffect(() => {
        loadFanfics();
    }, [loadFanfics]);

    // Обработчик изменения фильтров
    const handleFilterChange = (newFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
        setPagination(prev => ({ ...prev, currentPage: 1 })); // Сбрасываем на первую страницу
    };

    // Обработчик сброса фильтров
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

    // Обработчик изменения страницы
    const handlePageChange = (page) => {
        setPagination(prev => ({ ...prev, currentPage: page }));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Обработчик клика по карточке
    const handleFanficClick = (card) => {
        window.location.href = `/fanfic/${card.id}`;
    };

    // Обработчик лайка
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

    // Обработчик анлайка
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

    return (
        <div className="all-fanfics-page">
            <div className="all-fanfics-container">
                {/* Боковая панель с фильтрами */}
                <div className="filters-sidebar">
                    <FiltersPanel 
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        onReset={handleResetFilters}
                    />
                </div>

                {/* Основной контент */}
                <div className="fanfics-content">
                    <div className="fanfics-header">
                        <h1>Все фанфики</h1>
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
                                        {/* ДОБАВЛЕНО: Бейджи для премиум контента */}
                                        <div className="fanfic-badges">
                                            {fanfic.is_exclusive && (
                                                <span className="premium-badge exclusive-badge" title="Эксклюзивный контент">
                                                    ✧˖°. Эксклюзив
                                                </span>
                                            )}
                                        </div>
                                        <FanfikCards
                                            key={fanfic.id}
                                            imageUrl={fanfic.cover_image}
                                            title={fanfic.title}
                                            author={fanfic.author}
                                            authorId={fanfic.authorId} // ДОБАВЛЕНО: передача authorId
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
                                <Pagination
                                    currentPage={pagination.currentPage}
                                    totalPages={pagination.totalPages}
                                    onPageChange={handlePageChange}
                                />
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AllFanfics;