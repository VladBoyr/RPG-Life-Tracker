import React, { useState } from 'react';
import Modal from './Modal';
import NoteEditor from './NoteEditor';
import { createNote, updateNote, deleteNote } from '../api/apiService';
import './NotesManager.css';

const NotesManager = ({ skill, onClose, onNotesUpdated }) => {
    const [isEditorOpen, setEditorOpen] = useState(false);
    const [editingNote, setEditingNote] = useState(null);

    const openEditor = (note = null) => {
        setEditingNote(note);
        setEditorOpen(true);
    };

    const handleSave = async (noteData) => {
        const payload = { ...noteData, skill: skill.id };
        let response;
        if (noteData.id) {
            response = await updateNote(noteData.id, payload);
        } else {
            response = await createNote(payload);
        }
        onNotesUpdated(response.data);
        setEditorOpen(false);
    };

    const handleDelete = async (noteId) => {
        if (window.confirm('Удалить эту заметку?')) {
            const response = await deleteNote(noteId);
            onNotesUpdated(response.data);
        }
    };

    const sortedNotes = [...skill.notes].sort((a, b) => new Date(b.date) - new Date(a.date));

    return (
        <Modal isOpen={true} onClose={onClose} title={`Заметки по навыку: ${skill.name}`}>
            <div className="notes-manager">
                <div className="notes-list-container">
                    {sortedNotes.length > 0 ? (
                        <ul className="notes-list">
                            {sortedNotes.map(note => (
                                <li key={note.id}>
                                    <div className="note-header">
                                        <span className="note-date">{new Date(note.date).toLocaleString()}</span>
                                        <div className="note-actions">
                                            <button className="small-btn" onClick={() => openEditor(note)}>✏️</button>
                                            <button className="small-btn" onClick={() => handleDelete(note.id)}>🗑️</button>
                                        </div>
                                    </div>
                                    <p className="note-text">{note.text}</p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>Заметок пока нет.</p>
                    )}
                </div>
                <div className="notes-footer">
                    <button onClick={() => openEditor()}>Добавить новую заметку</button>
                </div>
            </div>

            {isEditorOpen && (
                 <Modal isOpen={isEditorOpen} onClose={() => setEditorOpen(false)} title={editingNote ? 'Редактировать заметку' : 'Новая заметка'}>
                    <NoteEditor 
                        item={editingNote} 
                        onSave={handleSave} 
                        onClose={() => setEditorOpen(false)} 
                    />
                </Modal>
            )}
        </Modal>
    );
};

export default NotesManager;
