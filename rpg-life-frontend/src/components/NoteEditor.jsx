import React, { useState, useEffect } from 'react';
import './EditorForm.css';

const NoteEditor = ({ item, onSave, onClose }) => {
    const [text, setText] = useState('');

    useEffect(() => {
        if (item) {
            setText(item.text || '');
        }
    }, [item]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (text.trim() === '') {
            alert('Текст заметки не может быть пустым.');
            return;
        }
        onSave({ ...item, text });
    };

    return (
        <form onSubmit={handleSubmit} className="editor-form">
            <label>
                Текст заметки:
                <textarea
                    name="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    required
                    rows="10"
                    style={{ fontFamily: 'inherit', fontSize: '1em' }}
                />
            </label>
            <div className="form-buttons">
                <button type="submit">Сохранить</button>
                <button type="button" onClick={onClose}>Отмена</button>
            </div>
        </form>
    );
};

export default NoteEditor;
