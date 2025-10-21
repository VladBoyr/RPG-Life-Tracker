import axios from 'axios';

const baseURL = '/api';

const apiService = axios.create({
  baseURL: baseURL,
  withCredentials: true,
});

apiService.defaults.xsrfCookieName = 'csrftoken';
apiService.defaults.xsrfHeaderName = 'X-CSRFToken';

apiService.interceptors.request.use(
  (config) => {
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    config.headers['X-Timezone'] = userTimezone;

    let tokens = JSON.parse(sessionStorage.getItem('impersonateAuthTokens'));

    if (!tokens) {
      tokens = JSON.parse(localStorage.getItem('originalAuthTokens'));
    }

    if (tokens?.access) {
      config.headers['Authorization'] = `Bearer ${tokens.access}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiService.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const impersonateTokens = sessionStorage.getItem('impersonateAuthTokens');
      const originalTokens = localStorage.getItem('originalAuthTokens');
      
      let tokensToRefresh = null;
      if (impersonateTokens) {
        tokensToRefresh = JSON.parse(impersonateTokens);
      } else if (originalTokens) {
        tokensToRefresh = JSON.parse(originalTokens);
      }
      
      if (tokensToRefresh?.refresh) {
        try {
          const response = await axios.post(`${baseURL}/token/refresh/`, {
            refresh: tokensToRefresh.refresh,
          });
          
          const newTokens = { ...tokensToRefresh, access: response.data.access };
          
          if (impersonateTokens) {
            sessionStorage.setItem('impersonateAuthTokens', JSON.stringify(newTokens));
          } else {
            localStorage.setItem('originalAuthTokens', JSON.stringify(newTokens));
          }

          originalRequest.headers['Authorization'] = `Bearer ${response.data.access}`;
          
          return apiService(originalRequest);
        } catch (refreshError) {
          console.error("Refresh token failed:", refreshError);
          localStorage.removeItem('originalAuthTokens');
          sessionStorage.removeItem('impersonateAuthTokens');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        localStorage.removeItem('originalAuthTokens');
        sessionStorage.removeItem('impersonateAuthTokens');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);


export const registerUser = (userData) => apiService.post('/register/', userData);

export const loginUser = async (username, password) => {
  const response = await axios.post(`${baseURL}/token/`, {
    username,
    password,
  });
  return response.data;
};

export const getCSRFToken = () => apiService.get('/get-csrf-token/');

// Character
export const getCharacterData = () => apiService.get('/character/');
export const updateCharacter = (data) => apiService.patch('/character/', data);

// Skills
export const getSkills = () => apiService.get('/skills/');
export const createSkill = (data) => apiService.post('/skills/', data);
export const updateSkill = (id, data) => apiService.put(`/skills/${id}/`, data);
export const deleteSkill = (id) => apiService.delete(`/skills/${id}/`);
export const addSkillProgress = (id, units) => apiService.post(`/skills/${id}/add_progress/`, { units });

// Goals
export const createGoal = (data) => apiService.post('/goals/', data);
export const updateGoal = (id, data) => apiService.put(`/goals/${id}/`, data);
export const deleteGoal = (id) => apiService.delete(`/goals/${id}/`);
export const toggleGoalComplete = (id) => apiService.post(`/goals/${id}/toggle_complete/`);
export const duplicateGoal = (id) => apiService.post(`/goals/${id}/duplicate/`);

// Goal History
export const getGoalsHistory = (skillId) => {
    const params = skillId ? { skill_id: skillId } : {};
    return apiService.get('/goals-history/', { params });
};

// Lootbox & Rewards
export const getLootboxStatus = () => apiService.get('/lootbox/');
export const openLootbox = () => apiService.post('/lootbox/');
export const getLootItems = () => apiService.get('/loot-items/');
export const createLootItem = (data) => apiService.post('/loot-items/', data);
export const updateLootItem = (id, data) => apiService.put(`/loot-items/${id}/`, data);
export const deleteLootItem = (id) => apiService.delete(`/loot-items/${id}/`);
export const getRewardsHistory = () => apiService.get('/rewards-history/');

// Achievements
export const createAchievement = (data) => apiService.post('/achievements/', data);
export const updateAchievement = (id, data) => apiService.put(`/achievements/${id}/`, data);
export const deleteAchievement = (id) => apiService.delete(`/achievements/${id}/`);

// Notes
export const createNote = (data) => apiService.post('/notes/', data);
export const updateNote = (id, data) => apiService.put(`/notes/${id}/`, data);
export const deleteNote = (id) => apiService.delete(`/notes/${id}/`);

// Groups
export const getGroups = () => apiService.get('/groups/');
export const getGroupDetails = (id) => apiService.get(`/groups/${id}/`);
export const createGroup = (data) => apiService.post('/groups/', data);
export const updateGroup = (id, data) => apiService.patch(`/groups/${id}/`, data);
export const deleteGroup = (id) => apiService.delete(`/groups/${id}/`);

// Users
export const getUsers = () => apiService.get('/users/');
export const searchUsers = (query, excludeIds = []) => {
    const excludeQuery = excludeIds.length > 0 ? `&exclude_ids=${excludeIds.join(',')}` : '';
    return apiService.get(`/users/search/?search=${query}${excludeQuery}`);
};

// Impersonate
export const startImpersonate = (userId) => apiService.post('/impersonate/start/', { user_id: userId });
export const stopImpersonate = (exitToken) => apiService.post('/impersonate/stop/', { impersonate_exit_token: exitToken });

export default apiService;
