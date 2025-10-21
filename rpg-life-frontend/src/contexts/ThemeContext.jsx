import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

const THEME_KEY = 'rpg-life-theme';

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'dark');

    useEffect(() => {
        const body = window.document.body;
        let effectiveTheme = theme;

        if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            effectiveTheme = systemTheme;
        }

        body.setAttribute('data-theme', effectiveTheme);
        localStorage.setItem(THEME_KEY, theme);
        
    }, [theme]);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        const handleChange = (e) => {
            if (theme === 'system') {
                const newTheme = e.matches ? 'dark' : 'light';
                window.document.body.setAttribute('data-theme', newTheme);
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);


    const value = useMemo(() => ({ theme, setTheme }), [theme]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};
