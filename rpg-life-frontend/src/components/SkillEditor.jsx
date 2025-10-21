import React, { useState, useEffect } from 'react';
import './EditorForm.css';

const SkillEditor = ({ item, onSave, onClose }) => {
  const [formData, setFormData] = useState({ name: '', unit_description: '', xp_per_unit: 10 });

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        unit_description: item.unit_description || 'ед. прогресса',
        xp_per_unit: item.xp_per_unit || 10,
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
        Название навыка:
        <input type="text" name="name" value={formData.name} onChange={handleChange} required />
      </label>
      <label>
        Описание единицы прогресса:
        <input type="text" name="unit_description" value={formData.unit_description} onChange={handleChange} required />
      </label>
      <label>
        Опыт за единицу:
        <input type="number" name="xp_per_unit" value={formData.xp_per_unit} onChange={handleChange} required min="0" />
      </label>
      <div className="form-buttons">
        <button type="submit">Сохранить</button>
        <button type="button" onClick={onClose}>Отмена</button>
      </div>
    </form>
  );
};

export default SkillEditor;
