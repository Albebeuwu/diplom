import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './AuthForms.css';

function LoginForm() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [blockedInfo, setBlockedInfo] = useState(null); // Новое состояние для информации о блокировке
    
    const { login } = useAuth();

    // Валидация email
    const validateEmail = (value) => {
        if (!value) return 'Email обязателен';
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(value)) return 'Введите корректный email адрес';
        return '';
    };

    // Упрощенная валидация пароля
    const validatePassword = (value) => {
        if (!value) return 'Пароль обязателен';
        if (value.length < 5) return 'Пароль должен быть не менее 5 символов';
        if (!/^[a-zA-Z0-9]+$/.test(value)) {
            return 'Пароль может содержать только английские буквы и цифры';
        }
        return '';
    };

    const handleEmailChange = (e) => {
        const value = e.target.value.replace(/[<>\/\\'"]/g, '');
        setEmail(value);
        setEmailError(validateEmail(value));
        setBlockedInfo(null); // Сбрасываем информацию о блокировке при изменении email
    };

    const handlePasswordChange = (e) => {
        const value = e.target.value;
        setPassword(value);
        setPasswordError(validatePassword(value));
        setBlockedInfo(null); // Сбрасываем информацию о блокировке при изменении пароля
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Валидация на клиенте
        const emailValidation = validateEmail(email);
        const passwordValidation = validatePassword(password);
        
        if (emailValidation || passwordValidation) {
            setEmailError(emailValidation);
            setPasswordError(passwordValidation);
            return;
        }
        
        setError('');
        setLoading(true);
        setBlockedInfo(null);
        
        try {
            const cleanEmail = email.replace(/[<>\/\\'"]/g, '');
            await login(cleanEmail, password);
            navigate('/');
        } catch (err) {
            // Проверяем, не заблокирован ли пользователь
            if (err.response?.data?.blocked) {
                setBlockedInfo({
                    reason: err.response.data.block_reason,
                    blocked_at: err.response.data.blocked_at
                });
            } else if (err.response?.data?.errors) {
                const errors = err.response.data.errors;
                if (errors.email) {
                    setEmailError(errors.email[0]);
                }
                if (errors.password) {
                    setPasswordError(errors.password[0]);
                }
            } else {
                setError(err.response?.data?.message || 'Ошибка входа');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        navigate('/');
    };

    const handleRegisterClick = (e) => {
        e.preventDefault();
        navigate('/register');
    };

    // Компонент для отображения информации о блокировке
    const BlockedMessage = ({ info }) => (
        <div className="blocked-message">
            <div className='stars'> 
                <img src='/images/icons/star.png' className='star' alt='' />
                <img src='/images/icons/star.png' className='star' alt='' />
                <img src='/images/icons/star.png' className='star' alt='' />
                <img src='/images/icons/star.png' className='star' alt='' />
                <img src='/images/icons/star.png' className='star' alt='' />
                <img src='/images/icons/star.png' className='star' alt='' />
                <img src='/images/icons/star.png' className='star' alt='' />
            </div>
            <div className="blocked-icon">🛇</div>
            <h3>Аккаунт заблокирован</h3>
            <p className="blocked-reason">
                <strong>Причина:</strong> {info.reason}
            </p>
            <p className="blocked-date">
                Дата блокировки:{' '}
                {new Date(info.blocked_at).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}
            </p>
            <button 
                className="back-to-login-btn"
                onClick={() => setBlockedInfo(null)}
            >
                Назад к форме входа
            </button>
        </div>
    );

    return (
        <div className="auth-form-container">
            <form className="auth-form" onSubmit={handleSubmit}>
                <button 
                    type="button" 
                    className="back-button" 
                    onClick={handleBack}
                    style={{
                        position: 'absolute',
                        top: '20px',
                        left: '20px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1rem'
                    }}
                >
                    ← На главную
                </button>
                
                <h2>Вход</h2>
                
                {blockedInfo ? (
                    <BlockedMessage info={blockedInfo} />
                ) : (
                    <>
                        <div className='stars'> 
                            <img src='/images/icons/star.png' className='star' alt='' />
                            <img src='/images/icons/star.png' className='star' alt='' />
                            <img src='/images/icons/star.png' className='star' alt='' />
                            <img src='/images/icons/star.png' className='star' alt='' />
                            <img src='/images/icons/star.png' className='star' alt='' />
                            <img src='/images/icons/star.png' className='star' alt='' />
                            <img src='/images/icons/star.png' className='star' alt='' />
                        </div>
                        {error && <div className="auth-error">{error}</div>}
                        
                        <div className="form-group-auth">
                            <label htmlFor="email">Email</label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={handleEmailChange}
                                required
                                placeholder="example@domain.com"
                                pattern="[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
                            />
                            {emailError && <div className="input-error">{emailError}</div>}
                        </div>
                        
                        <div className="form-group-auth">
                            <label htmlFor="password">Пароль</label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={handlePasswordChange}
                                required
                                minLength="5"
                                placeholder="Минимум 5 символов (английские буквы и цифры)"
                                pattern="[a-zA-Z0-9]+"
                            />
                            {passwordError && <div className="input-error">{passwordError}</div>}
                            <small className="password-hint">
                                Только английские буквы (A-Z, a-z) или цифры (0-9)
                            </small>
                        </div>
                        
                        <button 
                            type="submit" 
                            className="auth-button"
                            disabled={loading || emailError || passwordError}
                        >
                            {loading ? 'Вход...' : 'Войти'}
                        </button>
                        
                        <div className="auth-links">
                            <button 
                                type="button"
                                className="auth-link-button"
                                onClick={() => navigate('/forgot-password')}
                                style={{ marginRight: '10px' }}
                            >
                                Забыли пароль?
                            </button>
                            <button 
                                type="button"
                                className="auth-link-button"
                                onClick={handleRegisterClick}
                            >
                                Нет аккаунта? Зарегистрируйтесь
                            </button>
                        </div>
                    </>
                )}
            </form>
            <div className="right-bg-image"><img src='/images/bg/right-bg-image.jpg' alt='' /></div>
        </div>
    );
}

export default LoginForm;