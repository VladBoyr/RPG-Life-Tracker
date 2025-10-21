import React, { useState } from 'react';
import Modal from './Modal';
import SkillEditor from './SkillEditor';
import NotesManager from './NotesManager';
import { createSkill, updateSkill, deleteSkill, addSkillProgress } from '../api/apiService';
import { useData } from '../contexts/DataContext';
import './SkillsPanel.css';

const SkillsPanel = ({ owner, ownerType, skills, onSkillSelect, selectedSkill, canAddProgress = true, disableGroupManagement = false, showExtendedFields = true, onDataChange }) => {
    const { fetchData, updateStateFromResponse } = useData();
    const [isSkillModalOpen, setSkillModalOpen] = useState(false);
    const [isNotesModalOpen, setNotesModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    const openSkillModal = (skill = null) => {
        if (skill) {
            setEditingItem(skill);
        } else {
            setEditingItem({ name: 'Новый навык', unit_description: 'ед. прогресса', xp_per_unit: 10 });
        }
        setSkillModalOpen(true);
    };

    const handleSaveSkill = async (skillData) => {
        const payload = { 
            ...skillData, 
            character: ownerType === 'character' ? owner.id : null, 
            group: ownerType === 'group' ? owner.id : null,
        };
        if (skillData.id) {
            await updateSkill(skillData.id, payload);
        } else {
            await createSkill(payload);
        }
        
        if (onDataChange) {
            onDataChange();
        } else {
            await fetchData(); 
        }
        setSkillModalOpen(false);
    };

    const handleAddProgress = async (units) => {
        if (!selectedSkill) return;
        const response = await addSkillProgress(selectedSkill.id, units);
        updateStateFromResponse(response.data);
    };

    const handleDeleteSkill = async (skillId) => {
        if (window.confirm("Вы уверены, что хотите удалить этот навык?")) {
            await deleteSkill(skillId);
            onSkillSelect(null);
            if (onDataChange) {
                onDataChange();
            } else {
                await fetchData(); 
            }
        }
    };

    const handleSkillDoubleClick = (skill) => {
        onSkillSelect(skill);
        setNotesModalOpen(true);
    };

    return (
        <div className="skills-panel card">
            <div className="panel-header">
                <button className="icon-btn add-btn" onClick={() => openSkillModal()}>
                    <span role="img" aria-label="Добавить">➕</span>
                </button>
                <h3>Навыки</h3>
            </div>

            <div className="list-container">
                <table className="skills-table">
                    <thead>
                        <tr>
                            <th>Название</th>
                            {showExtendedFields && <th>Ур.</th>}
                            {showExtendedFields && <th>Опыт</th>}
                            {showExtendedFields && <th>XP/ед.</th>}
                            <th className="actions-column">Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {skills.map(skill => {
                            const isManagementDisabled = disableGroupManagement && skill.group;
                            return (
                                <tr 
                                    key={skill.id} 
                                    className={selectedSkill?.id === skill.id ? 'selected' : ''}
                                    onClick={() => onSkillSelect(skill)}
                                    onDoubleClick={() => handleSkillDoubleClick(skill)}
                                >
                                    <td>
                                        {skill.group && <span className="group-icon" title="Групповой навык">👥</span>}
                                        <span>{skill.name}</span>
                                    </td>
                                    {showExtendedFields && <td>{skill.level}</td>}
                                    {showExtendedFields && <td>{skill.current_xp} / {skill.xp_to_next_level}</td>}
                                    {showExtendedFields && <td>{skill.xp_per_unit}</td>}
                                    <td className="actions-column">
                                        <button className="small-btn" onClick={(e) => { e.stopPropagation(); openSkillModal(skill); }} disabled={isManagementDisabled}>✏️</button>
                                        <button className="small-btn" onClick={(e) => { e.stopPropagation(); handleDeleteSkill(skill.id); }} disabled={isManagementDisabled}>🗑️</button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
            {canAddProgress && (
                <div className="progress-adder-wrapper">
                    {selectedSkill ? (
                         <div className="progress-adder">
                            <h4>Добавить прогресс ({selectedSkill.xp_per_unit} XP за {selectedSkill.unit_description})</h4>
                            <div className="button-group">
                                <button onClick={() => handleAddProgress(1)}>+1 к прогрессу</button>
                                <button onClick={() => handleAddProgress(5)}>+5 к прогрессу</button>
                                <button onClick={() => handleAddProgress(10)}>+10 к прогрессу</button>
                            </div>
                        </div>
                    ) : (
                        <div className="progress-adder-placeholder">
                            <p>Выберите навык, чтобы добавить прогресс.</p>
                        </div>
                    )}
                </div>
            )}


            <Modal isOpen={isSkillModalOpen} onClose={() => setSkillModalOpen(false)} title={editingItem?.id ? "Редактировать навык" : "Новый навык"}>
                <SkillEditor item={editingItem} onSave={handleSaveSkill} onClose={() => setSkillModalOpen(false)} />
            </Modal>

            {isNotesModalOpen && selectedSkill && (
                <NotesManager
                    skill={selectedSkill}
                    onClose={() => setNotesModalOpen(false)}
                    onNotesUpdated={() => fetchData()}
                />
            )}
        </div>
    );
};

export default SkillsPanel;
