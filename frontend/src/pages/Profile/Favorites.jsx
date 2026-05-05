import React, { useState, useEffect } from 'react';
import { fanficService } from '../../services/fanficService';
import FanfikCards from '../../components/cards/FanfikCards/FanfikCards';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Profile.css';

function Favorites() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLikedFanfics();
    }, []);

    const loadLikedFanfics = async () => {
        try {
            setLoading(true);

            console.log('Загружаем избранные фанфики...');
            const response = await fanficService.getLikedFanfics();

            // response может быть { data: [...] }
            const likedFanfics = Array.isArray(response)
                ? response
                : response?.data || [];

            console.log('Полученные данные:', likedFanfics);

            // Форматируем ТОЧНО ТАК ЖЕ, как на главной странице
            const formattedFanfics = likedFanfics.map(fanfic => ({
                id: fanfic.id,
                title: fanfic.title,
                author: fanfic.user?.name || 'Аноним',
                authorId: fanfic.user_id,
                fandom: fanfic.fandom || 'Не указан',
                description: fanfic.description || 'Без описания',
                rating: fanfic.rating?.code || fanfic.rating || 'Не указан',
                category: 'Избранное',
                status:
                    fanfic.work_status === 'in_progress'
                        ? 'в процессе'
                        : fanfic.work_status === 'completed'
                        ? 'завершен'
                        : 'заброшен',
                tags: fanfic.tags?.map(tag => tag.name).join(', ') || 'Без тегов',
                likes: fanfic.likes_count ?? fanfic.likes ?? 0,
                liked: true, // В избранном всегда лайкнуто
                views: fanfic.views ?? 0,
                cover_image: fanfic.cover_image
                    ? `http://localhost:8000/storage/${fanfic.cover_image}`
                    : null,
                is_early_access: fanfic.is_early_access || false,
                early_access_until: fanfic.early_access_until,
                is_exclusive: fanfic.is_exclusive || false
            }));

            setFavorites(formattedFanfics);
        } catch (error) {
            console.error('Ошибка загрузки избранного:', error);
            setFavorites([]);
        } finally {
            setLoading(false);
        }
    };

    const handleUnlike = async (fanficId) => {
        try {
            await fanficService.unlikeFanfic(fanficId);
            setFavorites(prev => prev.filter(f => f.id !== fanficId));
        } catch (error) {
            console.error('Ошибка при удалении из избранного:', error);
        }
    };

    const handleFanfikClick = (card) => {
        navigate(`/fanfic/${card.id}`);
    };

    return (
        <div className="favorites">
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
                <div className="favorites-list">
                    {favorites.map(fanfic => (
                        <div key={fanfic.id} className="fanfic-card-wrapper">
                            {/* Бейджи */}
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
            )}
        </div>
    );
}

export default Favorites;