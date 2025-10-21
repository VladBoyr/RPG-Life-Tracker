import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import AwardsReel from '../components/AwardsReel';
import Modal from '../components/Modal';
import AchievementEditor from '../components/AchievementEditor';
import LootEditor from '../components/LootEditor';
import { 
    getLootboxStatus, openLootbox, getLootItems, getRewardsHistory,
    createLootItem, updateLootItem, deleteLootItem,
    createAchievement, updateAchievement, deleteAchievement
} from '../api/apiService';
import './RewardsPage.css';
import './MainPage.css';
import Layout from '../components/layout/Layout';

const rarityClasses = {
    COMMON: 'rarity-common',
    UNCOMMON: 'rarity-uncommon',
    RARE: 'rarity-rare',
    UNIQUE: 'rarity-unique',
    LEGENDARY: 'rarity-legendary',
};

const RewardsPage = () => {
    const { character, fetchData } = useData();
    const { logout } = useAuth();
    const location = useLocation();

    const [lootboxStatus, setLootboxStatus] = useState({ can_open: false, completed_dailies: 0, required_dailies: 3 });
    const [lootItems, setLootItems] = useState([]);
    const [rewardsHistory, setRewardsHistory] = useState([]);
    const [wonItem, setWonItem] = useState(null);
    const [isSpinning, setIsSpinning] = useState(false);
    const [achSource, setAchSource] = useState('character');
    const [isAchModalOpen, setAchModalOpen] = useState(false);
    const [isLootModalOpen, setLootModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    
    const fetchAllData = async () => { const statusRes = await getLootboxStatus(); setLootboxStatus(statusRes.data); const lootRes = await getLootItems(); setLootItems(lootRes.data); const historyRes = await getRewardsHistory(); setRewardsHistory(historyRes.data); };
    useEffect(() => { fetchAllData(); }, []);

    const handleOpenLootbox = async () => {
        if (!lootboxStatus.can_open) return;
        setIsSpinning(true);
        setWonItem(null);
        try {
            const { data: responseData } = await openLootbox();
            window.triggerSpin(responseData.won_item);
        } catch (error) {
            console.error("Failed to open lootbox", error);
            alert('Не удалось открыть лутбокс. Возможно, он уже был открыт сегодня.');
            setIsSpinning(false);
        }
    };

    const onSpinEnd = async (finalItem) => {
        setWonItem(finalItem);
        setIsSpinning(false);
        setTimeout(() => {
            Promise.all([
                fetchAllData(),
                fetchData()
            ]).catch(error => {
                console.error("Failed to refresh data after opening lootbox:", error);
            });
        }, 2000);
    };

    const openAchModal = (ach = null) => { setEditingItem(ach); setAchModalOpen(true); };
    const handleSaveAchievement = async (achData) => { const payload = { ...achData, owner_character: achSource === 'character' ? character.id : null, owner_skill: achSource !== 'character' ? achSource : null }; if (achData.id) { await updateAchievement(achData.id, payload); } else { await createAchievement(payload); } await fetchData(); setAchModalOpen(false); };
    const handleDeleteAchievement = async (achId) => { if (window.confirm('Вы уверены, что хотите удалить это достижение?')) { await deleteAchievement(achId); await fetchData(); } };
    const openLootModal = (loot = null) => { setEditingItem(loot); setLootModalOpen(true); };
    const handleSaveLoot = async (lootData) => { if(lootData.id) { await updateLootItem(lootData.id, lootData); } else { await createLootItem(lootData); } await fetchAllData(); setLootModalOpen(false); };
    const handleDeleteLoot = async (lootId) => { if (window.confirm('Вы уверены, что хотите удалить этот предмет?')) { await deleteLootItem(lootId); await fetchAllData(); } };
    const availableLoot = lootItems.filter(item => !item.received_date);
    const totalChance = availableLoot.reduce((sum, item) => sum + parseFloat(item.base_chance), 0);
    const currentAchievements = achSource === 'character' ? character?.achievements.filter(a => !a.claimed_date) : character?.skills.find(s => s.id === parseInt(achSource))?.achievements.filter(a => !a.claimed_date);

    if (!character) return <div>Загрузка...</div>;

    return (
        <Layout title="Награды">
        <div className="rewards-container">
            <div className="rewards-grid">
                <div className="lootbox-panel card"><h3>Лутбокс</h3><p>Выполнено дейликов сегодня: {lootboxStatus.completed_dailies} / {lootboxStatus.required_dailies}</p><button onClick={handleOpenLootbox} disabled={!lootboxStatus.can_open || isSpinning}>{isSpinning ? 'Вращаем...' : 'Открыть лутбокс!'}</button><div className="reel-wrapper"><AwardsReel availableItems={availableLoot} onSpinEnd={onSpinEnd} /></div>{wonItem && (<div className={`won-item-display ${rarityClasses[wonItem.rarity]}`}>Вы выиграли: <strong>{wonItem.name}</strong> ({wonItem.rarity})</div>)}</div>
                <div className="management-panel card">
                    <div className="panel-header">
                        <button className="icon-btn add-btn" onClick={() => openAchModal()}>
                            <span role="img" aria-label="Добавить достижение">➕</span>
                        </button>
                        <h3>Управление достижениями</h3>
                    </div>
                    <select value={achSource} onChange={e => setAchSource(e.target.value)}>
                        <option value="character">Уровень персонажа</option>
                        {character?.skills.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <ul className="management-list">
                        {currentAchievements?.map(ach => (
                            <li key={ach.id}>
                                <span>Ур. {ach.required_level}: {ach.description}</span>
                                <div className="item-actions">
                                    <button className="small-btn" onClick={() => openAchModal(ach)}>✏️</button>
                                    <button className="small-btn" onClick={() => handleDeleteAchievement(ach.id)}>🗑️</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="management-panel card">
                    <div className="panel-header">
                        <button className="icon-btn add-btn" onClick={() => openLootModal()}>
                            <span role="img" aria-label="Добавить предмет">➕</span>
                        </button>
                        <h3>Предметы лутбокса (Доступные)</h3>
                    </div>
                    <p>Сумма шансов: {totalChance.toFixed(2)}%</p>
                    <div className="list-container">
                         <table className="rewards-table">
                            <thead>
                                <tr>
                                    <th>Название</th>
                                    <th>Редкость</th>
                                    <th>Шанс (%)</th>
                                    <th className="actions-column">Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                {availableLoot.map(item => (
                                    <tr key={item.id} className={rarityClasses[item.rarity]}>
                                        <td>{item.name}</td>
                                        <td>{item.rarity}</td>
                                        <td>{item.base_chance}</td>
                                        <td className="actions-column">
                                            <button className="small-btn" onClick={() => openLootModal(item)}>✏️</button>
                                            <button className="small-btn" onClick={() => handleDeleteLoot(item.id)}>🗑️</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="history-panel card"><h3>История полученных наград</h3><ul className="history-list">{rewardsHistory.map(reward => (<li key={reward.id}><span>"{reward.description}" из "{reward.source_name}"</span><span className="date">{new Date(reward.received_date).toLocaleString()}</span></li>))}</ul></div>
            </div>
            <Modal isOpen={isAchModalOpen} onClose={() => setAchModalOpen(false)} title={editingItem ? "Редактировать достижение" : "Новое достижение"}><AchievementEditor item={editingItem} onSave={handleSaveAchievement} onClose={() => setAchModalOpen(false)} /></Modal>
            <Modal isOpen={isLootModalOpen} onClose={() => setLootModalOpen(false)} title={editingItem ? "Редактировать предмет" : "Новый предмет"}><LootEditor item={editingItem} onSave={handleSaveLoot} onClose={() => setLootModalOpen(false)} /></Modal>
        </div>
        </Layout>
    );
};

export default RewardsPage;
