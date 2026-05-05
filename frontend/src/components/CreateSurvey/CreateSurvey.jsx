import React, { useState } from 'react';
import { authorService } from '../../services/authorService';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';
import './CreateSurvey.css';

function CreateSurvey({ authorId, onClose, onSuccess }) {
    const { user } = useAuth();
    const { hasSubscription, planId } = useSubscription();
    const hasHypeOrHigher = hasSubscription && (planId === 'hype' || planId === 'chitun');
    
    const [survey, setSurvey] = useState({
        title: '',
        description: '',
        questions: [{ 
            text: '', 
            type: 'single', 
            options: ['', ''] 
        }],
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Проверка прав (только автор и с подпиской Hype+)
    if (!hasHypeOrHigher || user?.id !== parseInt(authorId)) {
        return (
            <div className="create-survey-modal-overlay" onClick={onClose}>
                <div className="create-survey-modal" onClick={e => e.stopPropagation()}>
                    <div className="create-survey-premium-lock">
                        <div className="lock-icon-large">🔒</div>
                        <h3>Требуется подписка "Хайп"</h3>
                        <p>Создание опросов доступно только авторам с подпиской "Хайп" или "Читун"</p>
                        <button className="close-btn" onClick={onClose}>Закрыть</button>
                    </div>
                </div>
            </div>
        );
    }

    const addQuestion = () => {
        setSurvey(prev => ({
            ...prev,
            questions: [...prev.questions, { text: '', type: 'single', options: ['', ''] }]
        }));
    };

    const removeQuestion = (index) => {
        if (survey.questions.length === 1) {
            setError('Должен быть хотя бы один вопрос');
            return;
        }
        setSurvey(prev => ({
            ...prev,
            questions: prev.questions.filter((_, i) => i !== index)
        }));
    };

    const updateQuestion = (index, field, value) => {
        setSurvey(prev => ({
            ...prev,
            questions: prev.questions.map((q, i) => 
                i === index ? { ...q, [field]: value } : q
            )
        }));
    };

    const addOption = (questionIndex) => {
        setSurvey(prev => ({
            ...prev,
            questions: prev.questions.map((q, i) => 
                i === questionIndex 
                    ? { ...q, options: [...q.options, ''] }
                    : q
            )
        }));
    };

    const updateOption = (questionIndex, optionIndex, value) => {
        setSurvey(prev => ({
            ...prev,
            questions: prev.questions.map((q, i) => 
                i === questionIndex 
                    ? { ...q, options: q.options.map((opt, j) => j === optionIndex ? value : opt) }
                    : q
            )
        }));
    };

    const removeOption = (questionIndex, optionIndex) => {
        setSurvey(prev => ({
            ...prev,
            questions: prev.questions.map((q, i) => 
                i === questionIndex 
                    ? { ...q, options: q.options.filter((_, j) => j !== optionIndex) }
                    : q
            )
        }));
    };

    const validateSurvey = () => {
        if (!survey.title.trim()) {
            setError('Введите название опроса');
            return false;
        }
        
        for (let i = 0; i < survey.questions.length; i++) {
            const q = survey.questions[i];
            if (!q.text.trim()) {
                setError(`Введите текст вопроса ${i + 1}`);
                return false;
            }
            if (q.options.length < 2) {
                setError(`В вопросе ${i + 1} должно быть минимум 2 варианта ответа`);
                return false;
            }
            for (let j = 0; j < q.options.length; j++) {
                if (!q.options[j].trim()) {
                    setError(`Заполните все варианты ответа в вопросе ${i + 1}`);
                    return false;
                }
            }
        }
        
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateSurvey()) {
            return;
        }
        
        setLoading(true);
        setError('');
        
        try {
            const data = {
                title: survey.title,
                description: survey.description,
                questions: survey.questions,
            };
            
            const result = await authorService.createSurvey(data);
            
            if (onSuccess) {
                onSuccess(result);
            }
            
            onClose();
        } catch (err) {
            console.error('Error creating survey:', err);
            setError(err.response?.data?.message || 'Ошибка создания опроса');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="create-survey-modal-overlay" onClick={onClose}>
            <div className="create-survey-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>📊 Создание опроса</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>
                
                <form onSubmit={handleSubmit} className="create-survey-form">
                    {error && <div className="error-message">{error}</div>}
                    
                    <div className="form-group">
                        <label>Название опроса *</label>
                        <input
                            type="text"
                            value={survey.title}
                            onChange={(e) => setSurvey(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="Например: Какое продолжение вы хотите видеть?"
                            required
                        />
                    </div>
                    
                    <div className="form-group">
                        <label>Описание (необязательно)</label>
                        <textarea
                            value={survey.description}
                            onChange={(e) => setSurvey(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Добавьте пояснение к опросу..."
                            rows={3}
                        />
                    </div>
                    
                    <div className="questions-section">
                        <h3>Вопросы голосования</h3>
                        
                        {survey.questions.map((question, qIndex) => (
                            <div key={qIndex} className="question-card">
                                <div className="question-header">
                                    <h4>Вопрос {qIndex + 1}</h4>
                                    <button 
                                        type="button" 
                                        className="remove-question-btn"
                                        onClick={() => removeQuestion(qIndex)}
                                        disabled={survey.questions.length === 1}
                                    >
                                        ✕
                                    </button>
                                </div>
                                
                                <div className="form-group">
                                    <input
                                        type="text"
                                        value={question.text}
                                        onChange={(e) => updateQuestion(qIndex, 'text', e.target.value)}
                                        placeholder="Текст вопроса"
                                        required
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Тип ответа</label>
                                    <select
                                        value={question.type}
                                        onChange={(e) => updateQuestion(qIndex, 'type', e.target.value)}
                                    >
                                        <option value="single">📌 Одиночный выбор</option>
                                        <option value="multiple">✅ Множественный выбор</option>
                                    </select>
                                </div>
                                
                                <div className="options-section">
                                    <label>Варианты ответов:</label>
                                    {question.options.map((option, oIndex) => (
                                        <div key={oIndex} className="option-input">
                                            <div className="option-number">{oIndex + 1}.</div>
                                            <input
                                                type="text"
                                                value={option}
                                                onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                                placeholder={`Вариант ${oIndex + 1}`}
                                                required
                                            />
                                            {question.options.length > 2 && (
                                                <button 
                                                    type="button" 
                                                    className="remove-option-btn"
                                                    onClick={() => removeOption(qIndex, oIndex)}
                                                >
                                                    −
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button 
                                        type="button" 
                                        className="add-option-btn"
                                        onClick={() => addOption(qIndex)}
                                    >
                                        + Добавить вариант
                                    </button>
                                </div>
                            </div>
                        ))}
                        
                        <button 
                            type="button" 
                            className="add-question-btn"
                            onClick={addQuestion}
                        >
                            + Добавить вопрос
                        </button>
                    </div>
                    
                    <div className="form-actions">
                        <button type="button" className="cancel-btn" onClick={onClose}>
                            Отмена
                        </button>
                        <button type="submit" className="submit-btn" disabled={loading}>
                            {loading ? 'Создание...' : 'Создать опрос'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default CreateSurvey;