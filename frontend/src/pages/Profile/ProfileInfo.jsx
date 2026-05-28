import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Profile.css';

function ProfileInfo() {
    const { user, updateProfile } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        birthday: '',
        bio: '',
        avatar: null,
        remove_avatar: false,
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [avatarPreview, setAvatarPreview] = useState(null);

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                birthday: user.birthday || '',
                bio: user.bio || '',
                avatar: null,
                remove_avatar: false,
            });
            
            // Устанавливаем превью аватарки
            if (user.avatar_url) {
                setAvatarPreview(user.avatar_url);
            } else {
                const initials = user.name ? user.name.charAt(0).toUpperCase() : 'U';
                setAvatarPreview(`https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=450a0a&color=fff&size=150`);
            }
        }
    }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                setMessage({ type: 'error', text: 'Размер файла не должен превышать 2MB' });
                return;
            }
            
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
            if (!allowedTypes.includes(file.type)) {
                setMessage({ type: 'error', text: 'Разрешенные форматы: JPG, PNG, GIF' });
                return;
            }
            
            setFormData(prev => ({
                ...prev,
                avatar: file,
                remove_avatar: false,
            }));
            
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveAvatar = () => {
        setFormData(prev => ({
            ...prev,
            avatar: null,
            remove_avatar: true,
        }));
        setAvatarPreview(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const formDataToSend = new FormData();
            
            if (formData.name !== user.name) {
                formDataToSend.append('name', formData.name);
            }
            if (formData.email !== user.email) {
                formDataToSend.append('email', formData.email);
            }
            if (formData.phone) formDataToSend.append('phone', formData.phone);
            if (formData.birthday) formDataToSend.append('birthday', formData.birthday);
            if (formData.bio) formDataToSend.append('bio', formData.bio);
            
            if (formData.avatar) {
                formDataToSend.append('avatar', formData.avatar);
            }
            
            if (formData.remove_avatar) {
                formDataToSend.append('remove_avatar', 'true');
            }

            const response = await updateProfile(formDataToSend);
            
            setMessage({ 
                type: 'success', 
                text: response.message || 'Профиль успешно обновлен!' 
            });
            setIsEditing(false);
            
            // Обновляем превью аватарки
            if (response.user?.avatar_url) {
                setAvatarPreview(response.user.avatar_url);
            }
            
        } catch (error) {
            console.error('Ошибка обновления профиля:', error);
            
            let errorMessage = 'Ошибка обновления профиля';
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

    const getInitials = (name) => {
        if (!name) return 'U';
        return name.charAt(0).toUpperCase();
    };

    return (
        <div className="profile-info-new">
            <div className="profile-header-new">
                <button 
                    className={`edit-btn-new ${isEditing ? 'cancel' : ''}`}
                    onClick={() => {
                        if (isEditing) {
                            setFormData({
                                name: user.name || '',
                                email: user.email || '',
                                phone: user.phone || '',
                                birthday: user.birthday || '',
                                bio: user.bio || '',
                                avatar: null,
                                remove_avatar: false,
                            });
                            setAvatarPreview(user.avatar_url || 
                                `https://ui-avatars.com/api/?name=${getInitials(user?.name)}&background=450a0a&color=fff&size=150`);
                        }
                        setIsEditing(!isEditing);
                    }}
                >
                    {isEditing ? 'Отмена' : 'Редактировать'}
                </button>
            </div>

            {message.text && (
                <div className={`message-new ${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="profile-content-new">
                <form onSubmit={handleSubmit} className="profile-form-new">
                    {/* Блок аватарки */}
                    <div className="avatar-block-new">
                        <div className="avatar-section-new">
                            <div>
                                <p className="avatar-label">АВАТАРКА</p>
                                <div className="avatar-preview-new">
                                    {avatarPreview ? (
                                        <img 
                                            src={avatarPreview} 
                                            alt="Аватар" 
                                            className="avatar-circle-new"
                                        />
                                    ) : (
                                        <div className="avatar-circle-new initials">
                                            {getInitials(formData.name)}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {isEditing && (
                                <div className="avatar-upload-new">
                                    <input
                                        type="file"
                                        id="avatar"
                                        accept="image/jpeg,image/png,image/gif"
                                        onChange={handleAvatarChange}
                                        className="hidden"
                                    />
                                    <label htmlFor="avatar" className="change-avatar-btn">
                                        ИЗМЕНИТЬ АВАТАРКУ
                                    </label>
                                    {avatarPreview && (
                                        <button 
                                            type="button"
                                            className="remove-avatar-btn"
                                            onClick={handleRemoveAvatar}
                                        >
                                            УДАЛИТЬ
                                        </button>
                                    )}
                                </div>
                            )}
                            {/* Информация о подписке */}
                            <div className="subscription-info-new">
                                {(() => {
                                    const subscription = localStorage.getItem('paid_subscription');
                                    const sub = subscription ? JSON.parse(subscription) : null;
                                    const isActive = sub && new Date(sub.end_date) > new Date();
                                    
                                    if (isActive) {
                                        const daysLeft = Math.ceil((new Date(sub.end_date) - new Date()) / (1000 * 60 * 60 * 24));
                                        return (
                                            <>
                                                <div className="subscription-field">
                                                    <span className="subscription-label">ТАРИФ ПОДПИСКИ:</span>
                                                    <span className="subscription-value" style={{ 
                                                        color: sub.plan_id === 'base' ? '#8B7355' : sub.plan_id === 'hype' ? '#FF6B35' : '#9B59B6'
                                                    }}>
                                                        {sub.plan_name}
                                                    </span>
                                                </div>
                                                <div className="subscription-field">
                                                    <span className="subscription-label">ДНЕЙ ДО ОКОНЧАНИЯ ПОДПИСКИ:</span>
                                                    <span className="subscription-value">{daysLeft}</span>
                                                </div>
                                            </>
                                        );
                                    } else {
                                        return (
                                            <>
                                                <div className="subscription-field">
                                                    <span className="subscription-label">ТАРИФ ПОДПИСКИ:</span>
                                                    <span className="subscription-value" style={{ color: '#888' }}>Бесплатный</span>
                                                </div>
                                                <div className="subscription-field">
                                                    <button 
                                                        className="subscribe-btn-inline"
                                                        onClick={() => window.location.href = '/profile?tab=paid-subscription'}
                                                        style={{
                                                            background: 'linear-gradient(135deg, #ff6b35, #ff4757)',
                                                            border: 'none',
                                                            padding: '6px 16px',
                                                            borderRadius: '20px',
                                                            color: '#fff',
                                                            cursor: 'pointer',
                                                            fontSize: '12px',
                                                            marginTop: '8px'
                                                        }}
                                                    >
                                                        Оформить подписку
                                                    </button>
                                                </div>
                                            </>
                                        );
                                    }
                                })()}
                            </div>

                        </div>
                    </div>

                    {/* Основная информация */}
                    <div className="info-grid-new">
                        {/* Имя пользователя */}
                        <div className="info-field-new">
                            <label className="field-label-new">ИМЯ ПОЛЬЗОВАТЕЛЯ</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="field-input-new"
                                    placeholder="Введите имя"
                                />
                            ) : (
                                <div className="field-value-new">{formData.name}</div>
                            )}
                            <div className="field-hint-new">ВЫ МОЖЕТЕ ПОМЕНЯТЬ ЕГО В ЛЮБОЕ ВРЕМЯ</div>
                        </div>

                        {/* Почта */}
                        <div className="info-field-new">
                            <label className="field-label-new">ПОЧТА</label>
                            {isEditing ? (
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="field-input-new"
                                    placeholder="Введите email"
                                />
                            ) : (
                                <div className="field-value-new">{formData.email}</div>
                            )}
                            <div className="field-hint-new">ВЫ МОЖЕТЕ ПОМЕНЯТЬ ЕГО В ЛЮБОЕ ВРЕМЯ</div>
                        </div>

                    </div>

                    {/* Кнопка сохранения */}
                    {isEditing && (
                        <div className="form-actions-new">
                            <button
                                type="submit"
                                className="save-btn-new"
                                disabled={loading || !formData.name || !formData.email}
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner"></span>
                                        Сохранение...
                                    </>
                                ) : 'СОХРАНИТЬ'}
                            </button>
                        </div>
                    )}
                </form>

                {/* Дополнительная информация об аккаунте */}
                <div className="account-info-new">
                    <h3>Информация об аккаунте</h3>
                    <div className="info-grid-account">
                        <div className="info-item-new">
                            <span className="info-label-new">Дата регистрации:</span>
                            <span className="info-value-new">
                                {user?.created_at ? new Date(user.created_at).toLocaleDateString('ru-RU') : 'Неизвестно'}
                            </span>
                        </div>
                        <div className="info-item-new">
                            <span className="info-label-new">Роль:</span>
                            <span className="info-value-new role-badge">
                                {user?.role === 'admin' ? 'Администратор' : 'Пользователь'}
                            </span>
                        </div>
                        <div className="info-item-new">
                            <span className="info-label-new">Статус аккаунта:</span>
                            <span className="info-value-new active">✅ Активен</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ProfileInfo;