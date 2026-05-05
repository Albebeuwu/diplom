import React from 'react';
import './MiniCards.css';

function MiniCards({ 
    id,
    title, 
    description, 
    likes, 
    avatarColor,
    progress,
    onClick,
    onRemove
}) {
    return (
        <div className="mini-card" onClick={onClick}>
            <div className="mini-card-avatar" style={{ backgroundColor: avatarColor || '#670000' }}>
                {title?.charAt(0) || '?'}
            </div>
            <div className="mini-card-content">
                <h3 className="mini-card-title">{title}</h3>
                <p className="mini-card-description">{description}</p>
                <div className="mini-card-meta">
                    <span className="mini-card-likes">♡ {likes}</span>
                    {progress !== undefined && (
                        <div className="mini-card-progress">
                            <div className="progress-bar-card">
                                <div 
                                    className="progress-fill" 
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <span className="progress-text-card">{progress}%</span>
                        </div>
                    )}
                </div>
            </div>
            {onRemove && (
                <button 
                    className="mini-card-remove"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    title="Убрать из продолжения чтения"
                >
                    ✕
                </button>
            )}
        </div>
    );
}

export default MiniCards;