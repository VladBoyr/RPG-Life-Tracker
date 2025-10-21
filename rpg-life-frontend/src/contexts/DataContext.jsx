import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { getCharacterData } from '../api/apiService';
import { useAuth } from './AuthContext';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
  const [character, setCharacter] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const { authTokens } = useAuth();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await getCharacterData();
      setCharacter(data);
    } catch (error) {
      console.error("Failed to fetch character data", error);
    } finally {
      setLoading(false);
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
    }
  }, []);

  useEffect(() => {
    if (authTokens) {
      fetchData();
    } else {
      setCharacter(null);
      setIsInitialLoad(true);
    }
  }, [authTokens, fetchData]);
  
  const updateStateFromResponse = (data) => {
    const characterData = data.skills ? data : data.character;

    if (characterData) {
      setCharacter(characterData);
    } else {
        setCharacter(prevCharacter => {
            const newCharacter = { ...prevCharacter };

            if (data.character) {
                Object.assign(newCharacter, data.character);
            }

            if (data.skill) {
                const skillIndex = newCharacter.skills.findIndex(s => s.id === data.skill.id);
                if (skillIndex !== -1) {
                    newCharacter.skills[skillIndex] = data.skill;
                } else {
                    newCharacter.skills.push(data.skill);
                }
            }

            return newCharacter;
        });
    }
  };

  const value = {
    character,
    loading,
    isInitialLoad,
    fetchData,
    updateStateFromResponse
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
