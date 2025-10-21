import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import { getUsers } from '../api/apiService';
import './UsersPage.css';

const UsersPage = () => {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { impersonate } = useAuth();

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await getUsers();
                setUsers(response.data);
            } catch (error) {
                console.error("Failed to fetch users", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const handleImpersonate = (userId) => {
        if (window.confirm("Вы уверены, что хотите войти под этим пользователем?")) {
            impersonate(userId);
        }
    };

    if (isLoading) return <Layout title="Пользователи"><div>Загрузка...</div></Layout>;

    return (
        <Layout title="Все пользователи">
            <div className="card users-table-container">
                <table className="users-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Логин</th>
                            <th>Имя персонажа</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id}>
                                <td>{user.id}</td>
                                <td>{user.username}</td>
                                <td>{user.character_name}</td>
                                <td>
                                    <button onClick={() => handleImpersonate(user.id)}>
                                        Войти как...
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Layout>
    );
};

export default UsersPage;
