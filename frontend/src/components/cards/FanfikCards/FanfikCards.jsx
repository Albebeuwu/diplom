import React from 'react';
import './FanfikCards.css';

function FanfikCards({
  // Основные данные
  imageUrl = "https://api.builder.io/api/v1/image/assets/TEMP/5e32011b487e0eb811efc63232701e51de4b2510?width=578",
  title = "Вечный Амфориус",
  author = "@Albebe",
  fandom = "Honkai Star Rail",
  description = "Спасут ли герои вселенную, сражаясь и отдавая себя в жертву 33 550 336 циклов? Смогут ли они изменить суть своего бытия и смысл существования?",
  
  // Рейтинг
  rating = "G",
  showRatingLabel = true,

  // Просмотры
  views = 0,
  showViews = true,

  // Авторы
  authorId,
  
  // Категория
  category = "Для вас",
  showCategory = true,
  categoryColor = "#670000",
  
  // Статус
  status = "в процессе",
  showStatus = true,
  
  // Теги
  tags = "Приключения, Драма, Много персонажей, Фэнтези",
  showTags = true,
  
  // Лайки
  likes = 0,
  showLikes = true,
  liked = false,
  onLikeClick,
  
  // Кастомные действия (для разных статусов)
  customActions = [],
  
  // Цвета рейтинга
  ratingColors = {
    'G': 'rgb(148, 215, 128)',     
    'PG': 'rgb(125, 181, 107)',    
    'PG-13': 'rgb(210, 202, 2)', 
    'R': 'rgb(205, 129, 24)',     
    'NC-17': 'rgb(210, 23, 23)',
    'NC-21': 'rgb(103, 0, 0)', 
  },
  
  // Дополнительные опции
  className = "",
  onClick,
  width = 289,
  height = 464,
}) {
  
  // Определяем цвет рейтинга
  const getRatingColor = () => {
    return ratingColors[rating] || 'rgb(148, 215, 128)'; 
  };
  
  const handleCardClick = (e) => {
    if (onClick) {
      onClick(e);
    }
  };
  
  const handleLikeClick = (e) => {
    e.stopPropagation();
    if (onLikeClick) {
      onLikeClick(!liked);
    }
  };
  
  const handleAuthorClick = (e) => {
    e.stopPropagation();
    if (authorId) {
      window.location.href = `/author/${authorId}`;
    }
  }; 

  // Форматирование тегов
  const getTagsArray = () => {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags;
    return tags.split(',').map(tag => tag.trim());
  };
  
  const tagsArray = getTagsArray();
  const displayTags = tagsArray.slice(0, 3);
  const hasMoreTags = tagsArray.length > 3;

  // Определяем статус для отображения
  const getStatusDisplay = () => {
    if (status === 'в процессе') return 'В процессе';
    if (status === 'завершен') return 'Завершен';
    if (status === 'заброшен') return 'Заброшен';
    return status;
  };

  return (
    <article 
      className={`fanfik-card ${className}`}
      style={{ width: `${width}px`, height: `${height}px` }}
      onClick={handleCardClick}
    >
      <div className="fanfik-card-wrapper">
        <img
          src={imageUrl}
          alt={title}
          className="fanfik-card-image"
        />
        <div className="fanfik-card-content">
          {showCategory && (
            <div className="fanfik-category-badge">
              <div className="category-badge-bg"></div>
              <span className="category-badge-text">{category}</span>
            </div>
          )}
          
          <h3 className="fanfik-title">{title}</h3>
          <p className="fanfik-author" onClick={handleAuthorClick}>
            {author}
          </p>
          
          <div className="fanfik-fandom">
            <span className="fandom-label">Фандом:</span>
            <span>{fandom}</span>
          </div>
          
          <p className="fanfik-description">{description}</p>
          
          <div className="rating-status-row">
            {showRatingLabel && (
              <div className="fanfik-rating-label">Рейтинг:</div>
            )}
            <span 
              className="fanfik-rating"
              style={{ color: getRatingColor() }}
            >
              {rating}
            </span>
            
            {showStatus && (
              <p className="fanfik-status">Статус: {getStatusDisplay()}</p>
            )}
          </div>
          
          {showTags && tagsArray.length > 0 && (
            <p className="fanfik-tags">
              Метки: {displayTags.join(', ')}
              {hasMoreTags && ` +${tagsArray.length - 3}`}
            </p>
          )}
          
          <div className="views-likes-row">
            {showViews && (
              <span className="fanfik-views">
                <span className="fanfik-views-icon">👁</span>
                {views || 0}
              </span>
            )}

            {showLikes && (
              <span className="fanfik-likes-count">
                <span className="fanfik-likes-hint">♡</span>
                {likes || 0}
              </span>
            )}
            <svg 
              className="heart-icon" 
              width="34" 
              height="34" 
              viewBox="0 0 34 34" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              onClick={handleLikeClick}
            >
              <circle cx="17" cy="17" r="17" fill="#670000" />
              <path 
                d="M21.4741 10.7181C19.3998 10.6817 17.2242 12.8431 17.2242 12.8431C17.2242 12.8431 14.2482 10.0902 11.9116 10.7181C9.90804 11.2565 9.40912 11.9473 8.72418 13.9056C6.86096 19.2329 17.2242 25.5931 17.2242 25.5931C17.2242 25.5931 28.011 19.0652 25.7242 13.9056C24.7731 11.7598 23.821 10.7593 21.4741 10.7181Z" 
                fill={liked ? "#18181B" : "#670000"} 
                stroke="#18181B" 
              />
            </svg>
          </div>
          
          {/* Кастомные действия для карточки (редактирование, отправка на модерацию и т.д.) */}
          {customActions && customActions.length > 0 && (
            <div className="fanfik-custom-actions">
              {customActions.map((action, index) => (
                <button
                  key={index}
                  className={`custom-action-btn ${action.className || ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    action.onClick();
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default FanfikCards;