import React, { useState, useEffect } from 'react';
import PaidSubscriptionPlans from './PaidSubscriptionPlans';
import { useAuth } from '../../context/AuthContext';
import './Profile.css';

function PaidSubscription() {
    const { user } = useAuth();
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showPlans, setShowPlans] = useState(false);

    useEffect(() => {
        if (user) {
            loadSubscription();
        } else {
            setSubscription(null);
            setLoading(false);
        }
    }, [user]);

    const loadSubscription = async () => {
        setLoading(true);
        
        // Пробуем загрузить из API
        try {
            const response = await fetch('/api/subscription/current', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Accept': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success && data.has_subscription) {
                setSubscription(data.subscription);
                // Сохраняем в localStorage для быстрого доступа
                localStorage.setItem('paid_subscription', JSON.stringify(data.subscription));
            } else {
                // Пробуем загрузить из localStorage
                const savedSubscription = localStorage.getItem('paid_subscription');
                if (savedSubscription) {
                    const sub = JSON.parse(savedSubscription);
                    if (new Date(sub.end_date) > new Date()) {
                        setSubscription(sub);
                    } else {
                        localStorage.removeItem('paid_subscription');
                        setSubscription(null);
                    }
                } else {
                    setSubscription(null);
                }
            }
        } catch (error) {
            console.error('Error loading subscription:', error);
            // Fallback на localStorage
            const savedSubscription = localStorage.getItem('paid_subscription');
            if (savedSubscription) {
                const sub = JSON.parse(savedSubscription);
                if (new Date(sub.end_date) > new Date()) {
                    setSubscription(sub);
                } else {
                    localStorage.removeItem('paid_subscription');
                    setSubscription(null);
                }
            } else {
                setSubscription(null);
            }
        }
        
        setLoading(false);
    };

    const handleSubscriptionSuccess = (newSubscription) => {
        setSubscription(newSubscription);
        setShowPlans(false);
        
        // Обновляем localStorage
        localStorage.setItem('paid_subscription', JSON.stringify(newSubscription));
        
        // Обновляем пользователя в localStorage
        if (user) {
            const updatedUser = { 
                ...user, 
                subscription_plan: newSubscription.plan_id,
                subscription_until: newSubscription.end_date
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));
        }
        
        loadSubscription(); // Перезагружаем данные
        
        window.dispatchEvent(new CustomEvent('subscription-updated', { 
            detail: newSubscription 
        }));
    };

    const resendReceipt = async () => {
        try {
            const response = await fetch('/api/subscription/resend-receipt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Accept': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert('Чек отправлен на вашу почту');
            } else {
                alert(data.message || 'Ошибка при отправке чека');
            }
        } catch (error) {
            console.error('Error resending receipt:', error);
            alert('Ошибка при отправке чека');
        }
    };

    const getDaysRemaining = () => {
        if (!subscription) return 0;
        const end = new Date(subscription.end_date);
        const now = new Date();
        const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
        return diff > 0 ? diff : 0;
    };

    if (loading) {
        return (
            <div className="paid-subscription-loading">
                <div className="spinner"></div>
                <p>Загрузка информации о подписке...</p>
            </div>
        );
    }

    return (
        <div className="paid-subscription-container">
            {!subscription ? (
                <div className="no-subscription">
                    <div className="free-badge">Бесплатный аккаунт</div>
                    <h3>Вам доступны все базовые функции платформы</h3>
                    <p>Оформите подписку, чтобы получить доступ к эксклюзивному контенту и дополнительным возможностям</p>
                    
                    <div className="free-features">
                        <div className="feature-item">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#ff6b35"/>
                            </svg>
                            <span>До 10 фанфиков в месяц</span>
                        </div>
                        <div className="feature-item">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#ff6b35"/>
                            </svg>
                            <span>Базовая фильтрация</span>
                        </div>
                    </div>
                    
                    <button className="upgrade-btn" onClick={() => setShowPlans(true)}>
                        Перейти на премиум
                    </button>
                </div>
            ) : (
                <div className="subscription-active">
                    <div className="subscription-header">
                        <div className="plan-badge" style={{ background: subscription.plan_id === 'base' ? '#8B7355' : subscription.plan_id === 'hype' ? '#FF6B35' : '#9B59B6' }}>
                            {subscription.plan_name}
                        </div>
                        <div className="price-info">
                            <span className="price">{subscription.price}</span>
                            <span className="period">₽/месяц</span>
                        </div>
                    </div>
                    
                    <div className="subscription-dates">
                        <div className="date-item">
                            <span className="label">Активирована:</span>
                            <span className="value">{new Date(subscription.start_date).toLocaleDateString('ru-RU')}</span>
                        </div>
                        <div className="date-item">
                            <span className="label">Действительна до:</span>
                            <span className="value">{new Date(subscription.end_date).toLocaleDateString('ru-RU')}</span>
                        </div>
                        <div className="days-remaining">
                            <span className="days">{getDaysRemaining()}</span>
                            <span className="label">дней осталось</span>
                        </div>
                    </div>
                    
                    <div className="subscription-features">
                        <h4>Доступные возможности:</h4>
                        <ul>
                            {subscription.plan_id === 'base' && (
                                <>
                                    <li>✓ Смена фона</li>
                                    <li>✓ Чтение офлайн</li>
                                </>
                            )}
                            {subscription.plan_id === 'hype' && (
                                <>
                                    <li>✓ Все возможности "Это База"</li>
                                    <li>✓ Ранний доступ к новым работам</li>
                                    <li>✓ Эксклюзивные фанфики и бонусы</li>
                                    <li>✓ Поддержка авторов</li>
                                </>
                            )}
                            {subscription.plan_id === 'chitun' && (
                                <>
                                    <li>✓ Все возможности "Хайп"</li>
                                    <li>✓ Приоритетная поддержка</li>
                                    <li>✓ Уникальные значки и профиль</li>
                                    <li>✓ Расширенные возможности для авторов</li>
                                </>
                            )}
                        </ul>
                    </div>
                    
                    <button className="extend-btn" onClick={() => setShowPlans(true)}>
                        Продлить подписку
                    </button>
                    
                    <button className="resend-receipt-btn" onClick={resendReceipt}>
                        📧 Отправить чек повторно
                    </button>
                </div>
            )}
            
            {showPlans && (
                <PaidSubscriptionPlans 
                    onClose={() => setShowPlans(false)}
                    onSubscriptionSuccess={handleSubscriptionSuccess}
                />
            )}
        </div>
    );
}

export default PaidSubscription;