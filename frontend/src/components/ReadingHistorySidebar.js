import React from 'react';

import { useReadingHistory } from '../hooks/useReadingHistory';
import CardSidebar from './cards/CardSidebar/CardSidebar';

function ReadingHistorySidebar() {
    // Используем наш хук для получения истории
    const { history, loading, removeFromHistory } = useReadingHistory();

    const handleCardClick = (fanficId) => {
        // Переход к чтению фанфика
        window.location.href = `/fanfic/${fanficId}`;
    };

    return (
        <CardSidebar
            title="Продолжить чтение"
            cards={history}
            loading={loading}
            emptyMessage="Нет фанфиков в процессе чтения"
            onCardClick={handleCardClick}
            onRemoveCard={removeFromHistory}
        />
    );
}

export default ReadingHistorySidebar;