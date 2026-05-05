import React from 'react';
import './CreateButton.css';

function CreateButton({ onClick, className = '' }) {
  return (
    <button 
      className={`create-button ${className}`}
      onClick={onClick}
    >
      <div className="create-button-text">Создать</div>
      <div className="create-icon-container">
        <div className="plus-text">+</div>
      </div>
    </button>
  );
}

export default CreateButton;