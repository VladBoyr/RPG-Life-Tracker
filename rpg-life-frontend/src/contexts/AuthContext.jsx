import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, startImpersonate, stopImpersonate as apiStopImpersonate } from '../api/apiService';
import apiService from '../api/apiService';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const ORIGINAL_TOKENS_KEY = 'originalAuthTokens';
const IMPERSONATE_TOKENS_KEY = 'impersonateAuthTokens';
const EXIT_TOKEN_KEY = 'impersonateExitToken';

function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      // Does this cookie string begin with the name we want?
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [authTokens, setAuthTokens] = useState(() => {
    const impersonateTokens = sessionStorage.getItem(IMPERSONATE_TOKENS_KEY);
    if (impersonateTokens) return JSON.parse(impersonateTokens);

    const originalTokens = localStorage.getItem(ORIGINAL_TOKENS_KEY);
    if (originalTokens) return JSON.parse(originalTokens);

    return null;
  });

  const [isImpersonating, setIsImpersonating] = useState(
    () => !!localStorage.getItem(EXIT_TOKEN_KEY) 
  );

  useEffect(() => {
    if (authTokens?.access) {
      apiService.defaults.headers.common['Authorization'] = `Bearer ${authTokens.access}`;
    } else {
      delete apiService.defaults.headers.common['Authorization'];
    }
  }, [authTokens]);

  const login = async (username, password) => {
    const data = await loginUser(username, password);
    localStorage.setItem(ORIGINAL_TOKENS_KEY, JSON.stringify(data));
    setAuthTokens(data);
    setIsImpersonating(false);
  };

  const logout = () => {
    localStorage.removeItem(ORIGINAL_TOKENS_KEY);
    sessionStorage.removeItem(IMPERSONATE_TOKENS_KEY);
    localStorage.removeItem(EXIT_TOKEN_KEY);
    setAuthTokens(null);
    setIsImpersonating(false);
    navigate('/login');
  };

  const impersonate = async (userId) => {
    try {
      const { data } = await startImpersonate(userId);
      const impersonateTokens = { access: data.access, refresh: data.refresh };
      sessionStorage.setItem(IMPERSONATE_TOKENS_KEY, JSON.stringify(impersonateTokens));
      localStorage.setItem(EXIT_TOKEN_KEY, data.impersonate_exit_token);
      setAuthTokens(impersonateTokens);
      setIsImpersonating(true);
      navigate('/main', { replace: true });
    } catch (error) {
      console.error("Impersonation failed", error);
      alert("Не удалось войти под этим пользователем.");
    }
  };

  const stopImpersonation = async () => {
    const exitToken = localStorage.getItem(EXIT_TOKEN_KEY);
    if (!exitToken) {
      console.error("Exit token not found, cannot stop impersonation. Logging out.");
      logout();
      return;
    }

    try {
      const { data } = await apiStopImpersonate(exitToken);
      const originalUserTokens = data;
      sessionStorage.removeItem(IMPERSONATE_TOKENS_KEY);
      localStorage.removeItem(EXIT_TOKEN_KEY);
      localStorage.setItem(ORIGINAL_TOKENS_KEY, JSON.stringify(originalUserTokens));
      setAuthTokens(originalUserTokens);
      setIsImpersonating(false);
      navigate('/main', { replace: true });
    } catch (error) {
      console.error("Failed to stop impersonation via API, logging out.", error);
      logout();
    }
  };

  const value = {
    authTokens,
    isImpersonating,
    login,
    logout,
    impersonate,
    stopImpersonation,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
