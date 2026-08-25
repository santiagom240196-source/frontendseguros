import React, { createContext, useContext, useState } from 'react';
import { USERS, DEFAULT_USER } from '../constants/users';

const UserContext = createContext();

export const UserProvider = ({ children, onResetData }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    const savedId = localStorage.getItem('app_active_user_id');
    const found = USERS.find(u => u.id === savedId);
    return found || DEFAULT_USER;
  });

  const switchUser = (userId) => {
    const user = USERS.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('app_active_user_id', user.id);
      if (onResetData) {
        onResetData(user.isDemo);
      }
    }
  };

  const isDemo = Boolean(currentUser?.isDemo);

  return (
    <UserContext.Provider value={{
      currentUser,
      users: USERS,
      switchUser,
      isDemo,
      resetDemoData: () => onResetData && onResetData(true)
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export default UserContext;
