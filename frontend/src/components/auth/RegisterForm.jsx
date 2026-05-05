// src/components/auth/RegisterForm.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './AuthForms.css';

function RegisterForm() {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [nameError, setNameError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    
    const { sendRegistrationCode } = useAuth();

    const validateName = (value) => {
        if (!value) return 'Имя обязательно';
        if (value.length < 2) return 'Имя должно быть не менее 2 символов';
        if (value.length > 50) return 'Имя должно быть не более 50 символов';
        // Упрощаем регулярное выражение для проверки
        if (!/^[a-zA-Zа-яА-ЯёЁ\s\-\.]+$/.test(value)) {
            return 'Имя может содержать только буквы, пробелы, тире и точки';
        }
        return '';
    };

    const validateEmail = (value) => {
        if (!value) return 'Email обязателен';
        // Упрощаем регулярное выражение для email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return 'Введите корректный email адрес';
        // Дополнительная проверка на наличие точки после @
        if (!value.includes('.')) return 'Введите корректный email адрес';
        return '';
    };

    const validatePassword = (value) => {
        if (!value) return 'Пароль обязателен';
        if (value.length < 5) return 'Пароль должен быть не менее 5 символов';
        // Проверяем только латиницу и цифры
        if (!/^[a-zA-Z0-9]+$/.test(value)) {
            return 'Пароль может содержать только английские буквы и цифры';
        }
        return '';
    };

    const handleNameChange = (e) => {
        const value = e.target.value;
        setName(value);
        setNameError(validateName(value));
    };

    const handleEmailChange = (e) => {
        const value = e.target.value;
        setEmail(value);
        setEmailError(validateEmail(value));
    };

    const handlePasswordChange = (e) => {
        const value = e.target.value;
        setPassword(value);
        setPasswordError(validatePassword(value));
    };

    const handlePasswordConfirmationChange = (e) => {
        const value = e.target.value;
        setPasswordConfirmation(value);
        if (password && value !== password) {
            setError('Пароли не совпадают');
        } else {
            setError('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const nameValidation = validateName(name);
        const emailValidation = validateEmail(email);
        const passwordValidation = validatePassword(password);
        
        setNameError(nameValidation);
        setEmailError(emailValidation);
        setPasswordError(passwordValidation);
        
        if (nameValidation || emailValidation || passwordValidation) {
            return;
        }
        
        if (password !== passwordConfirmation) {
            setError('Пароли не совпадают');
            return;
        }
        
        // Очистка от возможных вредоносных символов
        const cleanName = name.replace(/[<>\/\\'"]/g, '');
        const cleanEmail = email.replace(/[<>\/\\'"]/g, '');
        
        setError('');
        setLoading(true);
        
        try {
            console.log('Отправка данных регистрации:', { name: cleanName, email: cleanEmail });
            await sendRegistrationCode(cleanName, cleanEmail, password, passwordConfirmation);
            // Переходим на страницу подтверждения кода
            navigate('/verify-code', { 
                state: { 
                    mode: 'registration',
                    email: cleanEmail 
                } 
            });
        } catch (err) {
            console.error('Ошибка регистрации:', err);
            console.error('Ответ сервера:', err.response?.data);
            
            if (err.response?.data?.errors) {
                const errors = err.response.data.errors;
                if (errors.name) {
                    setNameError(errors.name[0]);
                }
                if (errors.email) {
                    setEmailError(errors.email[0]);
                }
                if (errors.password) {
                    setPasswordError(errors.password[0]);
                }
            } else {
                setError(err.response?.data?.message || 'Ошибка регистрации');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        navigate('/');
    };

    const handleLoginClick = (e) => {
        e.preventDefault();
        navigate('/login');
    };

    return (
        <div className="auth-form-container">
            <form className="auth-form" onSubmit={handleSubmit} noValidate>
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
                        fontSize: '1rem',
                        zIndex: 10
                    }}
                >
                    ← На главную
                </button>
                
                <h2>Регистрация</h2>

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
                    <label htmlFor="name">Имя пользователя</label>
                    <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={handleNameChange}
                        required
                        maxLength="50"
                        minLength="2"
                        placeholder="Только буквы, пробелы, тире и точки"
                        className={nameError ? 'error' : ''}
                    />
                    {nameError && <div className="input-error">{nameError}</div>}
                </div>
                
                <div className="form-group-auth">
                    <label htmlFor="email">Email</label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={handleEmailChange}
                        required
                        placeholder="example@domain.com"
                        className={emailError ? 'error' : ''}
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
                        className={passwordError ? 'error' : ''}
                    />
                    {passwordError && <div className="input-error">{passwordError}</div>}
                    <small className="password-hint">
                        Минимум 5 символов. Только английские буквы (A-Z, a-z) и цифры (0-9)
                    </small>
                </div>
                
                <div className="form-group-auth">
                    <label htmlFor="passwordConfirmation">Подтверждение пароля</label>
                    <input
                        type="password"
                        id="passwordConfirmation"
                        value={passwordConfirmation}
                        onChange={handlePasswordConfirmationChange}
                        required
                        minLength="5"
                        placeholder="Повторите пароль"
                    />
                </div>
                
                <button 
                    type="submit" 
                    className="auth-button"
                    disabled={loading}
                >
                    {loading ? 'Отправка...' : 'Зарегистрироваться'}
                </button>
                
                <div className="auth-links">
                    <button 
                        type="button"
                        className="auth-link-button"
                        onClick={handleLoginClick}
                    >
                        Уже есть аккаунт? Войдите
                    </button>
                </div>
            </form>
            <div className="right-bg-image"><img src='/images/bg/right-bg-image.jpg' alt='' /></div>
        </div>
    );
}

export default RegisterForm;