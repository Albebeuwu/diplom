import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export const useSubscription = () => {
    const { user, isAuthenticated } = useAuth();
    const [subscription, setSubscription] = useState(null);
    const [hasSubscription, setHasSubscription] = useState(false);
    const [loading, setLoading] = useState(true);
    const [planId, setPlanId] = useState(null);

    const loadSubscription = async () => {
        console.log('Loading subscription for user:', user?.email); // Для отладки
        
        if (!isAuthenticated || !user) {
            console.log('User not authenticated, clearing subscription');
            setHasSubscription(false);
            setSubscription(null);
            setPlanId(null);
            setLoading(false);
            return;
        }

        // Сначала проверяем localStorage, но с проверкой на актуальность
        const savedSubscription = localStorage.getItem('paid_subscription');
        const savedUser = localStorage.getItem('user');
        
        if (savedSubscription && savedUser) {
            try {
                const sub = JSON.parse(savedSubscription);
                const savedUserObj = JSON.parse(savedUser);
                
                // Проверяем, что данные подписки принадлежат текущему пользователю
                // и не истекли
                const endDate = new Date(sub.end_date);
                if (endDate > new Date() && savedUserObj.id === user.id) {
                    console.log('Using cached subscription for user:', user.email);
                    setSubscription(sub);
                    setHasSubscription(true);
                    setPlanId(sub.plan_id);
                    setLoading(false);
                    return;
                } else {
                    // Данные устарели или не принадлежат пользователю
                    console.log('Subscription cache invalid, clearing');
                    localStorage.removeItem('paid_subscription');
                }
            } catch (e) {
                console.error('Error parsing subscription:', e);
                localStorage.removeItem('paid_subscription');
            }
        }

        // Загружаем через API
        try {
            console.log('Fetching subscription from API for user:', user.email);
            const response = await fetch('/api/subscription/current', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Accept': 'application/json'
                }
            });
            
            const data = await response.json();
            console.log('API response:', data);
            
            if (data.success && data.has_subscription && data.subscription) {
                setSubscription(data.subscription);
                setHasSubscription(true);
                setPlanId(data.subscription.plan_id);
                localStorage.setItem('paid_subscription', JSON.stringify(data.subscription));
            } else {
                setHasSubscription(false);
                setSubscription(null);
                setPlanId(null);
                // Убеждаемся, что localStorage очищен
                localStorage.removeItem('paid_subscription');
            }
        } catch (error) {
            console.error('Error loading subscription:', error);
            setHasSubscription(false);
            setSubscription(null);
            setPlanId(null);
        } finally {
            setLoading(false);
        }
    };

    // Загружаем подписку при изменении пользователя или авторизации
    useEffect(() => {
        loadSubscription();
    }, [isAuthenticated, user?.id]); // Добавляем зависимость от user.id

    const refreshSubscription = () => {
        setLoading(true);
        loadSubscription();
    };

    return {
        subscription,
        hasSubscription,
        loading,
        planId,
        refreshSubscription
    };
};