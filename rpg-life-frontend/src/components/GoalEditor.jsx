import React, { useState, useEffect } from 'react';
import './EditorForm.css';

const GoalEditor = ({ item, onSave, onClose }) => {
    const [formData, setFormData] = useState({ description: '', goal_type: 'DAILY', xp_reward: 25 });

    useEffect(() => {
        if (item) {
            setFormData({
                description: item.description || '',
                goal_type: item.goal_type || 'DAILY',
                xp_reward: item.xp_reward || 25,
            });
        }
    }, [item]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ ...item, ...formData });
    };

    return (
        <form onSubmit={handleSubmit} className="editor-form">
            <label>
                Описание цели:
                <input type="text" name="description" value={formData.description} onChange={handleChange} required />
            </label>
            <label>
                Тип цели:
                <select name="goal_type" value={formData.goal_type} onChange={handleChange}>
                    <option value="DAILY">Ежедневная</option>
                    <option value="BLUE">Краткосрочная</option>
                    <option value="YELLOW">Среднесрочная</option>
                    <option value="RED">Долгосрочная</option>
                </select>
            </label>
            <label>
                Награда (XP):
                <input type="number" name="xp_reward" value={formData.xp_reward} onChange={handleChange} required min="0" />
            </label>
            <div className="form-buttons">
                <button type="submit">Сохранить</button>
                <button type="button" onClick={onClose}>Отмена</button>
            </div>
        </form>
    );
};
export default GoalEditor;
