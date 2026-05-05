import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './AuthForms.css';

function VerifyCode() {
    const navigate = useNavigate();
    const location = useLocation();

    const {
        verifyAndRegister,
        sendPasswordResetCode,
        resetPassword,
        resendRegistrationCode
    } = useAuth();

    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [email, setEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [timer, setTimer] = useState(60);
    const [canResend, setCanResend] = useState(false);
    const [step, setStep] = useState('verify');

    const inputRefs = useRef([]);

    const mode = location.state?.mode || 'registration';
    const userEmail = location.state?.email || '';

    useEffect(() => {
        if (userEmail) setEmail(userEmail);
    }, [userEmail]);

    useEffect(() => {
        if (canResend) return;

        const interval = setInterval(() => {
            setTimer(prev => {
                if (prev <= 1) {
                    setCanResend(true);
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [canResend]);

    const handleCodeChange = (index, value) => {
        if (!/^\d?$/.test(value)) return;

        const newCode = [...code];
        newCode[index] = value;
        setCode(newCode);

        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        if (newCode.every(d => d !== '')) {
            handleVerify(newCode.join(''));
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length !== 6) return;

        const newCode = pasted.split('');
        setCode(newCode);
        inputRefs.current[5]?.focus();
        handleVerify(pasted);
    };

    const handleVerify = async (fullCode) => {
        if (loading) return;

        const codeToVerify = fullCode || code.join('');
        if (codeToVerify.length !== 6) {
            setError('Введите полный код подтверждения');
            return;
        }

        setError('');
        setLoading(true);

        try {
            if (mode === 'registration') {
                await verifyAndRegister(email, codeToVerify);
                navigate('/');
            } else {
                setStep('newPassword');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Ошибка подтверждения кода');
            setCode(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();

        if (newPassword !== newPasswordConfirmation) {
            setError('Пароли не совпадают');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await resetPassword(email, code.join(''), newPassword, newPasswordConfirmation);
            navigate('/login', {
                state: { message: 'Пароль успешно изменён' }
            });
        } catch (err) {
            setError(err.response?.data?.message || 'Ошибка при смене пароля');
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        setLoading(true);
        setError('');

        try {
            if (mode === 'registration') {
                await resendRegistrationCode(email);
            } else {
                await sendPasswordResetCode(email);
            }

            setTimer(60);
            setCanResend(false);
            setCode(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } catch (err) {
            setError(err.response?.data?.message || 'Ошибка при повторной отправке');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        if (step === 'newPassword') {
            setStep('verify');
        } else {
            navigate(mode === 'registration' ? '/register' : '/login');
        }
    };

    if (step === 'newPassword') {
        return (
            <div className="auth-form-container">
                <form className="auth-form" onSubmit={handleResetPassword}>
                    <button type="button" className="back-button" onClick={handleBack}>← Назад</button>

                    <h2>Новый пароль</h2>
                    {error && <div className="auth-error">{error}</div>}

                    <input
                        type="password"
                        placeholder="Новый пароль"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        required
                    />

                    <input
                        type="password"
                        placeholder="Повторите пароль"
                        value={newPasswordConfirmation}
                        onChange={e => setNewPasswordConfirmation(e.target.value)}
                        required
                    />

                    <button disabled={loading}>
                        {loading ? 'Сохранение...' : 'Сохранить'}
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="auth-form-container">
            <form className="auth-form" onSubmit={e => e.preventDefault()}>
                <button type="button" className="back-button" onClick={handleBack}>← Назад</button>

                <h2>{mode === 'registration' ? 'Подтверждение email' : 'Восстановление пароля'}</h2>
                <p>Код отправлен на <strong>{email}</strong></p>

                {error && <div className="auth-error">{error}</div>}

                <div className="code-inputs">
                    {code.map((digit, i) => (
                        <input
                            className='code-input'
                            key={i}
                            value={digit}
                            maxLength="1"
                            onChange={e => handleCodeChange(i, e.target.value)}
                            onKeyDown={e => handleKeyDown(i, e)}
                            onPaste={i === 0 ? handlePaste : undefined}
                            ref={el => inputRefs.current[i] = el}
                        />
                    ))}
                </div>
                
                <div className='verify-buttons'>
                    {canResend ? (
                        <button type="button" className='resend-button' onClick={handleResendCode}>Отправить код снова</button>
                    ) : (
                        <p>Повторно через {timer} сек.</p>
                    )}

                    <button
                        className='auth-success '
                        disabled={loading || code.some(d => !d)}
                        onClick={() => handleVerify()}
                    >
                        {loading ? 'Проверка...' : 'Подтвердить'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default VerifyCode;
