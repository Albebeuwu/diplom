import React, { useState } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from "../../../context/AuthContext";
import "./header.css";
import CreateButton from "../../buttons/CreateButton/CreateButton";
import LoginButton from "../../buttons/LoginButton/LoginButton";

function Header() {
    const navigate = useNavigate();
    const { user, logout, isAuthenticated } = useAuth();
    const [query, setQuery] = useState('');
    const location = useLocation();

    const handleChange = (e) => {
        const value = e.target.value;
        setQuery(value);

        if (location.pathname === '/all-funfics') {
            navigate(`/all-funfics?q=${encodeURIComponent(value)}`, {
                replace: true
            });
        }
    };

    const handleKeyDown = (e) => {
        if (e.key !== 'Enter') return;

        e.preventDefault();

        const value = query.trim();
        if (!value) return;

        navigate(`/all-funfics?q=${encodeURIComponent(value)}`);
    };

    return (
        <header className={`header ${location.pathname === '/' ? 'header-overlay' : ''}`}>
            <div className="logo">
                <img
                    src="/logo.png"
                    alt="Логотип"
                    onClick={() => navigate('/')}
                    style={{ cursor: 'pointer' }}
                />
            </div>

            <div className="interactive-bar">
                <div className="search-bar">
                    <input
                        className="search-bar-input"
                        type="text"
                        placeholder="Поиск фанфиков..."
                        value={query}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                    />
                </div>

                <div className="button_container">
                    <CreateButton onClick={() => navigate('/create-fanfic')} />

                    <LoginButton onClick={() => {
                        if (isAuthenticated) {
                            logout();
                            navigate('/');
                        } else {
                            navigate('/login');
                        }
                    }}>
                        {isAuthenticated ? 'ВЫЙТИ' : 'ВОЙТИ'}
                    </LoginButton>

                    {isAuthenticated && user && (
                        <button
                            className="user-profile"
                            onClick={() => navigate('/profile')}
                        >
                            <div className="user-profile-name">{user.name}</div>
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}


export default Header;
