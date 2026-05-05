import React from 'react';
import './CardSidebar.css'; 
import MiniCards from '../miniCards/MiniCards';

function CardSidebar({ 
    title = "Заголовок", 
    cards = [], 
    loading = false, 
    emptyMessage = "Нет данных",
    className = "",
    onCardClick,
    onRemoveCard // Добавляем обработчик удаления
}) {
    return (
        <aside className={`home-sidebar ${className}`}>
            <h2 className="home-sidebar-title">{title}</h2>
            
            <div className="popular-cards">
                {loading ? (
                    <>
                        <MiniCards 
                            title="Загрузка..."
                            description="Данные загружаются"
                            likes="..."
                        />
                        <MiniCards 
                            title="Загрузка..."
                            description="Данные загружаются"
                            likes="..."
                        />
                        <MiniCards
                            title="Загрузка..."
                            description="Данные загружаются"
                            likes="..."
                        />
                    </>
                ) : cards.length === 0 ? (
                    <div className="empty-state">
                        <p>{emptyMessage}</p>
                    </div>
                ) : (
                    cards.map(card => (
                        <MiniCards
                            key={card.id}
                            id={card.id}
                            title={card.title}
                            description={card.description}
                            likes={card.likes}
                            avatarColor={card.avatarColor}
                            progress={card.progress} // Передаем прогресс
                            onClick={() => onCardClick && onCardClick(card.id)}
                            onRemove={onRemoveCard ? () => onRemoveCard(card.id) : null}
                        />
                    ))
                )}
            </div>
        </aside>
    );
}

export default CardSidebar;