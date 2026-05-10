import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && currentPath !== '/register') {
            checkAuth();
        } else {
            setLoading(false);
        }
    }, []);

    const checkAuth = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                clearAllLocalStorageData();
                setLoading(false);
                return;
            }

            const userData = await authService.getCurrentUser();
            if (userData) {
                setUser(userData);
                setIsAuthenticated(true);
                setIsAdmin(userData.role === 'admin');
            } else {
                clearAllLocalStorageData();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            clearAllLocalStorageData();
        } finally {
            setLoading(false);
        }
    };

    const clearAllLocalStorageData = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('role');
        localStorage.removeItem('paid_subscription');
        localStorage.removeItem('subscription');
    };

    const clearSubscriptionData = () => {
        localStorage.removeItem('paid_subscription');
    };

    const sendRegistrationCode = async (name, email, password, passwordConfirmation) => {
        const response = await authService.sendRegistrationCode({
            name,
            email,
            password,
            password_confirmation: passwordConfirmation
        });
        return response.data;
    };

    const verifyAndRegister = async (email, code) => {
        const response = await authService.verifyAndRegister({
            email,
            code
        });
        
        if (response.data.token) {
            clearAllLocalStorageData();
            
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            localStorage.setItem('role', response.data.role || 'user');
            setUser(response.data.user);
            setIsAuthenticated(true);
            setIsAdmin(response.data.role === 'admin');
        }
        
        return response.data;
    };

    const login = async (email, password) => {
        const response = await authService.login({ email, password });
        
        if (response.token) {
            clearAllLocalStorageData();
            
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
            localStorage.setItem('role', response.role || 'user');

            setUser(response.user);
            setIsAuthenticated(true);
            setIsAdmin(response.role === 'admin');
        }
        return response;
    };

    const logout = async () => {
        try {
            await authService.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('continue_reading');
            localStorage.removeItem('reading_history');
            localStorage.removeItem('continue_reading_guest');

            clearAllLocalStorageData();
            
            setUser(null);
            setIsAuthenticated(false);
            setIsAdmin(false);
        }
    };

    const updateProfile = async (profileData) => {
        const response = await authService.updateProfile(profileData);
        if (response.user) {
            setUser(response.user);
            localStorage.setItem('user', JSON.stringify(response.user));
            setIsAdmin(response.user.role === 'admin');
        }
        return response;
    };

    const value = {
        user,
        loading,
        isAuthenticated,
        isAdmin,
        register: sendRegistrationCode,
        login,
        logout,
        updateProfile,
        sendRegistrationCode,
        verifyAndRegister,
        sendPasswordResetCode: async (email) => {
            const response = await authService.sendPasswordResetCode({ email });
            return response.data;
        },
        resetPassword: async (email, code, password, passwordConfirmation) => {
            const response = await authService.resetPassword({
                email,
                code,
                password,
                password_confirmation: passwordConfirmation
            });
            return response.data;
        },
        checkAuth,
        clearSubscriptionData
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};