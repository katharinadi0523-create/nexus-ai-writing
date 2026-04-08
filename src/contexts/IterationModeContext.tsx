import React, { createContext, useContext, useEffect, useState } from 'react';

const ITERATION_MODE_STORAGE_KEY = 'nexus_iteration_mode_enabled';

interface IterationModeContextValue {
  isIterationMode: boolean;
  setIsIterationMode: (value: boolean) => void;
  toggleIterationMode: () => void;
}

const IterationModeContext = createContext<IterationModeContextValue | null>(null);

export const IterationModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isIterationMode, setIsIterationMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      return window.localStorage.getItem(ITERATION_MODE_STORAGE_KEY) === 'true';
    } catch (error) {
      console.error('读取迭代模式开关失败:', error);
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(ITERATION_MODE_STORAGE_KEY, String(isIterationMode));
    } catch (error) {
      console.error('保存迭代模式开关失败:', error);
    }
  }, [isIterationMode]);

  return (
    <IterationModeContext.Provider
      value={{
        isIterationMode,
        setIsIterationMode,
        toggleIterationMode: () => setIsIterationMode((prev) => !prev),
      }}
    >
      {children}
    </IterationModeContext.Provider>
  );
};

export function useIterationMode() {
  const context = useContext(IterationModeContext);

  if (!context) {
    throw new Error('useIterationMode 必须在 IterationModeProvider 中使用');
  }

  return context;
}
