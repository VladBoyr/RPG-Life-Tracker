import React from 'react';
import Modal from './Modal';
import './GoalHistoryModal.css';

const actionMap = {
    COMPLETED: { text: 'Цель выполнена', class: 'completed', sign: '+' },
    REVERTED: { text: 'Выполнение отменено', class: 'reverted', sign: '-' },
    PROGRESS_ADDED: { text: 'Добавлен прогресс', class: 'progress-added', sign: '+' }
};

const GoalHistoryModal = ({ isOpen, onClose, skillName, history, isLoading, onCreateFromHistory }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`История по навыку: ${skillName}`}>
            <div className="history-container">
                {isLoading ? (
                    <p>Загрузка истории...</p>
                ) : history.length === 0 ? (
                    <p>История для этого навыка пуста.</p>
                ) : (
                    <ul className="history-list">
                        {history.map(entry => (
                            <li 
                                key={entry.id} 
                                className={`history-item ${actionMap[entry.action].class}`}
                                onClick={() => onCreateFromHistory(entry)}
                                title="Создать новую цель на основе этой записи"
                            >
                                <div className="history-item-main">
                                    <p className="history-description">{entry.goal_description}</p>
                                    <p className="history-xp">
                                        {actionMap[entry.action].sign}{entry.xp_amount} XP
                                    </p>
                                </div>
                                <div className="history-item-details">
                                    <span className="history-action">
                                        {actionMap[entry.action].text}
                                    </span>
                                    <span className="history-timestamp">
                                        {new Date(entry.timestamp).toLocaleString()}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </Modal>
    );
};

export default GoalHistoryModal;
