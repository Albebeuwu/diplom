import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';
import { fanficService } from '../../services/fanficService';
import FileUploader from '../../components/file/FileUploader';
import './CreateFanficPage.css';

function CreateFanficPage() {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const { hasSubscription, planId } = useSubscription();
    
    // Проверка на подписку Hype или выше
    const hasHypeOrHigher = hasSubscription && (planId === 'hype' || planId === 'chitun');
    
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        content_file: null, 
        rating_id: '',
        fandom: '',
        work_status: 'in_progress',
        tags: [],
        cover_image: null,
        is_early_access: false,
        days_early_access: 7,
        is_exclusive: false,
    });

    const [formErrors, setFormErrors] = useState({});
    const [ratings, setRatings] = useState([]);
    const [allTags, setAllTags] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [previewImage, setPreviewImage] = useState(null);
    const [saveAsDraft, setSaveAsDraft] = useState(true);

    // Перенаправление если не авторизован
    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
        }
    }, [isAuthenticated, navigate]);

    // Загрузка данных для формы
    useEffect(() => {
        const loadFormData = async () => {
            try {
                const [ratingsData, tagsData] = await Promise.all([
                    fanficService.getRatings(),
                    fanficService.getTags(),
                ]);
                
                setRatings(ratingsData);
                setAllTags(tagsData);
            } catch (err) {
                console.error('Ошибка загрузки данных:', err);
                setError('Не удалось загрузить данные формы');
            }
        };

        loadFormData();
    }, []);

    // Обработчик для чекбокса раннего доступа
    const handleEarlyAccessChange = (e) => {
        setFormData(prev => ({
            ...prev,
            is_early_access: e.target.checked
        }));
    };

    // Обработчик для эксклюзивного контента
    const handleExclusiveChange = (e) => {
        setFormData(prev => ({
            ...prev,
            is_exclusive: e.target.checked
        }));
    };

    // Обработчики изменений полей
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
        // Очищаем ошибку для этого поля
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleTagToggle = (tagId) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.includes(tagId)
                ? prev.tags.filter(id => id !== tagId)
                : [...prev.tags, tagId],
        }));
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                setFormErrors(prev => ({
                    ...prev,
                    cover_image: 'Размер файла не должен превышать 2MB'
                }));
                return;
            }

            setFormData(prev => ({
                ...prev,
                cover_image: file,
            }));

            // Очищаем ошибку
            if (formErrors.cover_image) {
                setFormErrors(prev => ({ ...prev, cover_image: null }));
            }

            // Превью изображения
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setFormData(prev => ({
            ...prev,
            cover_image: null,
        }));
        setPreviewImage(null);
        setFormErrors(prev => ({ ...prev, cover_image: null }));
    };

    // Валидация формы
    const validateForm = () => {
        const errors = {};
        
        if (!formData.title.trim()) {
            errors.title = 'Название обязательно';
        }
        
        if (!formData.description.trim()) {
            errors.description = 'Описание обязательно';
        }
        
        if (!formData.content_file) {
            errors.content_file = 'Файл с текстом обязателен';
        }
        
        if (!formData.rating_id) {
            errors.rating_id = 'Выберите возрастной рейтинг';
        }
        
        if (!formData.work_status) {
            errors.work_status = 'Выберите статус работы';
        }
        
        return errors;
    };

    // Обработка отправки формы
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Валидация
        const errors = validateForm();
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            setError('Заполните все обязательные поля');
            return;
        }
        
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const result = await fanficService.createFanfic(formData, !saveAsDraft);
            
            let message = '';
            let redirectPath = '';
            
            if (saveAsDraft) {
                message = 'Фанфик сохранен как черновик! Вы можете найти его во вкладке "Черновики" в профиле.';
                redirectPath = '/profile?tab=drafts';
            } else {
                message = 'Фанфик отправлен на модерацию! Администратор проверит его в течение 24 часов.';
                redirectPath = '/profile?tab=fanfics';
            }
            
            setSuccess(message);
            
            // Переход через 2 секунды
            setTimeout(() => {
                navigate(redirectPath);
            }, 2000);
        } catch (err) {
            console.error('Ошибка создания фанфика:', err);
            
            if (err.response?.data?.errors) {
                setFormErrors(err.response.data.errors);
                setError('Исправьте ошибки в форме');
            } else {
                setError(err.response?.data?.error || 'Ошибка при создании фанфика');
            }
        } finally {
            setLoading(false);
        }
    };

    const workStatusOptions = [
        { value: 'in_progress', label: 'В процессе' },
        { value: 'completed', label: 'Завершен' },
        { value: 'abandoned', label: 'Заброшен' },
    ];

    // Сгруппируем теги по категориям
    const groupedTags = allTags.reduce((groups, tag) => {
        const category = tag.category || 'other';
        if (!groups[category]) {
            groups[category] = [];
        }
        groups[category].push(tag);
        return groups;
    }, {});

    const categoryLabels = {
        'genre': 'Жанры',
        'theme': 'Темы',
        'content_warning': 'Предупреждения о контенте',
        'other': 'Другие',
    };

    return (
        <div className="create-fanfic-page">
            <div className="container">
                <div className="create-header">
                    <h1>Создание нового фанфика</h1>
                    <p className="subtitle">Заполните информацию о вашем произведении</p>
                </div>

                {error && <div className="alert alert-error">{error}</div>}
                {success && <div className="alert alert-success">{success}</div>}

                <form onSubmit={handleSubmit} className="fanfic-form">
                    {/* Блок 1: Основная информация */}
                    <div className="form-section">
                        <h2>Основная информация</h2>
                        
                        <div className="create-form-group">
                            <label htmlFor="title">Название *</label>
                            <input
                                type="text"
                                id="title"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                placeholder="Введите название вашего фанфика"
                                maxLength={255}
                                className={formErrors.title ? 'error' : ''}
                            />
                            <div className="input-footer">
                                <div className="char-counter">{formData.title.length}/255</div>
                                {formErrors.title && <div className="field-error">{formErrors.title}</div>}
                            </div>
                        </div>

                        <div className="create-form-group">
                            <label htmlFor="description">Описание *</label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Краткое описание вашего фанфика (будет видно в списке работ)"
                                rows={4}
                                maxLength={2000}
                                className={formErrors.description ? 'error' : ''}
                            />
                            <div className="input-footer">
                                <div className="char-counter">{formData.description.length}/2000</div>
                                {formErrors.description && <div className="field-error">{formErrors.description}</div>}
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="create-form-group">
                                <label htmlFor="fandom">Фэндом</label>
                                <input
                                    type="text"
                                    id="fandom"
                                    name="fandom"
                                    value={formData.fandom}
                                    onChange={handleChange}
                                    placeholder="Например: Гарри Поттер, Marvel, Игра престолов"
                                    maxLength={100}
                                />
                                <div className="char-counter">{formData.fandom?.length || 0}/100</div>
                            </div>

                            <div className="create-form-group">
                                <label htmlFor="work_status">Статус работы *</label>
                                <select
                                    id="work_status"
                                    name="work_status"
                                    value={formData.work_status}
                                    onChange={handleChange}
                                    className={formErrors.work_status ? 'error' : ''}
                                >
                                    <option value="">Выберите статус</option>
                                    {workStatusOptions.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                {formErrors.work_status && <div className="field-error">{formErrors.work_status}</div>}
                            </div>
                        </div>
                    </div>

                    {/* Блок 2: Файл с текстом */}
                    <div className="form-section">
                        <h2>Файл с текстом *</h2>
                        <FileUploader 
                            onFileSelect={(file) => {
                                setFormData(prev => ({ ...prev, content_file: file }));
                                if (formErrors.content_file) {
                                    setFormErrors(prev => ({ ...prev, content_file: null }));
                                }
                            }}
                            error={formErrors.content_file}
                        />
                    </div>

                    {/* Блок 3: Рейтинг */}
                    <div className="form-section">
                        <h2>Возрастной рейтинг *</h2>
                        {formErrors.rating_id && <div className="field-error">{formErrors.rating_id}</div>}
                        <div className="ratings-grid">
                            {ratings.map(rating => (
                                <div 
                                    key={rating.id}
                                    className={`rating-option ${formData.rating_id === rating.id ? 'selected' : ''} ${formErrors.rating_id ? 'error' : ''}`}
                                    onClick={() => {
                                        setFormData(prev => ({ ...prev, rating_id: rating.id }));
                                        if (formErrors.rating_id) {
                                            setFormErrors(prev => ({ ...prev, rating_id: null }));
                                        }
                                    }}
                                    style={{ borderLeftColor: rating.color }}
                                >
                                    <div className="rating-header">
                                        <span className="rating-code" style={{ color: rating.color }}>
                                            {rating.code}
                                        </span>
                                        <span className="rating-name">{rating.name}</span>
                                    </div>
                                    <p className="rating-description">{rating.description}</p>
                                    <div className="rating-age">
                                        {rating.min_age > 0 ? `${rating.min_age}+` : 'Все возрасты'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Блок 4: Теги */}
                    <div className="form-section">
                        <h2>Теги и категории</h2>
                        <p className="section-subtitle">Выберите теги, которые описывают ваш фанфик</p>
                        
                        {Object.entries(groupedTags).map(([category, tags]) => (
                            <div key={category} className="tag-category">
                                <h3>{categoryLabels[category] || category}</h3>
                                <div className="tags-grid">
                                    {tags.map(tag => (
                                        <button
                                            key={tag.id}
                                            type="button"
                                            className={`tag-button ${formData.tags.includes(tag.id) ? 'selected' : ''}`}
                                            onClick={() => handleTagToggle(tag.id)}
                                        >
                                            {tag.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Блок 5: Обложка */}
                    <div className="form-section">
                        <h2>Обложка</h2>
                        <div className="cover-upload">
                            {previewImage ? (
                                <div className="cover-preview">
                                    <img src={previewImage} alt="Предпросмотр обложки" />
                                    <button
                                        type="button"
                                        className="remove-image-btn"
                                        onClick={handleRemoveImage}
                                    >
                                        Удалить
                                    </button>
                                </div>
                            ) : (
                                <div className="upload-area">
                                    <input
                                        type="file"
                                        id="cover_image"
                                        accept="image/jpeg,image/png,image/gif"
                                        onChange={handleImageUpload}
                                        className="hidden"
                                    />
                                    <label htmlFor="cover_image" className="upload-label">
                                        <div className="upload-icon">📷</div>
                                        <p>Загрузить обложку</p>
                                        <small>JPG, PNG или GIF (макс. 2MB)</small>
                                    </label>
                                </div>
                            )}
                            {formErrors.cover_image && <div className="field-error">{formErrors.cover_image}</div>}
                        </div>
                    </div>

                    {/* Блок 6: Способ сохранения */}
                    <div className="form-section save-options">
                        <h2>Способ сохранения</h2>
                        
                        <div className="option-group">
                            <label className="option-label">
                                <input
                                    type="radio"
                                    name="saveOption"
                                    checked={saveAsDraft}
                                    onChange={() => setSaveAsDraft(true)}
                                    className="option-input"
                                />
                                <div className="option-content">
                                    <span className="option-title">Сохранить как черновик</span>
                                    <span className="option-description">
                                        Фанфик будет сохранен в вашем профиле. Вы сможете отредактировать его позже и отправить на модерацию, когда будете готовы.
                                    </span>
                                </div>
                            </label>
                            
                            <label className="option-label">
                                <input
                                    type="radio"
                                    name="saveOption"
                                    checked={!saveAsDraft}
                                    onChange={() => setSaveAsDraft(false)}
                                    className="option-input"
                                />
                                <div className="option-content">
                                    <span className="option-title">Отправить на модерацию</span>
                                    <span className="option-description">
                                        Фанфик сразу отправится администратору на проверку. После одобрения он будет опубликован на платформе.
                                    </span>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Блок для подписчиков Hype+ */}
                    {hasHypeOrHigher && (
                        <div className="form-section premium-section">
                            <h2>⭐ Премиум возможности (Хайп/Читун)</h2>
                            <p className="section-subtitle">
                                Доступно для авторов с подпиской "Хайп" и "Читун"
                            </p>
                            
                            <div className="premium-options">
                                <label className="checkbox-label premium-option">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_early_access}
                                        onChange={handleEarlyAccessChange}
                                    />
                                    <div className="option-content">
                                        <span className="option-title">🚀 Ранний доступ (на 7 дней раньше)</span>
                                        <span className="option-description">
                                            Фанфик будет доступен только пользователям с подпиской "Хайп" и выше в течение 7 дней.
                                            После этого он станет доступен всем.
                                        </span>
                                    </div>
                                </label>
                                
                                {formData.is_early_access && (
                                    <div className="early-access-days">
                                        <label>Длительность раннего доступа:</label>
                                        <select
                                            value={formData.days_early_access}
                                            onChange={(e) => setFormData(prev => ({ ...prev, days_early_access: parseInt(e.target.value) }))}
                                        >
                                            <option value={3}>3 дня</option>
                                            <option value={7}>7 дней</option>
                                            <option value={14}>14 дней</option>
                                            <option value={30}>30 дней</option>
                                        </select>
                                    </div>
                                )}
                                
                                <label className="checkbox-label premium-option">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_exclusive}
                                        onChange={handleExclusiveChange}    
                                    />
                                    <div className="option-content">
                                        <span className="option-title">💎 Эксклюзивный контент</span>
                                        <span className="option-description">
                                            Этот контент будет доступен только пользователям с подпиской "Хайп" и выше.
                                            Подойдет для бонусных глав, альтернативных концовок и другого эксклюзива.
                                        </span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Кнопки отправки */}
                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => navigate('/')}
                            disabled={loading}
                        >
                            Отмена
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading || !formData.rating_id }
                        >
                            {loading ? 'Создание...' : 'Создать фанфик'}
                        </button>
                    </div>

                    <div className="form-help">
                        <p><strong>Что дальше?</strong></p>
                        <p>После создания вы сможете:</p>
                        <ul>
                            <li>Редактировать фанфик в любое время</li>
                            <li>Добавить дополнительные главы</li>
                            <li>Отправить на модерацию администратору</li>
                            <li>Просматривать статистику</li>
                        </ul>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default CreateFanficPage;