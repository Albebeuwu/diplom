import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import queryString from 'query-string';
import { useAuth } from '../../context/AuthContext';
import Subscriptions from './Subscriptions';
import './Profile.css';
import { useSubscription } from '../../hooks/useSubscription';

// Импортируем компоненты для каждой вкладки
import ProfileInfo from './ProfileInfo';
import MyFanfics from './MyFanfics';
import Favorites from './Favorites';
import Reports from './Reports';
import PaidSubscription from './PaidSubscription';
import Drafts from './Drafts';
import ProfileBackground from './ProfileBackground';

function Profile() {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, user, logout, isAdmin } = useAuth(); 
    const [activeTab, setActiveTab] = useState('profile');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [loading, setLoading] = useState(false);
    const { hasSubscription, loading: subLoading } = useSubscription();

    // Перенаправление если не авторизован
    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
        }
    }, [isAuthenticated, navigate]);

    // Адаптивное поведение боковой панели
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768) {
                setSidebarOpen(false);
            } else {
                setSidebarOpen(true);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const query = queryString.parse(location.search);
        if (query.tab && menuItems.some(item => item.id === query.tab)) {
            setActiveTab(query.tab);
        }
    }, [location.search]);

    const getMenuItems = () => {
        const items = [
            { id: 'home', label: 'Главная', route: '/' },
            { id: 'profile', label: 'Мой профиль' },
            { id: 'drafts', label: 'Черновики' },
            { id: 'fanfics', label: 'Мои работы' },
            { id: 'favorites', label: 'Избранное'},
            { id: 'subscriptions', label: 'Авторы'},
            { id: 'reports', label: 'Жалобы' },
            { id: 'paid-subscription', label: 'Подписка' },
        ];
        
        // Кнопка "Фон сайта" показывается ТОЛЬКО при любой активной подписке
        if (hasSubscription) {
            items.splice(2, 0, { id: 'background', label: 'Фон сайта' });
        }
        
        return items;
    };

    const menuItems = getMenuItems();

    const handleMenuItemClick = (item) => {
        if (item.route) {
            navigate(item.route);
        } else {
            setActiveTab(item.id);
            // Обновляем URL с параметром tab
            navigate(`/profile?tab=${item.id}`, { replace: true });
            if (window.innerWidth < 768) {
                setSidebarOpen(false);
            }
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const handleAdminClick = () => {
        navigate('/admin');
    };

    if (!isAuthenticated) {
        return (
            <div className="profile-container">
                <div className="not-logged-in">
                    <h2>Вы не вошли в аккаунт</h2>
                    <p>Войдите в аккаунт для просмотра профиля</p>
                    <button className="login-btn" onClick={() => navigate('/login')}>
                        Войти
                    </button>
                </div>
            </div>
        );
    }

   const renderContent = () => {
        switch (activeTab) {
            case 'profile':
                return <ProfileInfo />;
            case 'background': 
                return <ProfileBackground />;
            case 'drafts': 
                return <Drafts />;
            case 'fanfics':
                return <MyFanfics />;
            case 'favorites':
                return <Favorites />;
            case 'subscriptions': 
                return <Subscriptions />;
            case 'reports':
                return <Reports />;
            case 'paid-subscription':
                return <PaidSubscription />;
            default:
                return <ProfileInfo />;
        }
    };

    return (
        <div className="profile-container">
            {/* Кнопка меню для мобильных */}
            <button 
                className="menu-toggle"
                onClick={() => setSidebarOpen(!sidebarOpen)}
            >
                ☰
            </button>

            {/* Боковая панель */}
            <div className={`side-panel ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="user-avatar">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="user-info">
                        <h3>{user?.name || 'Пользователь'}</h3>
                        <p className="user-email">{user?.email || ''}</p>
                    </div>
                </div>

                <nav className="sidebar-menu">
                    {menuItems.map(item => (
                        <button
                            key={item.id}
                            className={`menu-item ${activeTab === item.id ? 'active' : ''}`}
                            onClick={() => handleMenuItemClick(item)}
                        >
                            <span className="menu-label">{item.label}</span>
                        </button>
                    ))}
                </nav>

                    
                <div className="sidebar-footer">
                {/* Кнопка админки - только для администраторов */}
                    {isAdmin && (
                        <button 
                            className="admin-btn"
                            onClick={handleAdminClick}
                        >
                            <span className="menu-label">Админ панель</span>
                        </button>
                    )}

                    <button className="logout-btn" onClick={handleLogout}>
                        <span className="menu-label">Выйти</span>
                    </button>
                </div>
            </div>

            {/* Основное содержимое */}
            <div className="profile-content">
                <div className="content-header">
                    <h1>
                        {activeTab === 'profile' && 'Мой профиль'}
                        {activeTab === 'background' && 'Фон сайта'}
                        {activeTab === 'drafts' && 'Черновики'} 
                        {activeTab === 'fanfics' && 'Мои работы'}
                        {activeTab === 'favorites' && 'Избранное'}
                        {activeTab === 'subscriptions' && 'Авторы'}
                        {activeTab === 'reports' && 'Жалобы'}
                        {activeTab === 'paid-subscription' && 'Подписка'}
                    </h1>
                </div>

                <div className="content-body">
                    {loading ? (
                        <div className="loading">Загрузка...</div>
                    ) : (
                        renderContent()
                    )}
                </div>
            </div>
        </div>
    );
}

export default Profile;