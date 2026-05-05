import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export function useBackground() {
    const { user } = useAuth();
    const [background, setBackground] = useState(null);
    const [loading, setLoading] = useState(true);

    const lastUserIdRef = useRef(null);

    useEffect(() => {
        // 🔥 если пользователь сменился — чистим фон
        if (lastUserIdRef.current !== user?.id) {
            removeBackground();
            lastUserIdRef.current = user?.id;
        }

        loadBackground();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    const loadBackground = async () => {
        try {
            // 🧠 если пользователя нет — просто дефолтный цвет
            if (!user) {
                removeBackground();
                return;
            }

            // ✅ проверяем localStorage (ОБЩИЙ, как у тебя было)
            const saved = localStorage.getItem('custom_background');
            if (saved) {
                const parsed = JSON.parse(saved);
                const oneDay = 24 * 60 * 60 * 1000;

                if (Date.now() - parsed.timestamp < oneDay) {
                    applyBackground(parsed.url, parsed.opacity);
                    return;
                }
            }

            // ✅ если нет или устарело — грузим с сервера
            const token = localStorage.getItem('token');
            if (token) {
                const response = await api.get('/profile');

                if (response.data.user?.background_url) {
                    const bgData = {
                        url: response.data.user.background_url,
                        opacity: response.data.user.background_opacity || 0.7,
                        timestamp: Date.now(),
                    };

                    localStorage.setItem(
                        'custom_background',
                        JSON.stringify(bgData)
                    );

                    applyBackground(bgData.url, bgData.opacity);
                } else {
                    removeBackground();
                }
            } else {
                removeBackground();
            }
        } catch (error) {
            console.error('Ошибка загрузки фона:', error);
            removeBackground();
        } finally {
            setLoading(false);
        }
    };

    const applyBackground = (url, opacity = 0.7) => {
        setBackground({ url, opacity });

        document.body.classList.add('custom-background');
        document.body.style.setProperty('--background-url', `url(${url})`);
        document.body.style.setProperty('--background-opacity', opacity);

        const oldStyle = document.getElementById('custom-background-styles');
        if (oldStyle) oldStyle.remove();

        const style = document.createElement('style');
        style.id = 'custom-background-styles';
        style.textContent = `
            body.custom-background::before {
                background-image: var(--background-url) !important;
                opacity: var(--background-opacity) !important;
            }
        `;

        document.head.appendChild(style);
    };

    const removeBackground = () => {
        setBackground(null);

        document.body.classList.remove('custom-background');
        document.body.classList.remove('fanfic-reading');

        localStorage.removeItem('custom_background');

        const style = document.getElementById('custom-background-styles');
        if (style) style.remove();
    };

    const setReadingMode = (isReading) => {
        if (isReading && background) {
            document.body.classList.add('fanfic-reading');
        } else {
            document.body.classList.remove('fanfic-reading');
        }
    };

    return {
        background,
        loading,
        applyBackground,
        removeBackground,
        setReadingMode,
    };
}
