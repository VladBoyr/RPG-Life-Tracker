import React from 'react';
import Modal from './Modal';
import './CharacterHistoryModal.css';

const actionMap = {
    COMPLETED: { text: 'Цель выполнена', class: 'completed', sign: '+' },
    REVERTED: { text: 'Выполнение отменено', class: 'reverted', sign: '-' },
    PROGRESS_ADDED: { text: 'Добавлен прогресс', class: 'progress-added', sign: '+' }
};

const CharacterHistoryModal = ({ isOpen, onClose, history, isLoading }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Полная история персонажа`}>
            <div className="history-container">
                {isLoading ? (
                    <p>Загрузка истории...</p>
                ) : history.length === 0 ? (
                    <p>История персонажа пуста.</p>
                ) : (
                    <ul className="history-list">
                        {history.map(entry => (
                            <li key={entry.id} className={`history-item ${actionMap[entry.action].class}`}>
                                <div className="history-item-main">
                                    <p className="history-description">{entry.goal_description}</p>
                                    <p className="history-skill-name">Навык: {entry.skill_name}</p>
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

export default CharacterHistoryModal;
