import React, { useState, useEffect } from 'react';
import { authorService } from '../../services/authorService';
import { useAuth } from '../../context/AuthContext';
import './Profile.css';

function Subscriptions() {
    const { isAuthenticated } = useAuth();
    const [subscriptions, setSubscriptions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isAuthenticated) {
            loadSubscriptions();
        }
    }, [isAuthenticated]);

    const loadSubscriptions = async () => {
        try {
            setLoading(true);
            const data = await authorService.getSubscriptions();
            console.log('Загруженные подписки:', data); // Для отладки
            setSubscriptions(data);
        } catch (error) {
            console.error('Ошибка загрузки подписок:', error);
            // Показываем более понятную ошибку
            if (error.response?.status === 401) {
                // Не авторизован - ничего страшного, компонент уже обрабатывает это
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAuthorClick = (authorId) => {
        if (authorId) {
            window.location.href = `/author/${authorId}`;
        }
    };

    const handleUnsubscribe = async (authorId, e) => {
        e.stopPropagation();
        try {
            await authorService.unsubscribe(authorId);
            setSubscriptions(prev => prev.filter(author => author.id !== authorId));
        } catch (error) {
            console.error('Ошибка при отписке:', error);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="subscriptions-container">
                <div className="not-logged-in">
                    <h2>Подписки</h2>
                    <p>Войдите в аккаунт, чтобы увидеть ваши подписки</p>
                    <button 
                        className="login-btn"
                        onClick={() => window.location.href = '/login'}
                    >
                        Войти
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="subscriptions-container">
            {loading ? (
                <div className="loading">Загрузка подписок...</div>
            ) : subscriptions.length === 0 ? (
                <div className="no-subscriptions">
                    <div className="empty-icon">🕮</div>
                    <h3>У вас пока нет подписок</h3>
                    <p>Подпишитесь на авторов, чтобы не пропускать новые работы</p>
                    <button 
                        className="browse-btn"
                        onClick={() => window.location.href = '/all-fanfics'}
                    >
                        Найти авторов
                    </button>
                </div>
            ) : (
                <div className="subscriptions-list">
                    {subscriptions.map(author => (
                        <div 
                            key={author.id} 
                            className="subscription-card"
                            onClick={() => handleAuthorClick(author.id)}
                        >
                            <div className="subscription-avatar">
                                {author.avatar_url ? (
                                    <img src={author.avatar_url} alt={author.name} />
                                ) : (
                                    <div className="avatar-initials">
                                        {author.name?.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            
                            <div className="subscription-info">
                                <h3 className="author-name">{author.name}</h3>
                                {author.bio && (
                                    <p className="author-bio">{author.bio.substring(0, 100)}...</p>
                                )}
                                <div className="author-stats">
                                    <span>🕮 {author.fanfics_count || 0} работ</span>
                                    <span>♡ {author.total_likes || 0} лайков</span>
                                </div>
                            </div>
                            
                            <button 
                                className="unsubscribe-btn"
                                onClick={(e) => handleUnsubscribe(author.id, e)}
                            >
                                Отписаться
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Subscriptions;