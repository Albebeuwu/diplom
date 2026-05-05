import React, { useState, useEffect } from 'react';
import { authorService } from '../../services/authorService';
import { useAuth } from '../../context/AuthContext';
import './SurveyView.css';

function SurveyView({ surveyId, onClose }) {
    const { user, isAuthenticated } = useAuth();
    const [survey, setSurvey] = useState(null);
    const [results, setResults] = useState(null);
    const [answers, setAnswers] = useState({});
    const [hasVoted, setHasVoted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [voting, setVoting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        loadSurvey();
    }, [surveyId]);

    const loadSurvey = async () => {
        try {
            setLoading(true);
            const response = await authorService.getSurveyResults(surveyId);
            setSurvey(response.survey);
            setResults(response.results);
            setHasVoted(response.has_voted);
        } catch (err) {
            console.error('Error loading survey:', err);
            setError('Не удалось загрузить опрос');
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerChange = (questionIndex, optionIndex, type) => {
        if (type === 'single') {
            setAnswers(prev => ({
                ...prev,
                [questionIndex]: [optionIndex]
            }));
        } else {
            setAnswers(prev => {
                const current = prev[questionIndex] || [];
                if (current.includes(optionIndex)) {
                    return {
                        ...prev,
                        [questionIndex]: current.filter(i => i !== optionIndex)
                    };
                } else {
                    return {
                        ...prev,
                        [questionIndex]: [...current, optionIndex]
                    };
                }
            });
        }
    };

    const handleSubmit = async () => {
        if (!isAuthenticated) {
            alert('Войдите в аккаунт, чтобы проголосовать');
            return;
        }

        // Форматируем ответы
        const formattedAnswers = Object.entries(answers).map(([qIndex, options]) => ({
            question_index: parseInt(qIndex),
            option_index: Array.isArray(options) ? options : [options]
        }));

        setVoting(true);
        setError('');

        try {
            await authorService.voteSurvey(surveyId, formattedAnswers);
            await loadSurvey(); // Перезагружаем результаты
            setHasVoted(true);
        } catch (err) {
            console.error('Error voting:', err);
            setError(err.response?.data?.error || 'Ошибка при голосовании');
        } finally {
            setVoting(false);
        }
    };

    if (loading) {
        return (
            <div className="survey-view-overlay" onClick={onClose}>
                <div className="survey-view-modal">
                    <div className="loading">Загрузка...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="survey-view-overlay" onClick={onClose}>
                <div className="survey-view-modal">
                    <div className="error-message">{error}</div>
                    <button onClick={onClose}>Закрыть</button>
                </div>
            </div>
        );
    }

    return (
        <div className="survey-view-overlay" onClick={onClose}>
            <div className="survey-view-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>📊 {survey.title}</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                {survey.description && (
                    <div className="survey-description">
                        {survey.description}
                    </div>
                )}

                {hasVoted ? (
                    <div className="survey-results">
                        <h3>Результаты голосования</h3>
                        {survey.questions.map((question, qIndex) => (
                            <div key={qIndex} className="result-question">
                                <h4>{question.text}</h4>
                                <div className="result-options">
                                    {question.options.map((option, oIndex) => {
                                        const voteData = results?.[qIndex]?.votes?.[oIndex];
                                        const percentage = voteData?.percentage || 0;
                                        const count = voteData?.count || 0;
                                        
                                        return (
                                            <div key={oIndex} className="result-option">
                                                <div className="result-label">
                                                    <span>{option}</span>
                                                    <span className="result-stats">{count} голосов ({percentage}%)</span>
                                                </div>
                                                <div className="progress-bar">
                                                    <div 
                                                        className="progress-fill"
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                        <div className="total-votes">
                            Всего проголосовало: {survey.responses_count || 0} человек
                        </div>
                    </div>
                ) : (
                    <div className="survey-voting">
                        <div className="questions-list">
                            {survey.questions.map((question, qIndex) => (
                                <div key={qIndex} className="vote-question">
                                    <h4>{question.text}</h4>
                                    <p className="question-type">
                                        {question.type === 'single' ? '📌 Одиночный выбор' : '✅ Можно выбрать несколько вариантов'}
                                    </p>
                                    <div className="vote-options">
                                        {question.options.map((option, oIndex) => (
                                            <label key={oIndex} className="vote-option">
                                                <input
                                                    type={question.type === 'single' ? 'radio' : 'checkbox'}
                                                    name={`question_${qIndex}`}
                                                    checked={
                                                        question.type === 'single'
                                                            ? answers[qIndex]?.[0] === oIndex
                                                            : answers[qIndex]?.includes(oIndex)
                                                    }
                                                    onChange={() => handleAnswerChange(qIndex, oIndex, question.type)}
                                                />
                                                <span>{option}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {Object.keys(answers).length > 0 && (
                            <button 
                                className="submit-vote-btn"
                                onClick={handleSubmit}
                                disabled={voting}
                            >
                                {voting ? 'Отправка...' : 'Проголосовать'}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default SurveyView;