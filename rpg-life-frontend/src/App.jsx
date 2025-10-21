import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useData } from './contexts/DataContext';
import { getCSRFToken } from './api/apiService';

import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import MainPage from './pages/MainPage';
import RewardsPage from './pages/RewardsPage';
import SettingsPage from './pages/SettingsPage';
import GroupsPage from './pages/GroupsPage';
import UsersPage from './pages/UsersPage';

function App() {
  const { authTokens } = useAuth();
  const { character, loading } = useData();
  const { isInitialLoad } = useData(); 

  useEffect(() => {
    const fetchCSRF = async () => {
      try {
        await getCSRFToken();
      } catch (error) {
        console.error('Failed to set CSRF cookie:', error);
      }
    };
    fetchCSRF();
  }, []);

  if (isInitialLoad && authTokens) {
    return <div>Загрузка данных...</div>
  }

  return (
    <Routes>
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/main" element={authTokens ? <MainPage /> : <Navigate to="/login" />} />
      <Route path="/rewards" element={authTokens ? <RewardsPage /> : <Navigate to="/login" />} />
      <Route path="/settings" element={authTokens ? <SettingsPage /> : <Navigate to="/login" />} />

      <Route 
        path="/groups" 
        element={authTokens && character?.is_staff ? <GroupsPage /> : <Navigate to="/main" />} 
      />
      <Route 
        path="/users" 
        element={authTokens && character?.is_staff ? <UsersPage /> : <Navigate to="/main" />} 
      />

      <Route path="*" element={<Navigate to={authTokens ? "/main" : "/login"} />} />
    </Routes>
  );
}

export default App;
