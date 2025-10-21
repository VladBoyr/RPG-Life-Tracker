import React from 'react';
import { Link, useLocation, NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import './Layout.css';

const Layout = ({ title, children }) => {
    const { logout, isImpersonating, stopImpersonation } = useAuth();
    const { character } = useData();
    const location = useLocation();

    const navLinks = [
        { path: '/main', label: 'Главная' },
        { path: '/rewards', label: 'Награды' },
        { path: '/settings', label: 'Настройки' },
    ];

    return (
        <div className="layout-container">
            {isImpersonating && (
                <div className="impersonate-banner">
                    <p>Вы находитесь в режиме просмотра от имени другого пользователя.</p>
                    <button onClick={stopImpersonation}>Вернуться в свой аккаунт</button>
                </div>
            )}

            <header className="layout-header">
                <h1>{title}</h1>
                {character && (
                    <nav>
                        {navLinks.map(link => (
                            <Link key={link.path} to={link.path}>
                                <button className={`nav-button ${location.pathname === link.path ? 'active' : ''}`}>
                                    {link.label}
                                </button>
                            </Link>
                        ))}

                        {character?.is_staff && (
                            <>
                                <Link to="/groups">
                                    <button className={`nav-button ${location.pathname === '/groups' ? 'active' : ''}`}>
                                        Группы
                                    </button>
                                </Link>
                                <Link to="/users">
                                    <button className={`nav-button ${location.pathname === '/users' ? 'active' : ''}`}>
                                        Пользователи
                                    </button>
                                </Link>
                                <a href="/admin/" target="_blank" rel="noopener noreferrer">
                                    <button className="nav-button">Админка</button>
                                </a>
                            </>
                        )}
                        <button onClick={logout} className="nav-button">
                            Выйти
                        </button>
                    </nav>
                )}
            </header>
            <main className="layout-content">
                {children}
            </main>
        </div>
    );
};

export default Layout;
