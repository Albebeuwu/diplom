import React, { useEffect } from "react"; 
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';

import Header from "./components/layout/Header/header";
import Main from "./pages/main";
import Footer from "./components/layout/Footer/footer";
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import HomePage from './components/main/HomePages/HomePage';
import AdminPanel from './components/admin/AdminPanel';
import CreateFanficPage from './pages/CreateFanficPage/CreateFanficPage';

import "./App.css";
import AllFanfics from "./pages/AllFanfics/AllFanfics";
import Profile from "./pages/Profile/Profile";
import FanficReader from "./components/fanfic/FanficReader";
import EditFanficPage from "./pages/EditFanficPage/EditFanficPage";
import PrivateRoute from "./components/auth/PrivateRoute";
import { useBackground } from "./hooks/useBackground";
import VerifyCode from "./components/auth/VerifyCode";
import ForgotPasswordForm from "./components/auth/ForgotPasswordForm";
import AuthorPage from "./pages/AuthorPage/AuthorPage";
import Subscriptions from "./pages/Profile/Subscriptions";

// Компонент для основной страницы (публичный доступ)
function MainPage() {
    return (
        <React.Fragment>
            <Header />
            <Main>
                <HomePage />
            </Main>
            <Footer />
        </React.Fragment>
    );
}

// Компонент для страницы создания (только для авторизованных)
function CreatePage() {
    const { isAuthenticated } = useAuth();
    
    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }
    
    return (
        <React.Fragment>
            <Header />
            <Main>
                <div>Создание контента</div>
            </Main>
            <Footer />
        </React.Fragment>
    );
}

// Компонент для админ панели (только для админов)
function AdminPage() {
    const { isAuthenticated, isAdmin } = useAuth();
    
    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }
    
    if (!isAdmin) {
        return <Navigate to="/" />;
    }
    
    return (
        <React.Fragment>
            <Header />
            <Main>
                <AdminPanel />
            </Main>
            <Footer />
        </React.Fragment>
    );
}

// Компонент-обертка для применения фона
function AppWrapper({ children }) {
    const { setReadingMode } = useBackground();

    useEffect(() => {
        // Проверяем текущий путь для режима чтения
        const path = window.location.pathname;
        const isReadingPage = path.includes('/fanfic/') && path.includes('/read');
        setReadingMode(isReadingPage);
    }, [setReadingMode]);

    return <>{children}</>;
}

function App() {
    return (
        <AuthProvider>
            <Router>
                <AppWrapper>
                <div className="app-container">
                    <Routes>
                        {/* Главная страница - публичный доступ */}
                        <Route path="/" element={<MainPage />} />
                        
                        {/* Страницы аутентификации */}
                        <Route path="/login" element={<LoginForm />} />
                        <Route path="/register" element={<RegisterForm />} />
                        <Route path="/verify-code" element={<VerifyCode />} />
                        <Route path="/forgot-password" element={<ForgotPasswordForm />} />
                        
                        {/* Защищенная страница создания */}
                        <Route path="/create" element={<CreatePage />} />
                        
                        {/* Страница создания фанфика */}
                        <Route path="/create-fanfic" element={
                            <PrivateRoute>
                                <React.Fragment>
                                    <Header />
                                    <Main>
                                        <CreateFanficPage />
                                    </Main>
                                    <Footer />
                                </React.Fragment>
                            </PrivateRoute>
                        } />
                        
                        {/* Админ панель - только для админов */}
                        <Route path="/admin" element={
                            <PrivateRoute>
                                <AdminPage />
                            </PrivateRoute>
                        } />
                        
                        {/* Редирект для неизвестных маршрутов */}
                        <Route path="*" element={<Navigate to="/" />} />

                        {/*Страница со всеми фанфиками*/}
                        <Route path="/all-funfics" element={
                            <React.Fragment>
                                <Header />
                                <Main>
                                    <AllFanfics />
                                </Main>
                                <Footer />
                            </React.Fragment>
                        } />

                        {/* Профиль */}
                        <Route path="/profile/*" element={
                            <PrivateRoute>
                                <Profile />
                            </PrivateRoute>
                        } />

                        {/*Страница просмотра фанфиков*/}
                        <Route path="/fanfic/:id" element={<FanficReader />} />
                        <Route path="/fanfic/:id/read" element={<FanficReader />} />

                        {/*Редактирование фанфиков*/}
                        <Route path="/fanfic/:id/edit" element={
                            <PrivateRoute>
                                <React.Fragment>
                                    <EditFanficPage />
                                </React.Fragment>
                            </PrivateRoute>
                        }
                        />

                        <Route path="/author/:userId" element={<AuthorPage />} />
                        <Route path="/subscriptions" element={<Subscriptions />} />
                    </Routes>
                </div>
                </AppWrapper>
            </Router>
        </AuthProvider>
    );
}

export default App;