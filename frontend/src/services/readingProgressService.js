import api from './api';

class ReadingProgressService {
    // Сохранить прогресс чтения
    async saveProgress(fanficId, scrollPosition, chapter = null, lastReadAt = new Date().toISOString(), containerHeight = null) {
        try {
            const token = localStorage.getItem('token');
            if (!token) return null;
            
            // Вычисляем процент на основе переданных данных
            let progressPercentage = 0;
            if (containerHeight && containerHeight.totalHeight && containerHeight.clientHeight) {
                const maxScroll = containerHeight.totalHeight - containerHeight.clientHeight;
                progressPercentage = maxScroll > 0 
                    ? Math.floor((scrollPosition / maxScroll) * 100) 
                    : 100;
            }
            
            const updatedProgress = {
                fanficId,
                scrollPosition,
                chapter,
                lastReadAt,
                progressPercentage
            };
            
            // Сохраняем в localStorage
            const allProgress = this.getAllProgress();
            allProgress[fanficId] = updatedProgress;
            localStorage.setItem('reading_progress', JSON.stringify(allProgress));
            
            console.log(`Прогресс сохранен: ${progressPercentage}%`, updatedProgress);
            
            await this.syncToServer(fanficId, scrollPosition, chapter);
            
            return updatedProgress;
        } catch (error) {
            console.error('Ошибка сохранения прогресса:', error);
            return null;
        }
    }
    
    // Получить прогресс для конкретного фанфика
    getProgress(fanficId) {
        try {
            const allProgress = this.getAllProgress();
            return allProgress[fanficId] || null;
        } catch (error) {
            console.error('Ошибка получения прогресса:', error);
            return null;
        }
    }
    
    // Получить все прогрессы
    getAllProgress() {
        try {
            const saved = localStorage.getItem('reading_progress');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('Ошибка парсинга прогресса:', error);
            return {};
        }
    }
    
    // Получить карточки для продолжения чтения
    getReadingCards() {
        const allProgress = this.getAllProgress();
        const fanficIds = Object.keys(allProgress);
        
        // Сортируем по дате последнего чтения
        const sortedIds = fanficIds.sort((a, b) => {
            const dateA = new Date(allProgress[a].lastReadAt);
            const dateB = new Date(allProgress[b].lastReadAt);
            return dateB - dateA;
        });
        
        // Возвращаем только ID, данные фанфиков будем загружать отдельно
        return sortedIds.map(id => ({
            id: parseInt(id),
            progress: allProgress[id].progressPercentage,
            scrollPosition: allProgress[id].scrollPosition,
            lastReadAt: allProgress[id].lastReadAt
        }));
    }
    
    // Удалить прогресс (когда фанфик удален из продолжения чтения)
    removeProgress(fanficId) {
        try {
            const allProgress = this.getAllProgress();
            delete allProgress[fanficId];
            localStorage.setItem('reading_progress', JSON.stringify(allProgress));
            
            // Также удаляем с сервера (опционально)
            this.removeFromServer(fanficId);
            
            return true;
        } catch (error) {
            console.error('Ошибка удаления прогресса:', error);
            return false;
        }
    }
    
    // Очистить все прогрессы
    clearAllProgress() {
        localStorage.removeItem('reading_progress');
    }
    
    // Рассчитать процент прочтения на основе скролла
    calculatePercentage(scrollPosition, totalHeight, clientHeight) {
        // Если не переданы размеры контейнера, возвращаем 0
        if (!totalHeight || !clientHeight) return 0;
        
        const maxScroll = totalHeight - clientHeight;
        if (maxScroll <= 0) return 100; // Если контент помещается на экране
        
        return Math.min(100, Math.max(0, Math.floor((scrollPosition / maxScroll) * 100)));
    }
    
    // Синхронизация с сервером (опционально)
    async syncToServer(fanficId, scrollPosition, chapter) {
        try {
            console.log('Прогресс сохранен локально:', { fanficId, scrollPosition, chapter });
        } catch (error) {
            console.error('Ошибка синхронизации с сервером:', error);
        }
    }
    
    async removeFromServer(fanficId) {
        try {
            // Если у вас есть API для удаления прогресса
            // await api.delete(`/reading-progress/${fanficId}`);
            console.log('Прогресс удален:', fanficId);
        } catch (error) {
            console.error('Ошибка удаления с сервера:', error);
        }
    }
}

export const readingProgressService = new ReadingProgressService();