import React, { createContext, useContext, useState, useEffect } from 'react';
import { setErrorLogger } from '../services/api';

const ErrorLogContext = createContext(null);

export const ErrorLogProvider = ({ children }) => {
  const [errorLogs, setErrorLogs] = useState([]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    // Register global API interceptor callback
    setErrorLogger((errorDetail) => {
      setErrorLogs((prev) => [errorDetail, ...prev].slice(0, 50)); // Keep latest 50 logs
      showToast(errorDetail.message, 'error');
    });
  }, []);

  const addErrorLog = (log) => {
    setErrorLogs((prev) => [log, ...prev].slice(0, 50));
  };

  const clearErrorLogs = () => {
    setErrorLogs([]);
  };

  const showToast = (message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  return (
    <ErrorLogContext.Provider value={{ errorLogs, addErrorLog, clearErrorLogs, toast, showToast }}>
      {children}
    </ErrorLogContext.Provider>
  );
};

export const useErrorLogs = () => {
  const context = useContext(ErrorLogContext);
  if (!context) throw new Error('useErrorLogs must be used within an ErrorLogProvider');
  return context;
};
