import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/api';
import { fanficService } from '../../services/fanficService';

import './AdminPanel.css';
import ReportsManagement from './ReportsManagement/ReportsManagement';
import AllFanficsTable from './AllFanficsTable/AllFanficsTable';
import TagManager from './TagManager/TagManager';

function AdminPanel() {
    const { isAdmin, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('users'); 
    const [users, setUsers] = useState([]);
    const [fanfics, setFanfics] = useState([]);
    const [stats, setStats] = useState({
        total_users: 0,
        active_users: 0,
        blocked_users: 0,
        admins: 0,
        total_fanfics: 0,
        pending: 0,
        published: 0,
        rejected: 0
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [rejectReason, setRejectReason] = useState('');
    const [selectedFanfic, setSelectedFanfic] = useState(null);
    const [blockModal, setBlockModal] = useState({ open: false, user: null, reason: '' });

    useEffect(() => {
        if (isAdmin) {
            loadUsers();
        }
    }, [isAdmin]);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const usersData = await authService.admin.getUsers();
            setUsers(usersData.users || usersData);
        } catch (err) {
            setError('Ошибка загрузки пользователей: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const loadPendingFanfics = async () => {
        try {
            setLoading(true);
            const pendingFanfics = await fanficService.admin.getPendingFanfics();
            setFanfics(pendingFanfics.data || pendingFanfics);
        } catch (err) {
            setError('Ошибка загрузки фанфиков: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const loadFanficStats = async () => {
        try {
            setLoading(true);
            console.log('Загрузка статистики...');
            const statsData = await fanficService.admin.getFanficStats();
            console.log('Полученные данные статистики:', statsData);
            
            // Гибкая обработка полученных данных
            let processedStats = {
                total_users: 0,
                active_users: 0,
                blocked_users: 0,
                admins: 0,
                total_fanfics: 0,
                pending: 0,
                published: 0,
                rejected: 0
            };
            
            // Если пришли данные
            if (statsData) {
                // Обработка в зависимости от структуры ответа
                const data = statsData.data || statsData.stats || statsData;
                
                // Заполняем статистику пользователей
                processedStats.total_users = data.total_users || data.totalUsers || data.users_count || 0;
                processedStats.active_users = data.active_users || data.activeUsers || data.active_count || 0;
                processedStats.blocked_users = data.blocked_users || data.blockedUsers || data.blocked_count || 0;
                processedStats.admins = data.admins || data.admin_count || 0;
                
                // Заполняем статистику фанфиков
                processedStats.total_fanfics = data.total_fanfics || data.totalFanfics || data.fanfics_count || data.total || 0;
                processedStats.pending = data.pending || data.pending_count || 0;
                processedStats.published = data.published || data.published_count || data.approved || 0;
                processedStats.rejected = data.rejected || data.rejected_count || 0;
                
                // Если есть отдельное поле для статистики фанфиков
                if (data.fanfic_stats) {
                    processedStats.total_fanfics = data.fanfic_stats.total || data.fanfic_stats.total_fanfics || processedStats.total_fanfics;
                    processedStats.pending = data.fanfic_stats.pending || processedStats.pending;
                    processedStats.published = data.fanfic_stats.published || data.fanfic_stats.approved || processedStats.published;
                    processedStats.rejected = data.fanfic_stats.rejected || processedStats.rejected;
                }
            }
            
            console.log('Обработанная статистика:', processedStats);
            setStats(processedStats);
        } catch (err) {
            console.error('Ошибка загрузки статистики:', err);
            setError('Ошибка загрузки статистики: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const loadCombinedStats = async () => {
        try {
            setLoading(true);
            console.log('Загрузка общей статистики...');
            
            // Пытаемся загрузить статистику с двух эндпоинтов
            const [userStats, fanficStats] = await Promise.all([
                authService.admin.getStats().catch(err => {
                    console.error('Ошибка загрузки статистики пользователей:', err);
                    return null;
                }),
                fanficService.admin.getFanficStats().catch(err => {
                    console.error('Ошибка загрузки статистики фанфиков:', err);
                    return null;
                })
            ]);
            
            console.log('Статистика пользователей:', userStats);
            console.log('Статистика фанфиков:', fanficStats);
            
            let processedStats = {
                total_users: 0,
                active_users: 0,
                blocked_users: 0,
                admins: 0,
                total_fanfics: 0,
                pending: 0,
                published: 0,
                rejected: 0
            };
            
            // Обрабатываем статистику пользователей
            if (userStats) {
                const userData = userStats.stats || userStats.data || userStats;
                processedStats.total_users = userData.total_users || userData.totalUsers || userData.users_count || 0;
                processedStats.active_users = userData.active_users || userData.activeUsers || userData.active_count || 0;
                processedStats.blocked_users = userData.blocked_users || userData.blockedUsers || userData.blocked_count || 0;
                processedStats.admins = userData.admins || userData.admin_count || 0;
            }
            
            // Обрабатываем статистику фанфиков
            if (fanficStats) {
                const fanficData = fanficStats.stats || fanficStats.data || fanficStats;
                processedStats.total_fanfics = fanficData.total_fanfics || fanficData.totalFanfics || fanficData.fanfics_count || fanficData.total || 0;
                processedStats.pending = fanficData.pending || fanficData.pending_count || 0;
                processedStats.published = fanficData.published || fanficData.published_count || fanficData.approved || 0;
                processedStats.rejected = fanficData.rejected || fanficData.rejected_count || 0;
            }
            
            console.log('Объединенная статистика:', processedStats);
            setStats(processedStats);
        } catch (err) {
            console.error('Ошибка загрузки статистики:', err);
            setError('Ошибка загрузки статистики: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            await authService.admin.updateUserRole(userId, newRole);
            await loadUsers();
        } catch (err) {
            setError('Ошибка изменения роли: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleBlockUser = async () => {
        if (!blockModal.reason.trim()) {
            setError('Укажите причину блокировки');
            return;
        }
        
        try {
            await authService.admin.blockUser(blockModal.user.id, blockModal.reason);
            setBlockModal({ open: false, user: null, reason: '' });
            await loadUsers();
            setError('');
        } catch (err) {
            setError('Ошибка блокировки: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleUnblockUser = async (userId) => {
        if (!window.confirm('Вы уверены, что хотите разблокировать этого пользователя?')) {
            return;
        }
        
        try {
            await authService.admin.unblockUser(userId);
            await loadUsers();
        } catch (err) {
            setError('Ошибка разблокировки: ' + (err.response?.data?.message || err.message));
        }
    };

    const openBlockModal = (user) => {
        setBlockModal({ open: true, user, reason: '' });
    };

    const closeBlockModal = () => {
        setBlockModal({ open: false, user: null, reason: '' });
    };

    const handleApproveFanfic = async (fanficId) => {
        try {
            await fanficService.admin.approveFanfic(fanficId);
            setFanfics(fanfics.filter(f => f.id !== fanficId));
            setError('');
        } catch (err) {
            setError('Ошибка одобрения фанфика: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleRejectFanfic = async (fanficId) => {
        if (!rejectReason.trim()) {
            setError('Укажите причину отклонения');
            return;
        }
        try {
            await fanficService.admin.rejectFanfic(fanficId, rejectReason);
            setFanfics(fanfics.filter(f => f.id !== fanficId));
            setRejectReason('');
            setSelectedFanfic(null);
            setError('');
        } catch (err) {
            setError('Ошибка отклонения фанфика: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setError('');
        
        if (tab === 'fanfics') {
            loadPendingFanfics();
        } else if (tab === 'stats') {
            loadCombinedStats(); // Используем комбинированную загрузку
        } else if (tab === 'users') {
            loadUsers();
        }
    };

    const openRejectModal = (fanfic) => {
        setSelectedFanfic(fanfic);
        setRejectReason('');
    };

    const closeRejectModal = () => {
        setSelectedFanfic(null);
        setRejectReason('');
    };

    if (!isAdmin) {
        return (
            <div className="admin-panel">
                <div className="access-denied">
                    <h2>Доступ запрещен</h2>
                    <p>Требуются права администратора для доступа к этой странице.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-panel">
            <div className="admin-header">
                <h1>Панель администратора</h1>
                <button className="logout-btn" onClick={logout}>Выйти</button>
            </div>

            <div className="admin-tabs">
                <button 
                    className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
                    onClick={() => handleTabChange('users')}
                >
                    Пользователи
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'fanfics' ? 'active' : ''}`}
                    onClick={() => handleTabChange('fanfics')}
                >
                    Модерация фанфиков
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
                    onClick={() => handleTabChange('reports')}
                >
                    Жалобы
                </button>
                <button
                    className={`tab-btn ${activeTab === 'all-fanfics' ? 'active' : ''}`}
                    onClick={() => handleTabChange('all-fanfics')}
                >
                    Все фанфики
                </button>
                <button
                    className={`tab-btn ${activeTab === 'tags' ? 'active' : ''}`}
                    onClick={() => handleTabChange('tags')}
                >
                    Теги
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
                    onClick={() => handleTabChange('stats')}
                >
                    Статистика
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {activeTab === 'users' && (
                <div className="users-container">
                    <h2>Управление пользователями</h2>
                    {loading ? (
                        <p>Загрузка...</p>
                    ) : (
                        <table className="users-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Имя</th>
                                    <th>Email</th>
                                    <th>Роль</th>
                                    <th>Статус</th>
                                    <th>Дата регистрации</th>
                                    <th>Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id} className={user.is_blocked ? 'blocked-user' : ''}>
                                        <td>{user.id}</td>
                                        <td>{user.name}</td>
                                        <td>{user.email}</td>
                                        <td>
                                            <select 
                                                value={user.role || 'user'} 
                                                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                className="role-select"
                                                disabled={user.is_blocked}
                                            >
                                                <option value="user">Пользователь</option>
                                                <option value="admin">Администратор</option>
                                            </select>
                                        </td>
                                        <td>
                                            {user.is_blocked ? (
                                                <span className="status-badge blocked" title={user.block_reason}>
                                                    Заблокирован
                                                </span>
                                            ) : (
                                                <span className="status-badge active">Активен</span>
                                            )}
                                        </td>
                                        <td>{new Date(user.created_at).toLocaleDateString()}</td>
                                        <td>
                                            {user.is_blocked ? (
                                                <button 
                                                    className="unblock-btn"
                                                    onClick={() => handleUnblockUser(user.id)}
                                                >
                                                    Разблокировать
                                                </button>
                                            ) : (
                                                <button 
                                                    className="block-btn"
                                                    onClick={() => openBlockModal(user)}
                                                    disabled={user.role === 'admin'}
                                                >
                                                    Заблокировать
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {activeTab === 'fanfics' && (
                <div className="fanfics-container">
                    <h2>Фанфики на модерации</h2>
                    {loading ? (
                        <p>Загрузка...</p>
                    ) : fanfics.length === 0 ? (
                        <p className="no-fanfics">Нет фанфиков на модерации</p>
                    ) : (
                        <div className="fanfics-list">
                            {fanfics.map(fanfic => (
                                <div key={fanfic.id} className="fanfic-card">
                                    <div className="fanfic-header">
                                        <h3>{fanfic.title}</h3>
                                        <span className={`status-badge ${fanfic.status}`}>
                                            {fanfic.status === 'pending' ? (
                                                fanfic.previously_approved ? 'Повторная модерация' : 'На модерации'
                                            ) : fanfic.status}
                                        </span>
                                    </div>
                                    <div className="fanfic-info">
                                        <p><strong>Автор:</strong> {fanfic.user?.name || 'Неизвестно'}</p>
                                        <p><strong>Фэндом:</strong> {fanfic.fandom || 'Не указан'}</p>
                                        <p><strong>Рейтинг:</strong> {fanfic.rating?.code || 'Не указан'}</p>
                                        <p><strong>Слов:</strong> {fanfic.words_count}</p>
                                        <p><strong>Дата создания:</strong> {new Date(fanfic.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <div className="fanfic-description">
                                        <p><strong>Описание:</strong> {fanfic.description}</p>
                                    </div>
                                    <div className="fanfic-tags">
                                        {fanfic.tags?.map(tag => (
                                            <span key={tag.id} className="tag">{tag.name}</span>
                                        ))}
                                    </div>
                                    <div className="fanfic-actions">
                                        <button 
                                            className="approve-btn-admin"
                                            onClick={() => handleApproveFanfic(fanfic.id)}
                                        >
                                            Одобрить
                                        </button>
                                        <button 
                                            className="reject-btn-admin"
                                            onClick={() => openRejectModal(fanfic)}
                                        >
                                            Отклонить
                                        </button>
                                        <a 
                                            href={`/fanfic/${fanfic.id}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="view-btn-admin"
                                        >
                                            Просмотреть
                                        </a>
                                    </div>
                                    {fanfic.previously_approved && (
                                        <div className="info-message">
                                            ⚠️ Этот фанфик был ранее опубликован и отредактирован автором. 
                                            Требуется повторная проверка.
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'reports' && (
                <ReportsManagement />
            )}
            {activeTab === 'all-fanfics' && <AllFanficsTable />}
            {activeTab === 'tags' && <TagManager />}

            {activeTab === 'stats' && (
                <div className="stats-container">
                    <h2>Статистика сайта</h2>
                    {loading ? (
                        <p>Загрузка статистики...</p>
                    ) : (
                        <>
                            <div className="stats-section">
                                <h3>Пользователи</h3>
                                <div className="stats-grid">
                                    <div className="stat-card">
                                        <h4>Всего пользователей</h4>
                                        <p className="stat-number">{stats.total_users || 0}</p>
                                    </div>
                                    <div className="stat-card">
                                        <h4>Активных пользователей</h4>
                                        <p className="stat-number">{stats.active_users || 0}</p>
                                    </div>
                                    <div className="stat-card">
                                        <h4>Заблокировано</h4>
                                        <p className="stat-number">{stats.blocked_users || 0}</p>
                                    </div>
                                    <div className="stat-card">
                                        <h4>Администраторов</h4>
                                        <p className="stat-number">{stats.admins || 0}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="stats-section">
                                <h3>Фанфики</h3>
                                <div className="stats-grid">
                                    <div className="stat-card">
                                        <h4>Всего фанфиков</h4>
                                        <p className="stat-number">{stats.total_fanfics || 0}</p>
                                    </div>
                                    <div className="stat-card">
                                        <h4>На модерации</h4>
                                        <p className="stat-number">{stats.pending || 0}</p>
                                    </div>
                                    <div className="stat-card">
                                        <h4>Опубликовано</h4>
                                        <p className="stat-number">{stats.published || 0}</p>
                                    </div>
                                    <div className="stat-card">
                                        <h4>Отклонено</h4>
                                        <p className="stat-number">{stats.rejected || 0}</p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Модальное окно для блокировки пользователя */}
            {blockModal.open && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Блокировка пользователя</h3>
                            <button className="close-btn" onClick={closeBlockModal}>×</button>
                        </div>
                        <div className="modal-body">
                            <p>Вы собираетесь заблокировать пользователя: <strong>{blockModal.user?.name}</strong></p>
                            <p>Email: {blockModal.user?.email}</p>
                            
                            <div className="form-group">
                                <label htmlFor="blockReason">Причина блокировки *</label>
                                <textarea
                                    id="blockReason"
                                    value={blockModal.reason}
                                    onChange={(e) => setBlockModal({...blockModal, reason: e.target.value})}
                                    placeholder="Укажите причину блокировки пользователя..."
                                    rows={4}
                                    required
                                />
                            </div>
                            <p className="warning-text">
                                После блокировки пользователь не сможет войти в свой аккаунт.
                                Все его сессии будут завершены.
                            </p>
                        </div>
                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={closeBlockModal}>Отмена</button>
                            <button 
                                className="confirm-block-btn"
                                onClick={handleBlockUser}
                                disabled={!blockModal.reason.trim()}
                            >
                                Заблокировать
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Модальное окно для отклонения фанфика */}
            {selectedFanfic && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Отклонение фанфика</h3>
                            <button className="close-btn" onClick={closeRejectModal}>×</button>
                        </div>
                        <div className="modal-body">
                            <p>Вы собираетесь отклонить фанфик: <strong>{selectedFanfic.title}</strong></p>
                            <p>Автор: {selectedFanfic.user?.name || 'Неизвестно'}</p>
                            
                            <div className="form-group">
                                <label htmlFor="rejectReason">Причина отклонения *</label>
                                <textarea
                                    id="rejectReason"
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="Укажите причину отклонения фанфика..."
                                    rows={4}
                                    required
                                />
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={closeRejectModal}>Отмена</button>
                            <button 
                                className="confirm-reject-btn"
                                onClick={() => handleRejectFanfic(selectedFanfic.id)}
                                disabled={!rejectReason.trim()}
                            >
                                Отклонить фанфик
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminPanel;