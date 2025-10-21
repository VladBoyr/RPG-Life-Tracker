import React, { useState, useEffect } from 'react';
import './EditorForm.css';

const AchievementEditor = ({ item, onSave, onClose }) => {
    const [formData, setFormData] = useState({ required_level: 1, description: '' });

    useEffect(() => {
        if (item) {
            setFormData({
                required_level: item.required_level || 1,
                description: item.description || '',
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
                Требуемый уровень:
                <input type="number" name="required_level" value={formData.required_level} onChange={handleChange} required min="1" />
            </label>
            <label>
                Описание награды:
                <input type="text" name="description" value={formData.description} onChange={handleChange} required />
            </label>
            <div className="form-buttons">
                <button type="submit">Сохранить</button>
                <button type="button" onClick={onClose}>Отмена</button>
            </div>
        </form>
    );
};
export default AchievementEditor;
