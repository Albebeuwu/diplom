import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { fanficService } from '../../services/fanficService';
import { readingProgressService } from '../../services/readingProgressService';
import { useAuth } from '../../context/AuthContext';
import { useBackground } from '../../hooks/useBackground';
import './FanficReader.css';
import LoginButton from '../buttons/LoginButton/LoginButton';
import ReportModal from './ReportModal/ReportModal';
import CommentsSection from './CommentsSection/CommentsSection';
import { useSubscription } from '../../hooks/useSubscription';
import { useReadingHistory } from '../../hooks/useReadingHistory';

function FanficReader() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isAuthenticated } = useAuth(); 
    const { setReadingMode } = useBackground();
    
    const [fanfic, setFanfic] = useState(null);
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [fontSize, setFontSize] = useState(16);
    const [theme, setTheme] = useState('dark');
    const [lineHeight, setLineHeight] = useState(1.6);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isOwner, setIsOwner] = useState(false);
    const [accessDenied, setAccessDenied] = useState(false);
    const [accessDeniedReason, setAccessDeniedReason] = useState('');

    const [showReportModal, setShowReportModal] = useState(false);
    const [reportSuccess, setReportSuccess] = useState(false);
    const loadedRef = useRef(false);
    const [viewCounted, setViewCounted] = useState(false);

    const { saveProgress, refreshHistory } = useReadingHistory();
    
    // Реф для контейнера с контентом
    const contentContainerRef = useRef(null);
    // Таймаут для дебаунса сохранения прогресса
    const saveTimeoutRef = useRef(null);
    // Флаг для отслеживания, восстанавливали ли мы позицию
    const hasRestoredPosition = useRef(false);

    const { hasSubscription, planId, loading: subLoading } = useSubscription();

    // Проверка на подписку Hype или выше
    const hasHypeOrHigher = hasSubscription && (planId === 'hype' || planId === 'chitun');

    const [chapters, setChapters] = useState([]);
    const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
    const [totalChapters, setTotalChapters] = useState(0);

    // Функция сохранения прогресса 
    const saveReadingProgress = useCallback(() => {
        
        // Ищем скроллящийся контейнер
        const scrollContainer = contentContainerRef.current;
        
        if (!scrollContainer) {
            console.log('❌ Не могу сохранить прогресс: контейнер не найден');
            return;
        }
        
        // Проверяем, есть ли скролл у контейнера
        const scrollPosition = scrollContainer.scrollTop;
        const totalHeight = scrollContainer.scrollHeight;
        const clientHeight = scrollContainer.clientHeight;
        const maxScroll = totalHeight - clientHeight;
        
        console.log('📊 Отладка скролла:', {
            scrollTop: scrollPosition,
            scrollHeight: totalHeight,
            clientHeight: clientHeight,
            maxScroll: maxScroll,
            hasScrollbar: totalHeight > clientHeight
        });
        
        
        // Если контент не скроллится, возможно скролл на body или html
        let actualScrollPosition = scrollPosition;
        let actualMaxScroll = maxScroll;
        
        if (maxScroll <= 0) {
            // Проверяем скролл на body или html
            const docScrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const docScrollHeight = document.documentElement.scrollHeight;
            const docClientHeight = window.innerHeight;
            const docMaxScroll = docScrollHeight - docClientHeight;
            
            console.log('📊 Скролл документа:', {
                scrollTop: docScrollTop,
                scrollHeight: docScrollHeight,
                clientHeight: docClientHeight,
                maxScroll: docMaxScroll
            });
            
            if (docMaxScroll > 0) {
                actualScrollPosition = docScrollTop;
                actualMaxScroll = docMaxScroll;
            } else {
                console.log('⚠️ Нет скролла вообще');
                return;
            }
        }
        
        const progressPercentage = actualMaxScroll > 0 
            ? Math.min(100, Math.floor((actualScrollPosition / actualMaxScroll) * 100))
            : 0;
        
        console.log(`💾 Сохранение прогресса: позиция=${actualScrollPosition}, процент=${progressPercentage}%`);
        
        saveProgress(parseInt(id), actualScrollPosition, progressPercentage, currentChapterIndex);
        
    }, [id, saveProgress, currentChapterIndex]);

    // Обработчик скролла 
    const handleScroll = useCallback(() => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
            saveReadingProgress();
        }, 1000);
    }, [saveReadingProgress]);


    // Восстановление позиции скролла 
    const restoreScrollPosition = useCallback(async () => {
        if (hasRestoredPosition.current) {
            console.log('Позиция уже была восстановлена');
            return;
        }
        
        if (!isAuthenticated) {
            console.log('Пользователь не авторизован, не восстанавливаем позицию');
            return;
        }
        
        try {
            const token = localStorage.getItem('token');
            const API_URL = process.env.REACT_APP_API_URL || 'http://45.147.179.241/api';
            
            // Загружаем историю с сервера
            const response = await fetch(`${API_URL}/api/reading-history`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const history = await response.json();
                const savedProgress = history.find(item => item.id === parseInt(id));
                
                if (savedProgress && savedProgress.last_position > 0 && contentContainerRef.current) {
                    console.log(`Восстанавливаем позицию с сервера: ${savedProgress.last_position}px (${savedProgress.progress}%)`);
                    setTimeout(() => {
                        if (contentContainerRef.current) {
                            contentContainerRef.current.scrollTop = savedProgress.last_position;
                            hasRestoredPosition.current = true;
                        }
                    }, 500);
                    return;
                }
            }
            
            console.log('Нет сохраненной позиции на сервере');
        } catch (error) {
            console.error('Ошибка при восстановлении позиции:', error);
        }
    }, [id, isAuthenticated]);

    const updateChapterInUrl = (chapterNumber) => {
        const params = new URLSearchParams(location.search);
        params.set('chapter', chapterNumber.toString());
        navigate(`${location.pathname}?${params.toString()}`, { replace: true });
    };

    // Проверяем URL параметр для скролла
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const scrollTo = params.get('scrollTo');
        if (scrollTo && contentContainerRef.current && !hasRestoredPosition.current) {
            console.log(`Восстанавливаем позицию из URL: ${scrollTo}px`);
            setTimeout(() => {
                if (contentContainerRef.current) {
                    contentContainerRef.current.scrollTop = parseInt(scrollTo);
                    hasRestoredPosition.current = true;
                }
            }, 500);
        } else if (!hasRestoredPosition.current) {
            restoreScrollPosition();
        }
    }, [location.search, restoreScrollPosition]);

    useEffect(() => {
        setReadingMode(true);
        return () => setReadingMode(false);
    }, [setReadingMode]);

    // Сохраняем прогресс при размонтировании
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
            saveReadingProgress();
        };
    }, [saveReadingProgress]);

    // Подписываемся на события скролла
    useEffect(() => {
        const container = contentContainerRef.current;
        
        if (isAuthenticated) {
            console.log('🔔 Подписываемся на события скролла');
            
            // Подписка на скролл контейнера
            if (container) {
                container.addEventListener('scroll', handleScroll, { passive: true });
                console.log('  ✅ Подписка на скролл контейнера');
            }
            
            // Подписка на скролл окна (на случай, если скроллится body)
            window.addEventListener('scroll', handleScroll, { passive: true });
            console.log('  ✅ Подписка на window scroll');
            
            return () => {
                console.log('🔕 Отписываемся от событий скролла');
                if (container) {
                    container.removeEventListener('scroll', handleScroll);
                }
                window.removeEventListener('scroll', handleScroll);
                
                if (saveTimeoutRef.current) {
                    clearTimeout(saveTimeoutRef.current);
                }
            };
        }
    }, [handleScroll, isAuthenticated]);

    useEffect(() => {
        if (!isAuthenticated || !contentContainerRef.current || loading) return;
        
        // Сохраняем прогресс каждые 30 секунд, даже без скролла
        const intervalId = setInterval(() => {
            console.log('Автосохранение прогресса по таймеру');
            saveReadingProgress();
        }, 30000);
        
        return () => clearInterval(intervalId);
    }, [isAuthenticated, loading, saveReadingProgress]);

    useEffect(() => {
        const checkInitialLikeStatus = async () => {
            if (fanfic && user) {
                try {
                    const likeData = await fanficService.checkLike(fanfic.id);
                    setFanfic(prev => ({
                        ...prev,
                        liked: likeData.liked || false
                    }));
                } catch (error) {
                    console.warn('Не удалось проверить начальный статус лайка:', error);
                }
            }
        };
        
        checkInitialLikeStatus();
    }, [fanfic?.id, user]);

    useEffect(() => {
        if (!isAuthenticated || subLoading) return; 
        if (loadedRef.current) return;
        
        loadedRef.current = true;
        loadFanfic();
        
        if (!viewCounted && !sessionStorage.getItem(`viewed_${id}`)) {
            sessionStorage.setItem(`viewed_${id}`, 'true');
            setViewCounted(true);
        }
    }, [id, isAuthenticated, viewCounted, subLoading]); 

    const loadFanfic = async () => {
        try {
            setLoading(true);
            setError('');
            setAccessDenied(false);
            setAccessDeniedReason('');

            if (!isAuthenticated) {
                setLoading(false);
                return;
            }

            // Основной запрос
            const fanficData = await fanficService.getPublishedFanfic(id);
            console.log('✅ Фанфик успешно загружен через published:', fanficData);

            const isOwnerFlag = user && fanficData.user_id === user.id;
            setIsOwner(isOwnerFlag);

            // Проверка доступа для НЕ автора
            if (!isOwnerFlag) {
                if (fanficData.is_early_access && fanficData.early_access_until) {
                    const earlyAccessUntil = new Date(fanficData.early_access_until);
                    const now = new Date();

                    if (earlyAccessUntil > now && !hasHypeOrHigher) {
                        setAccessDenied(true);
                        setAccessDeniedReason('early_access');
                        setLoading(false);
                        return;
                    }
                }

                if (fanficData.is_exclusive && !hasHypeOrHigher) {
                    setAccessDenied(true);
                    setAccessDeniedReason('exclusive');
                    setLoading(false);
                    return;
                }
            }

            setFanfic(fanficData);

            // Загружаем контент
            const contentData = await fanficService.getPublishedFanficContent(id);
            if (contentData?.chapters && contentData.chapters.length > 0) {
                setChapters(contentData.chapters);
                setTotalChapters(contentData.total_chapters);
                
                // Проверяем, есть ли параметр главы в URL
                const params = new URLSearchParams(location.search);
                const chapterParam = params.get('chapter');
                if (chapterParam && !isNaN(chapterParam)) {
                    const targetChapter = Math.max(0, Math.min(parseInt(chapterParam) - 1, contentData.chapters.length - 1));
                    setCurrentChapterIndex(targetChapter);
                }
            } else if (contentData?.content) {
                // Fallback для старого формата — одна глава
                setChapters([{ index: 1, content: contentData.content, word_count: 0 }]);
                setTotalChapters(1);
            } else if (fanficData.extracted_text) {
                setChapters([{ index: 1, content: fanficData.extracted_text, word_count: 0 }]);
                setTotalChapters(1);
            }

        } catch (err) {
            console.error('Ошибка загрузки фанфика:', err);

            if (err.response?.status === 403) {
                const data = err.response.data;

                if (data.requires_subscription) {
                    setAccessDenied(true);
                    setAccessDeniedReason(data.is_exclusive ? 'exclusive' : 'early_access');
                    setLoading(false);
                    return;
                }

                setError('У вас нет доступа к этому фанфику.');
            } else {
                setError('Не удалось загрузить фанфик.');
            }
        } finally {
            setLoading(false);
        }
    };
    
    // Сохраняем прогресс при изменении контента (после загрузки)
    useEffect(() => {
        // 🔥 Ждём, когда загрузятся главы И отрендерится контейнер
        if (!loading && chapters.length > 0 && contentContainerRef.current) {
            console.log('📄 Главы загружены, ждем рендера...');
            
            const timer = setTimeout(() => {
                console.log('⏰ Проверяем размеры контейнера после рендера');
                
                const container = contentContainerRef.current;
                if (container) {
                    console.log('📏 Размеры контейнера:', {
                        scrollHeight: container.scrollHeight,
                        clientHeight: container.clientHeight,
                    });
                }
                
                // Восстанавливаем позицию
                restoreScrollPosition();
                
                // Сохраняем начальный прогресс
                if (isAuthenticated) {
                    saveReadingProgress();
                }
            }, 500);
            
            return () => clearTimeout(timer);
        }
    }, [loading, chapters, restoreScrollPosition, saveReadingProgress, isAuthenticated]);

    // Сохраняем прогресс при уходе со страницы
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (isAuthenticated && contentContainerRef.current) {
                saveReadingProgress();
            }
        };
        
        window.addEventListener('beforeunload', handleBeforeUnload);
        
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            if (isAuthenticated) {
                saveReadingProgress();
            }
        };
    }, [saveReadingProgress, isAuthenticated]);

    // Если доступ запрещен - показываем специальное сообщение
    if (accessDenied) {
        return (
            <div className="fanfic-reader access-denied">
                <div className="access-denied-content">
                    {accessDeniedReason === 'early_access' && (
                        <>
                            <div className="lock-icon-large">🚀</div>
                            <h1>Ранний доступ</h1>
                            <p>
                                Этот фанфик находится в периоде раннего доступа и будет доступен всем через {' '}
                                {fanfic && fanfic.early_access_until && (
                                    <strong>
                                        {Math.ceil((new Date(fanfic.early_access_until) - new Date()) / (1000 * 60 * 60 * 24))} дней
                                    </strong>
                                )}
                            </p>
                            <p>Сейчас его могут читать только пользователи с подпиской <strong>"Хайп"</strong> и выше.</p>
                        </>
                    )}
                    
                    {accessDeniedReason === 'exclusive' && (
                        <>
                            <div className="lock-icon-large">💎</div>
                            <h1>Эксклюзивный контент</h1>
                            <p>Это эксклюзивный контент, доступный только пользователям с подпиской <strong>"Хайп"</strong> и выше.</p>
                        </>
                    )}
                    
                    <div className="premium-features-box">
                        <h3>Оформите подписку "Хайп" и получите:</h3>
                        <ul>
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
                    
                    <button 
                        className="back-btn"
                        onClick={() => navigate(-1)}
                    >
                        ← Вернуться назад
                    </button>
                </div>
            </div>
        );
    }

    // Если пользователь не авторизован, показываем сообщение
    if (!isAuthenticated) {
        return (
            <div className="fanfic-reader auth-required">
                <div className="auth-required-content">
                    <h1>Упси:( Вы не вошли в аккаунт</h1>
                    <p>Что бы почитать фанфики войдите в аккаунт или создайте его</p>
                    <LoginButton
                        className="auth-btn back-home"
                        onClick={() => navigate('/')}
                    >
                        Главная
                    </LoginButton>
                </div>
            </div>
        );
    }

    const increaseFontSize = () => {
        setFontSize(prev => Math.min(prev + 2, 24));
    };

    const decreaseFontSize = () => {
        setFontSize(prev => Math.max(prev - 2, 12));
    };

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    const increaseLineHeight = () => {
        setLineHeight(prev => Math.min(prev + 0.1, 2.5));
    };

    const decreaseLineHeight = () => {
        setLineHeight(prev => Math.max(prev - 0.1, 1.2));
    };

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
        if (!isFullscreen) {
            document.documentElement.requestFullscreen?.();
        } else {
            document.exitFullscreen?.();
        }
    };

    const getStatusText = (status, previouslyApproved) => {
    switch (status) {
        case 'draft': return 'Черновик';
        case 'pending': 
            return previouslyApproved ? 'На повторной модерации' : 'На модерации';
        case 'approved': return 'Одобрен';
        case 'published': return 'Опубликован';
        case 'rejected': return 'Отклонен';
        default: return status;
    }
};

    const getStatusColor = (status) => {
        switch (status) {
            case 'draft': return '#a1a1aa';
            case 'pending': return '#f59e0b';
            case 'approved': return '#10b981';
            case 'published': return '#10b981';
            case 'rejected': return '#ef4444';
            default: return '#a1a1aa';
        }
    };

    const handleEdit = () => {
        if (fanfic.user_id === user?.id && fanfic.work_status !== 'completed') {
            navigate(`/fanfic/${fanfic.id}/edit`);
        }
    };

    const handleLike = async () => {
        if (!user) {
            navigate('/login');
            return;
        }
        
        try {
            if (fanfic.liked) {
                await fanficService.unlikeFanfic(fanfic.id);
                setFanfic(prev => ({
                    ...prev,
                    likes: Math.max(0, prev.likes - 1),
                    liked: false
                }));
            } else {
                await fanficService.likeFanfic(fanfic.id);
                setFanfic(prev => ({
                    ...prev,
                    likes: prev.likes + 1,
                    liked: true
                }));
            }
        } catch (err) {
            console.error('Ошибка лайка:', err);
            
            if (err.response?.status === 400) {
                setFanfic(prev => ({
                    ...prev,
                    liked: true
                }));
            }
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Неизвестно';
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleReportSuccess = () => {
        setReportSuccess(true);
        setTimeout(() => setReportSuccess(false), 3000);
    };

    const handleDeleteFanfic = async () => {
        if (!window.confirm(`Вы уверены, что хотите удалить фанфик "${fanfic.title}"? Это действие нельзя отменить.`)) {
            return;
        }
        try {
            await fanficService.deleteFanfic(fanfic.id);
            alert('Фанфик успешно удалён');
            navigate('/'); // или на страницу профиля автора
        } catch (err) {
            alert('Ошибка удаления: ' + (err.response?.data?.message || err.message));
        }
    };

    if (loading) {
        return (
            <div className="fanfic-reader loading-state">
                <div className="loading-spinner"></div>
                <p>Загрузка фанфика...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="fanfic-reader error-state">
                <div className="error-icon">⚠️</div>
                <h2>Ошибка загрузки</h2>
                <p>{error}</p>
                <button 
                    className="back-btn"
                    onClick={() => navigate('/')}
                >
                    Вернуться на главную
                </button>
            </div>
        );
    }

    if (!fanfic) {
        return (
            <div className="fanfic-reader not-found">
                <h2>Фанфик не найден</h2>
                <p>Возможно, фанфик был удален или перемещен.</p>
                <button 
                    className="back-btn"
                    onClick={() => navigate('/')}
                >
                    Вернуться на главную
                </button>
            </div>
        );
    }

    return (
        <div className={`fanfic-reader ${theme} ${isFullscreen ? 'fullscreen' : ''}`}>
            {/* Панель управления чтением */}
            <div className="reader-controls">
                <div className="controls-left">
                    <button 
                        className="control-btn back"
                        onClick={() => navigate(-1)}
                        title="Назад"
                    >
                        ← Назад
                    </button>
                    
                    <div className="font-controls">
                        <button 
                            className="control-btn"
                            onClick={decreaseFontSize}
                            title="Уменьшить шрифт"
                        >
                            A-
                        </button>
                        <span className="control-value">{fontSize}px</span>
                        <button 
                            className="control-btn"
                            onClick={increaseFontSize}
                            title="Увеличить шрифт"
                        >
                            A+
                        </button>
                    </div>
                    
                    <div className="line-height-controls">
                        <button 
                            className="control-btn"
                            onClick={decreaseLineHeight}
                            title="Уменьшить межстрочный интервал"
                        >
                            ⤓-
                        </button>
                        <span className="control-value">{lineHeight.toFixed(1)}</span>
                        <button 
                            className="control-btn"
                            onClick={increaseLineHeight}
                            title="Увеличить межстрочный интервал"
                        >
                            ⤓+
                        </button>
                    </div>
                </div>
                
                <div className="controls-right">
                    <button 
                        className="control-btn"
                        onClick={toggleTheme}
                        title="Сменить тему"
                    >
                        {theme === 'light' ? '☾ Темная' : ' 𖤓 Светлая'}
                    </button>
                    
                    {hasSubscription && fanfic.file_path && (
                        <a 
                            href={`http://45.147.179.241/api/storage/${fanfic.file_path}`} 
                            className="control-btn"
                            download
                            title="Скачать файл"
                        >
                            📥 Скачать
                        </a>
                    )}
                                        
                    <button 
                        className="control-btn"
                        onClick={toggleFullscreen}
                        title="Полноэкранный режим"
                    >
                        {isFullscreen ? '✕ Выйти' : '⛶ Полный экран'}
                    </button>

                    {!isOwner && fanfic.status === 'approved' && (
                        <button 
                            className="control-btn report"
                            onClick={() => setShowReportModal(true)}
                            title="Пожаловаться"
                        >
                            ⚠️ Пожаловаться
                        </button>
                    )}
                    
                    {(fanfic.user_id === user?.id && fanfic.work_status !== 'completed') && (
                        <button 
                            className="control-btn edit"
                            onClick={handleEdit}
                            title="Редактировать"
                        >
                            ✏️ Редактировать
                        </button>
                    )}

                    {(fanfic.user_id === user?.id || user?.role === 'admin') && (
                        <button
                            className="control-btn delete"
                            onClick={() => handleDeleteFanfic()}
                            title="Удалить фанфик"
                            style={{ color: '#ef4444' }}
                        >
                            🗑️ Удалить
                        </button>
                    )}
                </div>
            </div>

            {/* Основной контент */}
            <div className="reader-content">
                {/* Заголовок и метаданные */}
                <div className="fanfic-header-block">
                    <div className="header-top">
                        <span 
                            className="status-badge"
                            style={{ backgroundColor: getStatusColor(fanfic.status) }}
                        >
                            {getStatusText(fanfic.status, fanfic.previously_approved)}
                        </span>
                        
                        <div className="header-actions">
                            <button 
                                className={`like-btn ${fanfic.liked ? 'liked' : ''}`}
                                onClick={handleLike}
                                title={fanfic.liked ? "Убрать лайк" : "Поставить лайк"}
                                disabled={!user}
                            >
                                {fanfic.liked ? '♥' : '♡'} {fanfic.likes || 0}
                            </button>
                            <span className="views">👁 {fanfic.views || 0}</span>
                        </div>
                    </div>
                    
                    <h1 className="fanfic-title">{fanfic.title}</h1>
                    
                    <div className="author-info">
                        <div className="author-avatar">
                            {fanfic.user?.avatar_url ? (
                                <img 
                                    src={fanfic.user.avatar_url} 
                                    alt={fanfic.user?.name || 'Автор'}
                                    className="author-avatar-img"
                                    onError={(e) => {
                                        // Если аватарка не загрузилась, показываем инициалы
                                        e.target.style.display = 'none';
                                        e.target.parentElement.innerHTML = fanfic.user?.name?.charAt(0) || 'А';
                                    }}
                                />
                            ) : (
                                <span className="author-avatar-initials">
                                    {fanfic.user?.name?.charAt(0) || 'А'}
                                </span>
                            )}
                        </div>
                       <div className="author-details">
                            <span className="author-name">
                                {fanfic.user?.name || 'Аноним'}
                                {fanfic.user?.id && (
                                    <button 
                                        className="author-profile-link"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/author/${fanfic.user.id}`);
                                        }}
                                        title="Перейти в профиль автора"
                                    >
                                        ›
                                    </button>
                                )}
                            </span>
                            <span className="publish-date">
                                {fanfic.published_at 
                                    ? `Опубликовано: ${formatDate(fanfic.published_at)}`
                                    : `Создано: ${formatDate(fanfic.created_at)}`
                                }
                            </span>
                        </div>
                    </div>
                    
                    <div className="fanfic-meta">
                        <div className="meta-group">
                            <span className="meta-label">Фэндом:</span>
                            <span className="meta-value">{fanfic.fandom || 'Не указан'}</span>
                        </div>
                        
                        <div className="meta-group">
                            <span className="meta-label">Рейтинг:</span>
                            <span 
                                className="meta-value rating-reader"
                                style={{ color: fanfic.rating?.color || '#fff' }}
                            >
                                {fanfic.rating?.code || 'Не указан'}
                            </span>
                        </div>
                        
                        <div className="meta-group">
                            <span className="meta-label">Статус работы:</span>
                            <span className="meta-value">
                                {fanfic.work_status === 'in_progress' ? 'В процессе' : 
                                 fanfic.work_status === 'completed' ? 'Завершен' : 
                                 fanfic.work_status === 'abandoned' ? 'Заброшен' : 
                                 fanfic.work_status}
                            </span>
                        </div>
                        
                        <div className="meta-group">
                            <span className="meta-label">Язык:</span>
                            <span className="meta-value">
                                {fanfic.language === 'ru' ? 'Русский' : 
                                 fanfic.language === 'en' ? 'Английский' : 
                                 fanfic.language || 'Русский'}
                            </span>
                        </div>
                    </div>
                    
                    {fanfic.description && (
                        <div className="fanfic-description">
                            <h3>Описание</h3>
                            <p>{fanfic.description}</p>
                        </div>
                    )}
                    
                    {fanfic.tags && fanfic.tags.length > 0 && (
                        <div className="fanfic-tags-reader">
                            <h3>Теги</h3>
                            <div className="tags-list">
                                {fanfic.tags.map(tag => (
                                    <span key={tag.id} className="tag-reader">
                                        {tag.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {fanfic.cover_image && (
                        <div className="fanfic-cover">
                            <img 
                                src={`http://45.147.179.241/storage/${fanfic.cover_image}`}
                                alt={fanfic.title}
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    const parent = e.target.parentElement;
                                    if (parent && !parent.querySelector('.no-cover')) {
                                        const noCoverDiv = document.createElement('div');
                                        noCoverDiv.className = 'no-cover';
                                        noCoverDiv.textContent = 'Обложка не загружена';
                                        parent.appendChild(noCoverDiv);
                                    }
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Содержание фанфика - ОБЕРНИТЕ В ДИВ С overflow-y: auto */}
                {chapters.length > 0 && (
                <div 
                    ref={contentContainerRef}
                    className="content-container-scrollable"
                    style={{
                        fontSize: `${fontSize}px`,
                        lineHeight: lineHeight,
                        padding: '20px',
                        minHeight: '200px'
                    }}
                >
                    {/* Индикатор глав */}
                    {totalChapters > 1 && (
                        <div className="chapter-indicator" style={{ 
                            textAlign: 'center', 
                            padding: '10px 0',
                            borderBottom: `1px solid ${theme === 'light' ? '#e5e7eb' : '#374151'}`,
                            marginBottom: '20px'
                        }}>
                            <span style={{ 
                                background: theme === 'light' ? '#e5e7eb' : '#374151',
                                padding: '4px 12px',
                                borderRadius: '20px',
                                fontSize: '14px'
                            }}>
                                Глава {currentChapterIndex + 1} из {totalChapters}
                            </span>
                        </div>
                    )}

                    {/* Контент текущей главы */}
                    <div 
                        className="content-html"
                        dangerouslySetInnerHTML={{ __html: chapters[currentChapterIndex]?.content || '' }}
                        style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}
                    />

                    {/* Навигация по главам */}
                    {totalChapters > 1 && (
                        <div className="chapter-navigation" style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            marginTop: '30px',
                            paddingTop: '20px',
                            borderTop: `1px solid ${theme === 'light' ? '#e5e7eb' : '#374151'}`
                        }}>
                            <button
                                className="control-btn"
                                onClick={() => {
                                    if (currentChapterIndex > 0) {
                                        setCurrentChapterIndex(prev => prev - 1);
                                        if (contentContainerRef.current) {
                                            contentContainerRef.current.scrollTop = 0;
                                        }
                                        updateChapterInUrl(currentChapterIndex);
                                    }
                                }}
                                disabled={currentChapterIndex === 0}
                                style={{ opacity: currentChapterIndex === 0 ? 0.5 : 1 }}
                            >
                                ← Предыдущая глава
                            </button>
                            
                            <button
                                className="control-btn"
                                onClick={() => {
                                    if (currentChapterIndex < totalChapters - 1) {
                                        setCurrentChapterIndex(prev => prev + 1);
                                        if (contentContainerRef.current) {
                                            contentContainerRef.current.scrollTop = 0;
                                        }
                                        updateChapterInUrl(currentChapterIndex + 2);
                                    }
                                }}
                                disabled={currentChapterIndex === totalChapters - 1}
                                style={{ opacity: currentChapterIndex === totalChapters - 1 ? 0.5 : 1 }}
                            >
                                Следующая глава →
                            </button>
                        </div>
                    )}
                </div>
            )}

                {fanfic.status === 'pending' && fanfic.previously_approved && (
                    <div className="moderation-warning">
                        ⚠️ Этот фанфик был отредактирован и ожидает повторной модерации. 
                        Изменения станут доступны читателям после одобрения администратором.
                    </div>
                )}

                {/* Футер с навигацией */}
                <div className="reader-footer">
                    <div className="footer-actions">
                        <button 
                            className="footer-btn"
                            onClick={() => navigate(-1)}
                        >
                            ← Назад к списку
                        </button>
                        
                        <button 
                            className="footer-btn scroll-top"
                            onClick={() => {
                                if (contentContainerRef.current) {
                                    contentContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                                }
                            }}
                        >
                            ⬆ Наверх
                        </button>
                        
                        {(fanfic.user_id === user?.id && fanfic.work_status !== 'completed') && (
                            <button 
                                className="footer-btn edit"
                                onClick={handleEdit}
                            >
                                ✏️ Редактировать
                            </button>
                        )}
                    </div>
                    
                    <div className="footer-info">
                        <p>© {fanfic.user?.name || 'Автор'} • {new Date(fanfic.created_at).getFullYear()}</p>
                        <p className="footer-note">
                            Все права защищены. Копирование и распространение без разрешения автора запрещено.
                        </p>
                    </div>
                </div>
            </div>
            
            {fanfic.status === 'approved' && (
                <CommentsSection fanficId={fanfic.id} />
            )}

            {showReportModal && (
                <ReportModal
                    fanficId={fanfic.id}
                    fanficTitle={fanfic.title}
                    onClose={() => setShowReportModal(false)}
                    onSuccess={handleReportSuccess}
                />
            )}
            {reportSuccess && (
                <div className="report-success-notification">
                    Жалоба успешно отправлена
                </div>
            )}
        </div>
    );
}

export default FanficReader;