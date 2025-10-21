import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { useData } from '../contexts/DataContext';
import { useTheme } from '../contexts/ThemeContext';
import { updateCharacter } from '../api/apiService';
import './SettingsPage.css';

const SettingsPage = () => {
    const { character, fetchData } = useData();
    const { theme, setTheme } = useTheme();
    const [resetHour, setResetHour] = useState(3);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');

    useEffect(() => {
        if (character && character.daily_reset_time) {
            const hour = parseInt(character.daily_reset_time.substring(0, 2), 10);
            setResetHour(hour);
        }
    }, [character]);

    const handleSave = async () => {
        setMessage('');
        setMessageType('');
        try {
            const newTime = `${String(resetHour).padStart(2, '0')}:00:00`;
            await updateCharacter({ daily_reset_time: newTime });
            await fetchData();
            setMessage('Настройки успешно сохранены!');
            setMessageType('success');
        } catch (error) {
            console.error("Failed to save settings", error);
            setMessage('Ошибка при сохранении настроек.');
            setMessageType('error');
        }
    };

    const hourOptions = Array.from({ length: 24 }, (_, i) => (<option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>));
    
    return (
        <Layout title="Настройки">
            <div className="settings-container">
                <div className="settings-card">
                    <div>
                        <h3>Обновление ежедневных целей</h3>
                        <p>Выберите время, когда все ежедневные цели будут обновляться.</p>
                        <div className="settings-row">
                            <label htmlFor="reset-time-select">Время обновления (местное):</label>
                            <select id="reset-time-select" value={resetHour} onChange={(e) => setResetHour(parseInt(e.target.value, 10))}>
                                {hourOptions}
                            </select>
                        </div>
                    </div>

                    <div>
                        <h3>Внешний вид</h3>
                        <p>Выберите цветовую тему приложения.</p>
                        <div className="settings-row">
                            <label htmlFor="theme-select">Тема:</label>
                            <select 
                                id="theme-select" 
                                value={theme} 
                                onChange={(e) => setTheme(e.target.value)}
                            >
                                <option value="system">Как в системе</option>
                                <option value="light">Светлая</option>
                                <option value="dark">Тёмная</option>
                            </select>
                        </div>
                    </div>

                    <div className="settings-actions">
                        <button onClick={handleSave}>Сохранить изменения</button>
                    </div>

                    {message && <p className={`settings-message ${messageType}`}>{message}</p>}
                </div>
            </div>
        </Layout>
    );
};

export default SettingsPage;
