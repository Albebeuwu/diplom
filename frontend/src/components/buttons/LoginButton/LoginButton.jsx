import React from 'react';
import './LoginButton.css';

function LoginButton({ onClick, className = '', children = 'ВОЙТИ' }) {
  return (
    <button 
      className={`login-button ${className}`}
      onClick={onClick}
    >
      <div className="login-button-text">{children}</div>
    </button>
  );
}

export default LoginButton;