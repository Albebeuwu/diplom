import React from 'react';
import './RatingCard.css';

function RatingCard({ ratingCode, ratingName, description, color, className = ""}) {
  return (
    <div className={`rating-card ${className}`}>
      <div className="rating-color" style={{ backgroundColor: color }}>
        <p className="rating-code">{ratingCode}</p>
      </div>
      <div className="rating-content">
        <h3 className="rating-title">{ratingName}</h3>
        <p className="rating-card-description">{description}</p>
      </div>
    </div>
  );
}

export default RatingCard;