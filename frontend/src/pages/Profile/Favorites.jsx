import React, { useState, useEffect, useCallback } from 'react';
import { fanficService } from '../../services/fanficService';
import FanfikCards from '../../components/cards/FanfikCards/FanfikCards';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './Profile.css';

function Favorites() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState(searchParams.get('filter') || 'all');
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        total: 0,
        per_page: 6 
    });

    const loadLikedFanfics = useCallback(async (filter, page = 1) => {
        try {
            setLoading(true);
            
            // Получаем избранные фанфики с пагинацией
            const response = await fanficService.getLikedFanfics(page, pagination.per_page);
            
            let likedFanfics = Array.isArray(response)
                ? response
                : response?.data || [];

            const totalItems = response?.total || likedFanfics.length;
            const lastPage = response?.last_page || Math.ceil(totalItems / pagination.per_page);
            
            // Применяем фильтрацию на клиенте (если нужно)
            if (filter !== 'all') {
                likedFanfics = likedFanfics.filter(fanfic => {
                    switch(filter) {
                        case 'in_progress':
                            return fanfic.work_status === 'in_progress';
                        case 'completed':
                            return fanfic.work_status === 'completed';
                        case 'abandoned':
                            return fanfic.work_status === 'abandoned';
                        case 'early_access':
                            return fanfic.is_early_access && new Date(fanfic.early_access_until) > new Date();
                        case 'exclusive':
                            return fanfic.is_exclusive;
                        default:
                            return true;
                    }
                });
            }

            const formattedFanfics = likedFanfics.map(fanfic => ({
                id: fanfic.id,
                title: fanfic.title,
                author: fanfic.user?.name || 'Аноним',
                authorId: fanfic.user_id,
                fandom: fanfic.fandom || 'Не указан',
                description: fanfic.description || 'Без описания',
                rating: fanfic.rating?.code || fanfic.rating || 'Не указан',
                category: 'Избранное',
                status: fanfic.work_status === 'in_progress' ? 'в процессе' :
                        fanfic.work_status === 'completed' ? 'завершен' : 'заброшен',
                tags: fanfic.tags?.map(tag => tag.name).join(', ') || 'Без тегов',
                likes: fanfic.likes_count ?? fanfic.likes ?? 0,
                liked: true,
                views: fanfic.views ?? 0,
                cover_image: fanfic.cover_image
                    ? `http://45.147.179.241/storage/${fanfic.cover_image}`
                    : null,
                is_early_access: fanfic.is_early_access || false,
                early_access_until: fanfic.early_access_until,
                is_exclusive: fanfic.is_exclusive || false,
                work_status: fanfic.work_status,
                created_at: fanfic.created_at
            }));

            setFavorites(formattedFanfics);
            setPagination({
                current_page: page,
                last_page: lastPage,
                total: totalItems,
                per_page: pagination.per_page
            });
        } catch (error) {
            console.error('Ошибка загрузки избранного:', error);
            setFavorites([]);
        } finally {
            setLoading(false);
        }
    }, [pagination.per_page]);

    useEffect(() => {
        loadLikedFanfics(activeFilter, pagination.current_page);
    }, [activeFilter, pagination.current_page, loadLikedFanfics]);

    const handleFilterChange = (filterId) => {
        setActiveFilter(filterId);
        setPagination(prev => ({ ...prev, current_page: 1 }));
        setSearchParams({ tab: 'favorites', filter: filterId });
    };

    const handleUnlike = async (fanficId) => {
        try {
            await fanficService.unlikeFanfic(fanficId);
            setFavorites(prev => prev.filter(f => f.id !== fanficId));
            setPagination(prev => ({ ...prev, total: prev.total - 1 }));
        } catch (error) {
            console.error('Ошибка при удалении из избранного:', error);
        }
    };

    const handleFanfikClick = (card) => {
        navigate(`/fanfic/${card.id}`);
    };

    const handlePageChange = (page) => {
        setPagination(prev => ({ ...prev, current_page: page }));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const filters = [
        { id: 'all', label: 'Все', count: pagination.total },
        { id: 'in_progress', label: 'В процессе' },
        { id: 'completed', label: 'Завершены' },
        { id: 'abandoned', label: 'Заброшены' },
        { id: 'early_access', label: 'Ранний доступ' },
        { id: 'exclusive', label: 'Эксклюзив' },
    ];

    return (
        <div className="favorites">

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

            {loading ? (
                <div className="loading">Загрузка избранного...</div>
            ) : favorites.length === 0 ? (
                <div className="no-favorites">
                    <div className="empty-state">
                        <div className="empty-icon">💝</div>
                        <p>В избранном пока ничего нет</p>
                        <p className="hint">
                            Добавляйте понравившиеся работы, нажав на ♡ на главной странице
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    <div className="favorites-list">
                        {favorites.map(fanfic => (
                            <div key={fanfic.id} className="fanfic-card-wrapper">
                                <div className="fanfic-badges">
                                    {fanfic.is_early_access && fanfic.early_access_until && new Date(fanfic.early_access_until) > new Date() && (
                                        <span className="premium-badge early-access-badge" title={`Ранний доступ до ${new Date(fanfic.early_access_until).toLocaleDateString()}`}>
                                            🚀 Ранний доступ
                                        </span>
                                    )}
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
                                    showViews={true}
                                    onLikeClick={() => handleUnlike(fanfic.id)}
                                    onClick={() => handleFanfikClick(fanfic)}
                                />
                            </div>
                        ))}
                    </div>
                    
                    {pagination.last_page > 1 && (
                        <div className="pagination">
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
                </>
            )}
        </div>
    );
}

export default Favorites;