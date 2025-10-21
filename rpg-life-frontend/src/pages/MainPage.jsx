import React, { useState, useEffect, useCallback } from 'react';
import { useData } from '../contexts/DataContext';
import Layout from '../components/layout/Layout';
import ProgressBar from '../components/ProgressBar';
import SkillsPanel from '../components/SkillsPanel';
import GoalsPanel from '../components/GoalsPanel';
import CharacterHistoryModal from '../components/CharacterHistoryModal';
import { updateCharacter, getGoalsHistory, getGroups, getGroupDetails } from '../api/apiService';
import './MainPage.css';

const MainPage = () => {
    const { character, fetchData } = useData();
    const [selectedSkill, setSelectedSkill] = useState(null);
    const [charNameInput, setCharNameInput] = useState('');
    
    // Состояние для переключения вида админом
    const [view, setView] = useState('personal'); // 'personal' or 'group'

    // Состояние для управления группами
    const [ownedGroups, setOwnedGroups] = useState([]);
    const [selectedManagedGroupId, setSelectedManagedGroupId] = useState('');
    const [managedGroupData, setManagedGroupData] = useState(null);
    const [isLoadingGroups, setIsLoadingGroups] = useState(false);

    const [isCharHistoryModalOpen, setCharHistoryModalOpen] = useState(false);
    const [charHistoryData, setCharHistoryData] = useState([]);
    const [isLoadingCharHistory, setIsLoadingCharHistory] = useState(false);

    // Эффект для загрузки групп, которыми владеет админ
    useEffect(() => {
        if (character?.is_staff) {
            setIsLoadingGroups(true);
            getGroups()
                .then(response => {
                    setOwnedGroups(response.data);
                    if (response.data.length > 0 && !selectedManagedGroupId) {
                        setSelectedManagedGroupId(response.data[0].id);
                    }
                })
                .catch(err => console.error("Failed to fetch owned groups", err))
                .finally(() => setIsLoadingGroups(false));
        }
    }, [character?.is_staff, selectedManagedGroupId]);

    // Эффект для загрузки данных выбранной для управления группы
    useEffect(() => {
        if (selectedManagedGroupId) {
            getGroupDetails(selectedManagedGroupId)
                .then(response => {
                    setManagedGroupData(response.data);
                    setSelectedSkill(null); // Сбрасываем выбранный навык при смене группы
                })
                .catch(err => console.error("Failed to fetch group details", err));
        }
    }, [selectedManagedGroupId]);
    
    const handleManagedDataChange = useCallback(async () => {
        if (managedGroupData) {
            const currentSkillId = selectedSkill?.id;
            try {
                const response = await getGroupDetails(managedGroupData.id);
                const newGroupData = response.data;
                setManagedGroupData(newGroupData);
                
                if (currentSkillId) {
                    const newSelectedSkill = newGroupData.skills.find(s => s.id === currentSkillId);
                    setSelectedSkill(newSelectedSkill || null);
                }
            } catch(error) {
                console.error("Failed to refresh group data", error);
            }
        }
    }, [managedGroupData, selectedSkill]);

    // Исправленный useEffect (Bug 4)
    useEffect(() => {
        if (character) {
            setCharNameInput(character.name);
            // Эта логика обновления должна работать только в личном виде
            if (view === 'personal' && selectedSkill) {
                const updatedSkill = character.skills.find(s => s.id === selectedSkill.id);
                setSelectedSkill(updatedSkill || null);
            }
        }
    }, [character, selectedSkill, view]); // Добавляем view в зависимости

    const handleCharNameSave = async () => {
        if (character && character.name !== charNameInput.trim() && charNameInput.trim() !== '') {
            try {
                await updateCharacter({ name: charNameInput.trim() });
                await fetchData();
            } catch (error) {
                console.error("Failed to update character name", error);
                setCharNameInput(character.name);
            }
        } else if (character) {
            setCharNameInput(character.name);
        }
    };

    const handleOpenCharHistory = async () => {
        setIsLoadingCharHistory(true);
        setCharHistoryModalOpen(true);
        try {
            const response = await getGoalsHistory();
            setCharHistoryData(response.data);
        } catch (error) {
            console.error("Failed to fetch character history:", error);
            setCharHistoryData([]);
        } finally {
            setIsLoadingCharHistory(false);
        }
    };

    if (!character) {
        return <Layout title="Главная"><div>Загрузка персонажа...</div></Layout>;
    }
    
    const renderPersonalView = () => (
        <div className="content-panel">
            <SkillsPanel
                owner={character}
                ownerType="character"
                skills={character.skills}
                onSkillSelect={setSelectedSkill}
                selectedSkill={selectedSkill}
                disableGroupManagement={true}
            />
            <GoalsPanel 
                selectedSkill={selectedSkill} 
                disableGroupManagement={true}
            />
        </div>
    );

    const renderGroupManagementView = () => (
        <div className="group-management-view">
            <div className="group-selector card">
                <h3>Управление группой:</h3>
                {isLoadingGroups ? <p>Загрузка групп...</p> : (
                    <select
                        value={selectedManagedGroupId}
                        onChange={(e) => setSelectedManagedGroupId(e.target.value)}
                    >
                        {ownedGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                )}
            </div>
            
            {managedGroupData ? (
                <div className="content-panel">
                    <SkillsPanel 
                        owner={managedGroupData}
                        ownerType="group"
                        skills={managedGroupData.skills}
                        onSkillSelect={setSelectedSkill}
                        selectedSkill={selectedSkill}
                        canAddProgress={false}
                        disableGroupManagement={false}
                        showExtendedFields={false} /* Исправление для Bug 3 */
                        onDataChange={handleManagedDataChange}
                    />
                    <GoalsPanel 
                        selectedSkill={selectedSkill}
                        disableGroupManagement={false}
                        onDataChange={handleManagedDataChange}
                        isManagementMode={true} /* Добавляем новый пропс */
                    />
                </div>
            ) : <p>Выберите группу для управления.</p>}
        </div>
    );

    return (
        <Layout title="Главная">
            <div className="main-container">
                {character.is_staff && (
                    <div className="view-switcher">
                        <button onClick={() => { setView('personal'); setSelectedSkill(null); }} className={view === 'personal' ? 'active' : ''}>Личные</button>
                        <button onClick={() => { setView('group'); setSelectedSkill(null); }} className={view === 'group' ? 'active' : ''}>Группа</button>
                    </div>
                )}
                
                {view === 'personal' && (
                    <div className="character-panel card">
                        <div className="character-header">
                            <input
                                type="text"
                                value={charNameInput}
                                onChange={(e) => setCharNameInput(e.target.value)}
                                onBlur={handleCharNameSave}
                                onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                                className="character-name-input"
                            />
                            <h2>(Уровень: {character.level})</h2>
                            <button 
                                className="icon-btn" 
                                onClick={handleOpenCharHistory}
                                title="Посмотреть полную историю персонажа"
                            >
                                <span role="img" aria-label="История персонажа">📖</span>
                            </button>
                        </div>
                        <ProgressBar
                            current={character.current_xp}
                            max={character.xp_to_next_level}
                            label={`${character.current_xp} / ${character.xp_to_next_level} XP`}
                        />
                    </div>
                )}

                {view === 'personal' ? renderPersonalView() : renderGroupManagementView()}
            </div>

            <CharacterHistoryModal
                isOpen={isCharHistoryModalOpen}
                onClose={() => setCharHistoryModalOpen(false)}
                history={charHistoryData}
                isLoading={isLoadingCharHistory}
            />
        </Layout>
    );
};

export default MainPage;
