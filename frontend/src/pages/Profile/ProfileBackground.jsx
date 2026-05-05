import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Profile.css';

function ProfileBackground() {
    const { user, updateProfile } = useAuth();
    const [backgroundForm, setBackgroundForm] = useState({
        background: null,
        background_opacity: 0.7,
        remove_background: false,
    });
    const [backgroundPreview, setBackgroundPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [hasPremium, setHasPremium] = useState(false); // В будущем получать из API

    useEffect(() => {
        if (user) {
            setBackgroundForm(prev => ({
                ...prev,
                background_opacity: user.background_opacity || 0.7,
            }));
            
            if (user.background_url) {
                setBackgroundPreview(user.background_url);
            }
            
            // Проверяем подписку (заглушка)
            setHasPremium(user.role === 'admin' || true); // Для теста всем разрешаем
        }
    }, [user]);

    const handleBackgroundChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setMessage({ type: 'error', text: 'Размер файла не должен превышать 5MB' });
                return;
            }
            
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                setMessage({ type: 'error', text: 'Разрешенные форматы: JPG, PNG, GIF, WEBP' });
                return;
            }
            
            setBackgroundForm(prev => ({
                ...prev,
                background: file,
                remove_background: false,
            }));
            
            const reader = new FileReader();
            reader.onloadend = () => {
                setBackgroundPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleOpacityChange = (e) => {
        setBackgroundForm(prev => ({
            ...prev,
            background_opacity: parseFloat(e.target.value),
        }));
    };

    const handleRemoveBackground = () => {
        setBackgroundForm(prev => ({
            ...prev,
            background: null,
            remove_background: true,
        }));
        setBackgroundPreview(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!hasPremium) {
            setMessage({ 
                type: 'error', 
                text: 'Для смены фона требуется премиум подписка' 
            });
            return;
        }

        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const formData = new FormData();
            
            if (backgroundForm.background) {
                formData.append('background', backgroundForm.background);
            }
            
            if (backgroundForm.remove_background) {
                formData.append('remove_background', 'true');
            }
            
            formData.append('background_opacity', backgroundForm.background_opacity);

            const response = await updateProfile(formData);
            
            if (response.background_url) {
                localStorage.setItem('custom_background', JSON.stringify({
                    url: response.background_url,
                    opacity: response.background_opacity || 0.7,
                    timestamp: new Date().getTime(),
                }));
                
                // Обновляем превью
                setBackgroundPreview(response.background_url);
            } else if (backgroundForm.remove_background) {
                localStorage.removeItem('custom_background');
                setBackgroundPreview(null);
            }
            
            setMessage({ 
                type: 'success', 
                text: response.message || 'Фон успешно обновлен!' 
            });
            
            // Применяем фон немедленно (опционально)
            if (window.applyCustomBackground) {
                window.applyCustomBackground();
            }
            
        } catch (error) {
            console.error('Ошибка обновления фона:', error);
            
            let errorMessage = 'Ошибка обновления фона';
            if (error.response?.data?.errors) {
                const errors = Object.values(error.response.data.errors).flat();
                errorMessage = errors.join(', ');
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            setMessage({ type: 'error', text: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    if (!hasPremium) {
        return (
            <div className="profile-background premium-required">
                <h3>Фон сайта</h3>
                <div className="premium-message">
                    <div className="premium-icon">👑</div>
                    <p>Для настройки фона сайта требуется премиум подписка</p>
                    <button className="premium-btn" onClick={() => {/* Навигация к подпискам */}}>
                        Получить премиум
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="profile-background">
            <h3>Фон сайта</h3>
            
            {message.text && (
                <div className={`message ${message.type}`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="background-form">
                <div className="background-preview-section">
                    <div className="background-preview">
                        {backgroundPreview ? (
                            <div 
                                className="preview-image"
                                style={{
                                    backgroundImage: `url(${backgroundPreview})`,
                                    opacity: backgroundForm.background_opacity,
                                }}
                            >
                                <div className="overlay"></div>
                            </div>
                        ) : (
                            <div className="preview-placeholder">
                                <div className="placeholder-icon">🎨</div>
                                <p>Фон не установлен</p>
                            </div>
                        )}
                    </div>
                    
                    <div className="background-controls">
                        <div className="upload-control">
                            <input
                                type="file"
                                id="background"
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                onChange={handleBackgroundChange}
                                className="hidden"
                            />
                            <label htmlFor="background" className="upload-btn">
                                <span className="btn-icon">🖼️</span>
                                Выбрать фон
                            </label>
                        </div>
                        
                        {backgroundPreview && (
                            <div className="opacity-control">
                                <label htmlFor="opacity">Прозрачность фона</label>
                                <div className="slider-container">
                                    <input
                                        type="range"
                                        id="opacity"
                                        min="0.1"
                                        max="1"
                                        step="0.1"
                                        value={backgroundForm.background_opacity}
                                        onChange={handleOpacityChange}
                                    />
                                    <span className="opacity-value">
                                        {Math.round(backgroundForm.background_opacity * 100)}%
                                    </span>
                                </div>
                                <p className="help-text">
                                    Приглушенный фон улучшает читаемость текста
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="form-actions">
                    {backgroundPreview && (
                        <button
                            type="button"
                            className="remove-btn"
                            onClick={handleRemoveBackground}
                        >
                            <span className="btn-icon">🗑️</span>
                            Удалить фон
                        </button>
                    )}
                    
                    {(backgroundForm.background || backgroundForm.remove_background) && (
                        <button
                            type="submit"
                            className="save-btn"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner"></span>
                                    Сохранение...
                                </>
                            ) : 'Сохранить фон'}
                        </button>
                    )}
                </div>
            </form>
            
            <div className="background-info">
                <h4>Как работает кастомный фон?</h4>
                <ul>
                    <li>Фон применяется ко всем страницам сайта</li>
                    <li>Автоматически накладывается темный оверлей для читаемости</li>
                    <li>Оптимальный размер: 1920x1080 пикселей</li>
                    <li>Поддерживаются форматы: JPG, PNG, GIF, WEBP</li>
                    <li>Максимальный размер: 5MB</li>
                </ul>
            </div>
        </div>
    );
}

export default ProfileBackground;