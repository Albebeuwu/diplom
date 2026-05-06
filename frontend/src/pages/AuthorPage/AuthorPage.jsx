import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { authorService } from '../../services/authorService';
import { fanficService } from '../../services/fanficService';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import FanfikCards from '../../components/cards/FanfikCards/FanfikCards';
import CreateSurvey from '../../components/CreateSurvey/CreateSurvey';
import SurveyView from '../../components/SurveyView/SurveyView';
import './AuthorPage.css';

function AuthorPage() {
    const { userId } = useParams();
    const { user, isAuthenticated } = useAuth();
    const { hasSubscription, planId } = useSubscription();
    const [author, setAuthor] = useState(null);
    const [fanfics, setFanfics] = useState([]);
    const [earlyAccessFanfics, setEarlyAccessFanfics] = useState([]);
    const [exclusiveFanfics, setExclusiveFanfics] = useState([]);
    const [surveys, setSurveys] = useState([]);
    const [activeTab, setActiveTab] = useState('works');
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [subscribing, setSubscribing] = useState(false);
    const navigate = useNavigate();
    const [showCreateSurvey, setShowCreateSurvey] = useState(false);
    const [selectedSurvey, setSelectedSurvey] = useState(null);

    // Проверка на подписку Hype или выше
    const hasHypeOrHigher = hasSubscription && (planId === 'hype' || planId === 'chitun');

    useEffect(() => {
        loadAuthorData();
    }, [userId]);

    useEffect(() => {
        if (isAuthenticated && user?.id !== parseInt(userId)) {
            checkSubscription();
        }
    }, [userId, isAuthenticated, user?.id]);

    // Отдельный эффект для загрузки доп контента при изменении hasHypeOrHigher
    useEffect(() => {
        if (hasHypeOrHigher && author) {
            loadExtraContent();
        }
    }, [hasHypeOrHigher, author]);

    const loadAuthorData = async () => {
        try {
            setLoading(true);
            const [authorData, fanficsData] = await Promise.all([
                authorService.getAuthor(userId),
                authorService.getAuthorFanfics(userId)
            ]);
            
            setAuthor(authorData);
            setFanfics(fanficsData);
        } catch (error) {
            console.error('Ошибка загрузки данных автора:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadExtraContent = async () => {
        try {
            console.log('Загрузка доп контента для автора:', userId);
            
            // Всегда загружаем опросы, даже если нет подписки
            // (на бэкенде будет проверка прав)
            const surveysData = await authorService.getAuthorSurveys(userId);
            console.log('Загружено опросов:', surveysData?.length || 0, surveysData);
            setSurveys(surveysData || []);
            
            // Если есть подписка, загружаем ранний доступ и эксклюзив
            if (hasHypeOrHigher) {
                const [earlyAccess, exclusive] = await Promise.all([
                    authorService.getAuthorEarlyAccess(userId),
                    authorService.getAuthorExclusive(userId)
                ]);
                setEarlyAccessFanfics(earlyAccess || []);
                setExclusiveFanfics(exclusive || []);
            } else {
                setEarlyAccessFanfics([]);
                setExclusiveFanfics([]);
            }
        } catch (error) {
            console.error('Ошибка загрузки доп контента:', error);
            // Не сбрасываем существующие данные при ошибке
        }
    };

    const checkSubscription = async () => {
        if (!isAuthenticated || user?.id === parseInt(userId)) return;
        try {
            const status = await authorService.checkSubscription(userId);
            setIsSubscribed(status);
        } catch (error) {
            console.error('Ошибка проверки подписки:', error);
            setIsSubscribed(false);
        }
    };

    const extraContentItems = [
        ...earlyAccessFanfics.map(f => ({ ...f, type: 'early_access' })),
        ...exclusiveFanfics.map(f => ({ ...f, type: 'exclusive' })),
        ...surveys.map(s => ({ ...s, type: 'survey' }))
    ];

    const handleSubscribe = async () => {
        if (!isAuthenticated) {
            navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
            return;
        }

        if (user?.id === parseInt(userId)) {
            console.warn('Нельзя подписаться на самого себя');
            return;
        }

        try {
            setSubscribing(true);
            if (isSubscribed) {
                await authorService.unsubscribe(userId);
                setIsSubscribed(false);
                setAuthor(prev => prev ? {
                    ...prev,
                    subscribers_count: Math.max(0, (prev.subscribers_count || 0) - 1)
                } : prev);
            } else {
                await authorService.subscribe(userId);
                setIsSubscribed(true);
                setAuthor(prev => prev ? {
                    ...prev,
                    subscribers_count: (prev.subscribers_count || 0) + 1
                } : prev);
            }
        } catch (error) {
            console.error('Ошибка при подписке:', error);
            if (error.response?.status === 401) {
                navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
            } else if (error.response?.data?.message) {
                alert(error.response.data.message);
            }
        } finally {
            setSubscribing(false);
        }
    };

    const handleFanfikClick = (fanfic) => {
        navigate(`/fanfic/${fanfic.id}`);
    };

    const handleExtraContentClick = (content) => {
        if (content.type === 'early_access' || content.type === 'exclusive') {
            navigate(`/fanfic/${content.id}`);
        } else if (content.type === 'survey') {
            setSelectedSurvey(content);
        }
    };

    const formatFanfics = (fanficsList) => {
    return fanficsList.map(fanfic => ({
        id: fanfic.id,
        title: fanfic.title,
        author: author?.name || 'Автор',
        authorId: author?.id,
        fandom: fanfic.fandom || 'Не указан',
        description: fanfic.description || 'Без описания',
        rating: fanfic.rating || null,
        category: 'Работы автора',
        status: fanfic.work_status === 'in_progress' ? 'в процессе' : 
                fanfic.work_status === 'completed' ? 'завершен' : 'заброшен',
        tags: fanfic.tags?.map(tag => tag.name).join(', ') || 'Без тегов',
        likes: fanfic.likes || 0,
        liked: fanfic.is_liked || false,
        views: fanfic.views ?? 0,
        cover_image: fanfic.cover_image 
            ? `http://45.147.179.241/storage/${fanfic.cover_image}`
            : null,
        // ДОБАВЬТЕ ЭТИ ПОЛЯ
        is_early_access: fanfic.is_early_access || false,
        early_access_until: fanfic.early_access_until,
        is_exclusive: fanfic.is_exclusive || false
    }));
};

    // Функция для перезагрузки доп контента после создания опроса
    const handleSurveyCreated = async () => {
        console.log('Опрос создан, перезагружаем данные...');
        await loadExtraContent();
        setShowCreateSurvey(false);
        // Если пользователь на вкладке extra, обновляем отображение
        if (activeTab === 'extra') {
            // Принудительно обновляем состояние, чтобы перерендерить
            setActiveTab('extra');
        }
    };

    if (loading) {
        return (
            <div className="author-page">
                {/* Кнопка "Назад" */}
                <button className="back-button" onClick={() => navigate(-1)}>
                    ← Назад
                </button>
                <div className="loading">Загрузка профиля автора...</div>
            </div>
        );
    }

    if (!author) {
        return (
            <div className="author-page">
                {/* Кнопка "Назад" */}
                <button className="back-button" onClick={() => navigate(-1)}>
                    ← Назад
                </button>
                <div className="error-message">Автор не найден</div>
            </div>
        );
    }

    const formattedFanfics = formatFanfics(fanfics);

    return (
        <div className="author-page">
            {/* Кнопка "Назад" */}
            <button className="back-button" onClick={() => navigate(-1)}>
                ← Назад
            </button>

            {/* Шапка профиля автора */}
            <div className="author-header">
                <div className="author-cover" style={{
                    backgroundImage: author.background_url ? `url(${author.background_url})` : 'none',
                    opacity: author.background_opacity || 0.7
                }}>
                    <div className="author-cover-overlay"></div>
                </div>
                
                <div className="author-info-container">
                    <div className="author-avatar">
                        {author.avatar_url ? (
                            <img src={author.avatar_url} alt={author.name} />
                        ) : (
                            <div className="avatar-circle-initials">
                                {author.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                        )}
                    </div>
                    
                    <div className="author-details">
                        <h1 className="author-name">{author.name}</h1>
                        {author.bio && <p className="author-bio">{author.bio}</p>}
                        
                        <div className="author-stats">
                            <div className="stat-item">
                                <span className="stat-value">{author.fanfics_count || 0}</span>
                                <span className="stat-label">работ</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-value">{author.subscribers_count || 0}</span>
                                <span className="stat-label">подписчиков</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-value">{author.total_likes || 0}</span>
                                <span className="stat-label">лайков</span>
                            </div>
                        </div>
                        
                        {isAuthenticated && user?.id !== parseInt(userId) && (
                            <button 
                                className={`subscribe-btn ${isSubscribed ? 'subscribed' : ''}`}
                                onClick={handleSubscribe}
                                disabled={subscribing}
                            >
                                {subscribing ? (
                                    <span className="spinner-small"></span>
                                ) : isSubscribed ? (
                                    '✓ Подписан'
                                ) : (
                                    'Подписаться'
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Навигация по вкладкам */}
            <div className="author-tabs">
                <button 
                    className={`tab-btn ${activeTab === 'works' ? 'active' : ''}`}
                    onClick={() => setActiveTab('works')}
                >
                    Работы автора
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'extra' ? 'active' : ''} ${!hasHypeOrHigher ? 'locked' : ''}`}
                    onClick={() => hasHypeOrHigher && setActiveTab('extra')}
                    disabled={!hasHypeOrHigher}
                >
                    Дополнительный контент
                    {!hasHypeOrHigher && <span className="lock-icon">🔒︎</span>}
                </button>
            </div>

            {/* Контент вкладок */}
            <div className="author-content">    
                {activeTab === 'works' && (
                    <div className="works-tab">
                        {formattedFanfics.length === 0 ? (
                            <div className="no-content">
                                <p>У автора пока нет опубликованных работ</p>
                            </div>
                        ) : (
                            <div className="author-fanfics-grid">
                                {formattedFanfics.map(fanfic => (
                                    <div key={fanfic.id} className="fanfic-card-wrapper">
                                        {/* Бейджи для премиум контента */}
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
                                            rating={fanfic.rating?.code}
                                            category={fanfic.category}
                                            showCategory={true}
                                            status={fanfic.status}
                                            tags={fanfic.tags}
                                            likes={fanfic.likes}
                                            liked={fanfic.liked}
                                            views={fanfic.views}
                                            showViews={true}
                                            onClick={() => handleFanfikClick(fanfic)}
                                            className="author-fanfic-card"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'extra' && !hasHypeOrHigher && (
                    <div className="premium-lock">
                        <div className="lock-icon-large">🔒︎</div>
                        <h2>Дополнительный контент доступен только по подписке "Хайп" и выше</h2>
                        <p>Оформите подписку, чтобы получить доступ к эксклюзивным материалам:</p>
                        <ul className="premium-features">
                            <li>✓ Ранний доступ к новым работам (на 7 дней раньше)</li>
                            <li>✓ Эксклюзивные фанфики и бонусы</li>
                            <li>✓ Опросы и голосования</li>
                            <li>✓ Альтернативные концовки</li>
                        </ul>
                        <button 
                            className="premium-subscribe-btn"
                            onClick={() => navigate('/profile?tab=paid-subscription')}
                        >
                            Оформить подписку "Хайп"
                        </button>
                    </div>
                )}

                {activeTab === 'extra' && hasHypeOrHigher && (
                    <div className="extra-tab">
                        {/* Кнопка создания нового контента */}
                        {user?.id === parseInt(userId) && hasHypeOrHigher && (
                            <div className="create-extra-content-bar">
                                <button 
                                    className="create-survey-btn"
                                    onClick={() => setShowCreateSurvey(true)}
                                >
                                    + Создать опрос
                                </button>
                            </div>
                        )}
                        
                        {/* Остальной контент */}
                        {extraContentItems.length === 0 ? (
                            <div className="no-content">
                                <p>У автора пока нет дополнительного контента</p>
                                {user?.id === parseInt(userId) && (
                                    <button 
                                        className="create-first-btn"
                                        onClick={() => setShowCreateSurvey(true)}
                                    >
                                        Создать первый опрос
                                    </button>   
                                )}
                            </div>
                        ) : (
                            <div className="extra-content-list">
                                {extraContentItems.map(content => (
                                    <div key={content.id} className="extra-content-card">
                                        <div className="extra-content-icon">
                                            {content.type === 'early_access' && '🚀'}
                                            {content.type === 'exclusive' && '✧˖°.'}
                                            {content.type === 'survey' && '📊'}
                                        </div>
                                        <div className="extra-content-info">
                                            <h3>{content.title}</h3>
                                            <p>{content.description}</p>
                                            <div className="extra-content-meta">
                                                {content.type === 'early_access' && content.early_access_until && (
                                                    <span className="early-access-badge">
                                                        🚀 Ранний доступ • До {new Date(content.early_access_until).toLocaleDateString()}
                                                    </span>
                                                )}
                                                {content.type === 'exclusive' && (
                                                    <span className="exclusive-badge">
                                                        ✧˖°. Эксклюзив
                                                    </span>
                                                )}
                                                {content.type === 'survey' && (
                                                    <span className="survey-badge">📊 Опрос</span>
                                                )}
                                                {/* Добавьте также информацию о том, что скоро станет общедоступным */}
                                                {content.type === 'early_access' && content.early_access_until && (
                                                    <span className="public-available-badge">
                                                        ꗃ Общедоступен с {new Date(content.early_access_until).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button 
                                            className="view-content-btn"
                                            onClick={() => handleExtraContentClick(content)}
                                        >
                                            {content.type === 'survey' ? 'Проголосовать' : 'Читать'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Модальное окно создания опроса */}
            {showCreateSurvey && (
                <CreateSurvey 
                    authorId={userId}
                    onClose={() => setShowCreateSurvey(false)}
                    onSuccess={handleSurveyCreated}
                />
            )}

            {/* Модальное окно просмотра опроса */}
            {selectedSurvey && (
                <SurveyView 
                    surveyId={selectedSurvey.id}
                    onClose={() => setSelectedSurvey(null)}
                />
            )}
        </div>
    );
}

export default AuthorPage;