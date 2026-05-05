import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './AuthForms.css';

function ForgotPasswordForm() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    
    const { sendPasswordResetCode } = useAuth();

    const validateEmail = (value) => {
        if (!value) return 'Email обязателен';
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(value)) return 'Введите корректный email адрес';
        return '';
    };

    const handleEmailChange = (e) => {
        const value = e.target.value;
        setEmail(value);
        setError(validateEmail(value));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const emailError = validateEmail(email);
        if (emailError) {
            setError(emailError);
            return;
        }
        
        setError('');
        setLoading(true);
        
        try {
            await sendPasswordResetCode(email);
            setSuccess(true);
            // Переходим на страницу подтверждения кода
            setTimeout(() => {
                navigate('/verify-code', { 
                    state: { 
                        mode: 'reset',
                        email: email 
                    } 
                });
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Ошибка при отправке кода');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        navigate('/login');
    };

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
                        color: '#450a0a',
                        cursor: 'pointer',
                        fontSize: '1rem'
                    }}
                >
                    ← Назад
                </button>
                
                <h2>Восстановление пароля</h2>
                
                {success && (
                    <div className="auth-success" style={{
                        backgroundColor: '#d4edda',
                        color: '#155724',
                        padding: '10px',
                        borderRadius: '4px',
                        marginBottom: '15px'
                    }}>
                        Код восстановления отправлен на ваш email. Перенаправляем...
                    </div>
                )}
                
                {error && <div className="auth-error">{error}</div>}
                
                <p style={{ textAlign: 'center', marginBottom: '20px', color: '#666' }}>
                    Введите ваш email, и мы отправим код для восстановления пароля
                </p>
                
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
                </div>
                
                <button 
                    type="submit" 
                    className="auth-button"
                    disabled={loading || success}
                >
                    {loading ? 'Отправка...' : 'Отправить код'}
                </button>
                
                <div className="auth-links">
                    <button 
                        type="button"
                        className="auth-link-button"
                        onClick={() => navigate('/login')}
                    >
                        Вернуться к входу
                    </button>
                </div>
            </form>
        </div>
    );
}

export default ForgotPasswordForm;