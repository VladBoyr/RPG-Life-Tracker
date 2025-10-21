import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import Modal from '../components/Modal';
import SkillsPanel from '../components/SkillsPanel';
import GoalsPanel from '../components/GoalsPanel';
import { useAuth } from '../contexts/AuthContext';
import { getGroups, createGroup, updateGroup, deleteGroup, searchUsers, getGroupDetails } from '../api/apiService';
import './GroupsPage.css';

const UserSearch = ({ group, onMembersUpdate }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const fetchUsers = useCallback(() => {
        setIsSearching(true);
        const excludeIds = group.members.map(m => m.id);
        searchUsers(query, excludeIds).then(response => {
            setResults(response.data);
            setIsSearching(false);
        });
    }, [query, group.members]);
    
    useEffect(() => {
        if (!isFocused) return;
        const delayDebounceFn = setTimeout(() => {
            fetchUsers();
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [query, isFocused, fetchUsers]);

    const handleFocus = () => {
        setIsFocused(true);
        if (query === '') fetchUsers();
    };

    const handleBlur = () => {
        setTimeout(() => setIsFocused(false), 200);
    };

    const handleAddMember = async (userToAdd) => {
        const currentMemberIds = group.members.map(m => m.id);
        const newMemberIds = [...currentMemberIds, userToAdd.id];
        try {
            const updatedGroup = await updateGroup(group.id, { member_ids: newMemberIds });
            onMembersUpdate(updatedGroup.data);
            setQuery('');
        } catch (error) {
            console.error("Failed to add member", error);
        }
    };

    return (
        <div className="user-search">
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder="Начните вводить логин или имя персонажа..."
            />
            {isFocused && (
                <ul className="search-results-list">
                    {isSearching && results.length === 0 && <li>Поиск...</li>}
                    {!isSearching && results.length === 0 && <li>Пользователи не найдены</li>}
                    {results.map(user => (
                        <li key={user.id} onMouseDown={() => handleAddMember(user)}>
                            <span>{user.username} ({user.character_name})</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

const GroupsPage = () => {
    const [groups, setGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [selectedSkill, setSelectedSkill] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const { impersonate } = useAuth();

    const fetchGroups = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await getGroups();
            setGroups(response.data);
        } catch (error) {
            console.error("Failed to fetch groups", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchGroups();
    }, [fetchGroups]);

    const handleSelectGroup = async (group) => {
        try {
            const response = await getGroupDetails(group.id);
            setSelectedGroup(response.data);
            setSelectedSkill(null);
        } catch (error) {
            console.error("Failed to fetch group details", error);
            setSelectedGroup(null); // Сбрасываем группу в случае ошибки
        }
    };
    
    const handleDataChange = useCallback(async () => {
        if (selectedGroup) {
            const currentSkillId = selectedSkill?.id;
            try {
                const response = await getGroupDetails(selectedGroup.id);
                const newGroupData = response.data;
                setSelectedGroup(newGroupData);
                
                if (currentSkillId) {
                    const newSelectedSkill = newGroupData.skills.find(s => s.id === currentSkillId);
                    setSelectedSkill(newSelectedSkill || null);
                }
            } catch(error) {
                console.error("Failed to refresh group data", error);
            }
        }
    }, [selectedGroup, selectedSkill]);

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        if (!newGroupName.trim()) return;
        try {
            const response = await createGroup({ name: newGroupName });
            await fetchGroups();
            await handleSelectGroup(response.data); 
        } catch (error) {
            alert("Не удалось создать группу. Возможно, имя уже занято.");
        } finally {
            setIsModalOpen(false);
            setNewGroupName('');
        }
    };

    const handleDeleteGroup = async (groupId) => {
        if (window.confirm("Вы уверены, что хотите удалить эту группу? Все связанные навыки и цели будут также удалены.")) {
            try {
                await deleteGroup(groupId);
                setSelectedGroup(null);
                await fetchGroups();
            } catch (error) { console.error("Failed to delete group", error); }
        }
    };
    
    const handleUpdateGroup = (updatedGroupData) => {
        const updatedFullGroup = { ...selectedGroup, ...updatedGroupData };
        setSelectedGroup(updatedFullGroup);
        setGroups(prevGroups => prevGroups.map(g => g.id === updatedFullGroup.id ? { ...g, members: updatedFullGroup.members } : g));
    };
    
    const handleRemoveMember = async (memberToRemove) => {
        const newMemberIds = selectedGroup.members.filter(m => m.id !== memberToRemove.id).map(m => m.id);
        try {
            const response = await updateGroup(selectedGroup.id, { member_ids: newMemberIds });
            handleUpdateGroup(response.data);
        } catch (error) { console.error("Failed to remove member", error); }
    };

    const groupSkills = selectedGroup ? selectedGroup.skills || [] : [];

    if (isLoading) return <Layout title="Группы"><div>Загрузка...</div></Layout>;

    return (
        <Layout title="Управление группами">
            <div className="groups-container">
                <div className="groups-list-panel card">
                    <div className="panel-header">
                        <h3>Ваши группы</h3>
                        <button className="icon-btn" onClick={() => setIsModalOpen(true)}>➕</button>
                    </div>
                    <ul className="groups-list">
                        {groups.map(group => (
                            <li key={group.id} className={selectedGroup?.id === group.id ? 'selected' : ''} onClick={() => handleSelectGroup(group)}>
                                {group.name}
                            </li>
                        ))}
                    </ul>
                </div>
                
                {selectedGroup ? (
                    <div className="group-detail-view">
                        <div className="group-detail-panel card">
                            <div className="panel-header">
                                <h3>{selectedGroup.name}</h3>
                                <button className="icon-btn danger" onClick={() => handleDeleteGroup(selectedGroup.id)}>🗑️</button>
                            </div>
                            <h4>Участники ({selectedGroup.members.length})</h4>
                            <ul className="members-list">
                                {selectedGroup.members.map(member => (
                                    <li key={member.id}>
                                        <span>{member.username} ({member.character_name})</span>
                                        <div className="member-actions">
                                            <button className="small-btn" title="Войти как этот пользователь" onClick={() => impersonate(member.id)}>👁️‍🗨️</button>
                                            <button className="small-btn" title="Удалить из группы" onClick={() => handleRemoveMember(member)}>❌</button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            <hr/>
                            <h4>Добавить участника</h4>
                            <UserSearch group={selectedGroup} onMembersUpdate={handleUpdateGroup} />
                        </div>

                        <div className="content-panel">
                            <SkillsPanel 
                                owner={selectedGroup}
                                ownerType="group"
                                skills={groupSkills}
                                onSkillSelect={setSelectedSkill}
                                selectedSkill={selectedSkill}
                                canAddProgress={false}
                                disableGroupManagement={false}
                                showExtendedFields={false}
                                onDataChange={handleDataChange}
                            />
                            <GoalsPanel 
                                selectedSkill={selectedSkill}
                                disableGroupManagement={false}
                                onDataChange={handleDataChange}
                                isManagementMode={true} /* <--- Вот это изменение */
                            />
                        </div>
                    </div>
                ) : (
                    <div className="card">
                        <p>Выберите группу из списка для просмотра деталей и управления навыками.</p>
                    </div>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Создать новую группу">
                <form onSubmit={handleCreateGroup} className="editor-form">
                    <label>
                        Название группы:
                        <input
                            type="text"
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            autoFocus
                        />
                    </label>
                    <div className="form-buttons">
                        <button type="submit">Создать</button>
                        <button type="button" onClick={() => setIsModalOpen(false)}>Отмена</button>
                    </div>
                </form>
            </Modal>
        </Layout>
    );
};

export default GroupsPage;
