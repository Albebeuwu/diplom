import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Profile.css';

const plans = [
    {
        id: 'base',
        name: 'Это База',
        price: 100,
        period: 'месяц',
        color: '#8B7355',
        features: [
            'Смена фона',
            'Чтение офлайн: возможность скачать несколько фанфиков'
        ],
        popular: false
    },
    {
        id: 'hype',
        name: 'Хайп',
        price: 200,
        period: 'месяц',
        color: '#FF6B35',
        features: [
            'Все преимущества "Это База"',
            'Ранний доступ к новым работам (на 3-7 дней раньше)',
            'Эксклюзивные фанфики и бонусы',
            'Возможность поддержать автора'
        ],
        popular: true
    },
    /*{
        id: 'chitun',
        name: 'Читун',
        price: 300,
        period: 'месяц',
        color: '#9B59B6',
        features: [
            'Все преимущества "Хайп"',
            'Приоритетная поддержка',
            'Уникальные значки и оформление профиля',
            'Расширенные возможности для авторов'
        ],
        popular: false
    }*/
];

function PaidSubscriptionPlans({ onClose, onSubscriptionSuccess }) {
    const { user, updateProfile } = useAuth();
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [paymentStep, setPaymentStep] = useState('plans');
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [paymentError, setPaymentError] = useState('');
    const [cardData, setCardData] = useState({
        cardNumber: '',
        cardExpiry: '',
        cardCvv: '',
        cardHolder: ''
    });

    const handleSelectPlan = (plan) => {
        setSelectedPlan(plan);
        setPaymentStep('payment');
        setPaymentError('');
    };

    const handleCardInputChange = (e) => {
        const { name, value } = e.target;
        let formattedValue = value;

        if (name === 'cardNumber') {
            formattedValue = value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ').trim();
            if (formattedValue.length > 19) formattedValue = formattedValue.slice(0, 19);
        } else if (name === 'cardExpiry') {
            formattedValue = value.replace(/\D/g, '');
            if (formattedValue.length >= 2) {
                formattedValue = formattedValue.slice(0, 2) + '/' + formattedValue.slice(2, 4);
            }
            if (formattedValue.length > 5) formattedValue = formattedValue.slice(0, 5);
        } else if (name === 'cardCvv') {
            formattedValue = value.replace(/\D/g, '').slice(0, 3);
        }

        setCardData(prev => ({
            ...prev,
            [name]: formattedValue
        }));
    };

    const handlePayment = async (e) => {
        e.preventDefault();
        setPaymentLoading(true);
        setPaymentError('');

        if (!cardData.cardNumber || !cardData.cardExpiry || !cardData.cardCvv || !cardData.cardHolder) {
            setPaymentError('Пожалуйста, заполните все поля карты');
            setPaymentLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/subscription/purchase', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    plan_id: selectedPlan.id,
                    plan_name: selectedPlan.name,
                    price: selectedPlan.price,
                    card_number: cardData.cardNumber,
                    card_expiry: cardData.cardExpiry,
                    card_cvv: cardData.cardCvv
                })
            });

            const data = await response.json();

            if (data.success) {
                // Сохраняем данные подписки в localStorage
                const subscriptionData = {
                    id: data.subscription?.id || Date.now(),
                    plan_id: selectedPlan.id,
                    plan_name: selectedPlan.name,
                    price: selectedPlan.price,
                    start_date: new Date().toISOString(),
                    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    status: 'active',
                    transaction_id: data.transaction_id
                };
                
                localStorage.setItem('paid_subscription', JSON.stringify(subscriptionData));
                
                // Обновляем пользователя
                if (user) {
                    const updatedUser = { 
                        ...user, 
                        subscription_plan: selectedPlan.id,
                        subscription_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                    };
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                }
                
                setPaymentStep('success');
                
                // Показываем сообщение о чеке
                if (data.message) {
                    alert(data.message);
                }
                
                if (onSubscriptionSuccess) {
                    onSubscriptionSuccess(subscriptionData);
                }
            } else {
                setPaymentError(data.message || 'Ошибка при оформлении подписки');
            }
        } catch (error) {
            console.error('Payment error:', error);
            setPaymentError('Произошла ошибка при обработке платежа. Пожалуйста, попробуйте позже.');
        } finally {
            setPaymentLoading(false);
        }
    };

    const handleBackToPlans = () => {
        setSelectedPlan(null);
        setPaymentStep('plans');
        setPaymentError('');
        setCardData({
            cardNumber: '',
            cardExpiry: '',
            cardCvv: '',
            cardHolder: ''
        });
    };

    const handleClose = () => {
        if (onClose) onClose();    
    };

    return (
        <div className="subscription-modal-overlay" onClick={handleClose}>
            <div className="subscription-modal" onClick={(e) => e.stopPropagation()}>
                
                {paymentStep === 'plans' && (
                    <>
                        <div className="paid-modal-header">
                            <h2>Выберите подписку</h2>
                        </div>
                        <div className="plans-container">
                            {plans.map(plan => (
                                <div 
                                    key={plan.id}
                                    className={`plan-card ${plan.popular ? 'popular' : ''}`}
                                    style={{ '--plan-color': plan.color }}
                                >
                                    {plan.popular && <div className="popular-badge">Популярный</div>}
                                    <div className="plan-header">
                                        <h3>{plan.name}</h3>
                                        <div className="plan-price">
                                            <span className="price">{plan.price}</span>
                                            <span className="period">₽/{plan.period}</span>
                                        </div>
                                    </div>
                                    <ul className="plan-features">
                                        {plan.features.map((feature, idx) => (
                                            <li key={idx}>
                                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                    <path d="M13.3334 4L6.00008 11.3333L2.66675 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                    <button 
                                        className="select-plan-btn"
                                        onClick={() => handleSelectPlan(plan)}
                                    >
                                        Выбрать
                                    </button>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {paymentStep === 'payment' && selectedPlan && (
                    <>
                        <div className="modal-header">
                            <button className="back-btn" onClick={handleBackToPlans}>← Назад</button>
                            <h2>Оплата подписки</h2>
                            <p>{selectedPlan.name} — {selectedPlan.price} ₽/месяц</p>
                        </div>
                        
                        <form onSubmit={handlePayment} className="payment-form">
                            <div className="payment-amount">
                                <span>Сумма к оплате:</span>
                                <strong>{selectedPlan.price} ₽</strong>
                            </div>
                            
                            <div className="card-form">
                                <div className="form-group">
                                    <label>Номер карты</label>
                                    <input
                                        type="text"
                                        name="cardNumber"
                                        value={cardData.cardNumber}
                                        onChange={handleCardInputChange}
                                        placeholder="0000 0000 0000 0000"
                                        maxLength="19"
                                        required
                                    />
                                </div>
                                
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Срок действия</label>
                                        <input
                                            type="text"
                                            name="cardExpiry"
                                            value={cardData.cardExpiry}
                                            onChange={handleCardInputChange}
                                            placeholder="MM/YY"
                                            maxLength="5"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>CVV</label>
                                        <input
                                            type="text"
                                            name="cardCvv"
                                            value={cardData.cardCvv}
                                            onChange={handleCardInputChange}
                                            placeholder="000"
                                            maxLength="3"
                                            required
                                        />
                                    </div>
                                </div>
                                
                                <div className="form-group">
                                    <label>Владелец карты</label>
                                    <input
                                        type="text"
                                        name="cardHolder"
                                        value={cardData.cardHolder}
                                        onChange={handleCardInputChange}
                                        placeholder="IVAN IVANOV"
                                        required
                                    />
                                </div>
                            </div>
                            
                            <div className="test-card-info">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM11 15H9V13H11V15ZM11 11H9V5H11V11Z" fill="#FF9800"/>
                                </svg>
                                <div>
                                    <strong>Тестовый режим</strong>
                                    <p>Для тестовой оплаты используйте карту: <span>1111 1111 1111 1111</span></p>
                                    <p>Любые срок и CVV</p>
                                </div>
                            </div>
                            
                            {paymentError && (
                                <div className="payment-error">{paymentError}</div>
                            )}
                            
                            <button 
                                type="submit" 
                                className="pay-btn"
                                disabled={paymentLoading}
                            >
                                {paymentLoading ? (
                                    <>
                                        <span className="spinner"></span>
                                        Обработка...
                                    </>
                                ) : (
                                    `Оплатить ${selectedPlan.price} ₽`
                                )}
                            </button>
                        </form>
                    </>
                )}

                {paymentStep === 'success' && (
                    <>
                        <div className="modal-header">
                            <h2>🎉 Оплата прошла успешно!</h2>
                        </div>
                        <div className="success-content">
                            <div className="success-icon">✓</div>
                            <p>Подписка <strong>{selectedPlan?.name}</strong> активирована до <strong>{new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU')}</strong></p>
                            <p>Чек об оплате отправлен на вашу почту.</p>
                            <button className="close-success-btn" onClick={handleClose}>
                                Продолжить
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default PaidSubscriptionPlans;