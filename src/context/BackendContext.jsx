import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { checkHasuraHealth, getHasuraConfig, saveHasuraConfig, resetHasuraConfig } from '../services/hasuraClient';

const BackendContext = createContext();

export const BackendProvider = ({ children, onSyncRequested }) => {
  const [config, setConfig] = useState(getHasuraConfig);
  const [status, setStatus] = useState('checking'); // 'connected' | 'disconnected' | 'checking'
  const [latency, setLatency] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const checkConnection = useCallback(async () => {
    setStatus('checking');
    try {
      const result = await checkHasuraHealth();
      setLatency(result.latencyMs);
      setLastChecked(new Date());
      if (result.isHealthy) {
        setStatus('connected');
        setErrorMessage(null);
      } else {
        setStatus('disconnected');
        setErrorMessage(result.error);
      }
      return result;
    } catch (err) {
      setStatus('disconnected');
      setErrorMessage(err.message || 'Error de conexión');
      return { isHealthy: false, error: err.message };
    }
  }, []);

  // Initial check and periodic health check every 45s
  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 45000);
    return () => clearInterval(interval);
  }, [checkConnection]);

  const updateConfig = (newConfig) => {
    saveHasuraConfig(newConfig);
    setConfig(getHasuraConfig());
    setTimeout(checkConnection, 100);
  };

  const restoreDefaults = () => {
    resetHasuraConfig();
    setConfig(getHasuraConfig());
    setTimeout(checkConnection, 100);
  };

  return (
    <BackendContext.Provider value={{
      config,
      status,
      latency,
      lastChecked,
      errorMessage,
      checkConnection,
      updateConfig,
      restoreDefaults,
      triggerSync: onSyncRequested,
    }}>
      {children}
    </BackendContext.Provider>
  );
};

export const useBackend = () => {
  const context = useContext(BackendContext);
  if (!context) {
    throw new Error('useBackend must be used within a BackendProvider');
  }
  return context;
};

export default BackendContext;
