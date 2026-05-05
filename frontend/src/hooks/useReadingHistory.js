import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const LOCAL_STORAGE_KEY = 'continue_reading';

export const useReadingHistory = () => {
    const { user, isAuthenticated } = useAuth();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

    // Автоматическая синхронизация при логине
    useEffect(() => {
        const syncLocalToServer = async () => {
            if (!isAuthenticated) return;

            const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (!localData) return;

            try {
                const localHistory = JSON.parse(localData);
                if (localHistory.length === 0) return;

                const token = localStorage.getItem('token');

                // ИСПРАВЛЕННЫЙ ФОРМАТ ДАННЫХ ДЛЯ СИНХРОНИЗАЦИИ
                const formattedHistory = localHistory.map(item => ({
                    fanfic_id: item.id,  // id фанфика
                    last_position: item.last_position || 0,
                    progress_percent: item.progress || 0  // progress -> progress_percent
                }));

                const response = await fetch(`${API_URL}/api/reading-history/sync`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify({ history: formattedHistory })
                });

                if (response.ok) {
                    localStorage.removeItem(LOCAL_STORAGE_KEY);
                    console.log('✅ Локальная история синхронизирована с сервером');
                    await loadHistory();
                }
            } catch (error) {
                console.error('❌ Ошибка синхронизации истории:', error);
            }
        };

        syncLocalToServer();
    }, [isAuthenticated]);

    // Загрузка истории
    const loadHistory = useCallback(async () => {
        if (!isAuthenticated) {
            const local = localStorage.getItem(LOCAL_STORAGE_KEY);
            setHistory(local ? JSON.parse(local) : []);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            const response = await fetch(`${API_URL}/api/reading-history`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setHistory(data);
            } else {
                setHistory([]);
            }
        } catch (error) {
            console.error('Failed to load history:', error);
            setHistory([]);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, API_URL]);

    // ИСПРАВЛЕННАЯ ФУНКЦИЯ СОХРАНЕНИЯ ПРОГРЕССА
    const saveProgress = useCallback(async (fanficId, scrollPosition, progressPercent) => {
        if (!isAuthenticated) {
            // Для гостя сохраняем в localStorage
            const local = localStorage.getItem(LOCAL_STORAGE_KEY);
            let history = local ? JSON.parse(local) : [];

            const existing = history.findIndex(item => item.id === fanficId);
            
            const newItem = {
                id: fanficId,
                progress: progressPercent,
                last_position: scrollPosition,
                last_read_at: new Date().toISOString()
            };

            if (existing !== -1) {
                history[existing] = newItem;
            } else {
                history.unshift(newItem);
                history = history.slice(0, 20);
            }

            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(history));
            setHistory(history);
            return;
        }

        // Для авторизованного пользователя отправляем на сервер
        try {
            const token = localStorage.getItem('token');
            
            console.log('Отправка прогресса на сервер:', {
                fanficId,
                last_position: scrollPosition,
                progress_percent: progressPercent
            });
            
            const response = await fetch(`${API_URL}/api/fanfics/${fanficId}/progress`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    last_position: scrollPosition,
                    progress_percent: progressPercent
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Ошибка сохранения прогресса:', errorData);
                throw new Error(errorData.error || 'Ошибка сохранения');
            }

            const result = await response.json();
            console.log('✅ Прогресс сохранен на сервере:', result);
            
            // Обновляем локальный список
            await loadHistory();
        } catch (error) {
            console.error('Failed to save progress:', error);
        }
    }, [isAuthenticated, loadHistory, API_URL]);

   // Удаление
    const removeFromHistory = useCallback(async (fanficId) => {
        if (!isAuthenticated) {
            const local = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (local) {
                const filtered = JSON.parse(local).filter(item => item.id !== fanficId);
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
                setHistory(filtered);
            }
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_URL}/api/reading-history/${fanficId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            await loadHistory();
        } catch (error) {
            console.error('Failed to remove:', error);
        }
    }, [isAuthenticated, loadHistory, API_URL]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    return {
        history,
        loading,
        saveProgress,
        removeFromHistory,
        refreshHistory: loadHistory
    };
};