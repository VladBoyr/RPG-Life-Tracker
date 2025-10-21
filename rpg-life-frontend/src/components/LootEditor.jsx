import React, { useState, useEffect } from 'react';
import './EditorForm.css';

const LootEditor = ({ item, onSave, onClose }) => {
    const [formData, setFormData] = useState({ name: '', rarity: 'COMMON', base_chance: 50.0 });
    
    useEffect(() => {
        if (item) {
            setFormData({
                name: item.name || '',
                rarity: item.rarity || 'COMMON',
                base_chance: item.base_chance || 50.0,
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
                Название награды:
                <input type="text" name="name" value={formData.name} onChange={handleChange} required />
            </label>
            <label>
                Редкость:
                <select name="rarity" value={formData.rarity} onChange={handleChange}>
                    <option value="COMMON">Обычный</option>
                    <option value="UNCOMMON">Необычный</option>
                    <option value="RARE">Редкий</option>
                    <option value="UNIQUE">Уникальный</option>
                    <option value="LEGENDARY">Легендарный</option>
                </select>
            </label>
            <label>
                Базовый шанс (%):
                <input type="number" name="base_chance" value={formData.base_chance} onChange={handleChange} required min="0" max="100" step="0.01" />
            </label>
            <div className="form-buttons">
                <button type="submit">Сохранить</button>
                <button type="button" onClick={onClose}>Отмена</button>
            </div>
        </form>
    );
};
export default LootEditor;
