import React, { useState } from 'react';
import Modal from './Modal';
import GoalEditor from './GoalEditor';
import GoalHistoryModal from './GoalHistoryModal';
import { createGoal, updateGoal, deleteGoal, toggleGoalComplete, getGoalsHistory, duplicateGoal } from '../api/apiService';
import { useData } from '../contexts/DataContext';
import './GoalsPanel.css';

const GoalsPanel = ({ selectedSkill, disableGroupManagement = false, onDataChange, isManagementMode = false }) => {
    const { updateStateFromResponse } = useData();
    const [isGoalModalOpen, setGoalModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    const [isHistoryModalOpen, setHistoryModalOpen] = useState(false);
    const [historyData, setHistoryData] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    const handleToggleGoal = async (goalId) => {
        const response = await toggleGoalComplete(goalId);
        if (onDataChange) {
            onDataChange();
        } else {
            updateStateFromResponse(response.data);
        }
    };

    const openGoalModal = (goal = null) => {
        setEditingItem(goal || { description: 'Новая цель', goal_type: 'DAILY', xp_reward: 25 });
        setGoalModalOpen(true);
    };

    const handleSaveGoal = async (goalData) => {
        const payload = { ...goalData, skill: selectedSkill.id };
        let response;
        if (goalData.id) {
            response = await updateGoal(goalData.id, payload);
        } else {
            response = await createGoal(payload);
        }
        
        if (onDataChange) {
            onDataChange();
        } else {
            updateStateFromResponse(response.data); 
        }
        setGoalModalOpen(false);
    };

    const handleDeleteGoal = async (goal) => {
        if (window.confirm(`Удалить цель "${goal.description}"?`)) {
            const response = await deleteGoal(goal.id);
            if (onDataChange) {
                onDataChange();
            } else {
                updateStateFromResponse(response.data);
            }
        }
    };

    const handleDuplicateGoal = async (goalId) => {
        const response = await duplicateGoal(goalId);
        if (onDataChange) {
            onDataChange();
        } else {
            updateStateFromResponse(response.data);
        }
    };

    const handleOpenHistory = async () => {
        if (!selectedSkill) return;
        setIsLoadingHistory(true);
        setHistoryModalOpen(true);
        try {
            const response = await getGoalsHistory(selectedSkill.id);
            setHistoryData(response.data);
        } catch (error) {
            console.error("Failed to fetch goal history:", error);
            setHistoryData([]);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const handleCreateFromHistory = (historyEntry) => {
        const newGoalData = {
            description: historyEntry.goal_description,
            xp_reward: historyEntry.xp_amount,
            goal_type: historyEntry.goal_type || 'BLUE',
        };
        setHistoryModalOpen(false);
        openGoalModal(newGoalData);
    };

    const currentGoals = selectedSkill?.goals || [];
    const dailyGoals = currentGoals.filter(g => g.goal_type === 'DAILY');

    const oneTimeGoals = currentGoals.filter(g => g.goal_type !== 'DAILY');

    const goalTypeOrder = { 'BLUE': 1, 'YELLOW': 2, 'RED': 3 };
    oneTimeGoals.sort((a, b) => goalTypeOrder[a.goal_type] - goalTypeOrder[b.goal_type]);

    const isManagementDisabled = (goal) => {
        if (!selectedSkill?.group) return false;
        if (goal.owner) return false;
        return disableGroupManagement;
    };

    const renderGoalItem = (goal) => (
        <li key={goal.id} className={goal.is_completed ? 'completed' : ''}>
            {!isManagementMode && (
                <input 
                    type="checkbox" 
                    checked={goal.is_completed} 
                    onChange={() => handleToggleGoal(goal.id)}
                />
            )}
            {selectedSkill.group && (
                <span className="group-icon" title={goal.owner ? "Личная цель" : "Общая цель группы"}>
                    {goal.owner ? '👤' : '👥'}
                </span>
            )}
            <span className="goal-desc">{goal.description} (+{goal.xp_reward} XP)</span>
            <div className="goal-actions">
                <button 
                    className="small-btn" 
                    title="Дублировать"
                    onClick={() => handleDuplicateGoal(goal.id)}
                    disabled={goal.goal_type === 'DAILY' || goal.is_completed} // Не даем дублировать дейлики и выполненные цели
                >
                    📋
                </button>
                <button className="small-btn" title="Редактировать" onClick={() => openGoalModal(goal)} disabled={goal.is_completed || isManagementDisabled(goal)}>✏️</button>
                <button className="small-btn" title="Удалить" onClick={() => handleDeleteGoal(goal)} disabled={goal.is_completed || isManagementDisabled(goal)}>🗑️</button>
            </div>
        </li>
    );

    return (
        <div className="goals-panel card">
            <div className="panel-header">
                {selectedSkill && (
                    <>
                        <button className="icon-btn add-btn" onClick={() => openGoalModal()} disabled={!selectedSkill} title="Добавить цель">
                            <span role="img" aria-label="Добавить">➕</span>
                        </button>
                        {/* Скрываем кнопку истории в режиме управления */}
                        {!isManagementMode && (
                            <button className="icon-btn" onClick={handleOpenHistory} title="Посмотреть историю">
                                <span role="img" aria-label="История">📜</span>
                            </button>
                        )}
                    </>
                )}
                <h3>{selectedSkill ? `Цели для: ${selectedSkill.name}` : 'Выберите навык'}</h3>
            </div>

            {selectedSkill && (
                <div className="list-container">
                    <ul className="goals-list">
                        {dailyGoals.map(renderGoalItem)}

                        {dailyGoals.length > 0 && oneTimeGoals.length > 0 && <div className="goals-separator"></div>}

                        {oneTimeGoals.map(renderGoalItem)}
                    </ul>
                </div>
            )}

            <Modal isOpen={isGoalModalOpen} onClose={() => setGoalModalOpen(false)} title={editingItem?.id ? "Редактировать цель" : "Новая цель"}>
                <GoalEditor item={editingItem} onSave={handleSaveGoal} onClose={() => setGoalModalOpen(false)} />
            </Modal>

            {isHistoryModalOpen && selectedSkill && (
                <GoalHistoryModal
                    isOpen={isHistoryModalOpen}
                    onClose={() => setHistoryModalOpen(false)}
                    skillName={selectedSkill.name}
                    history={historyData}
                    isLoading={isLoadingHistory}
                    onCreateFromHistory={handleCreateFromHistory}
                />
            )}
        </div>
    );
};

export default GoalsPanel;
