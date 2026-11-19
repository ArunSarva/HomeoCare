import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { getCloudSetting, setCloudSetting } from '../services/googleCloudStore';
import { isGoogleSheetsAuthorized } from '../services/googleSheetsService';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => Promise<void>;
  refreshThemeFromCloud: () => Promise<void>;
  isDarkMode: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getSystemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(getSystemTheme);
  const isDarkMode = theme === 'dark';

  const refreshThemeFromCloud = useCallback(async () => {
    if (!isGoogleSheetsAuthorized()) return;
    const savedTheme = await getCloudSetting<Theme>('theme', getSystemTheme());
    setTheme(savedTheme);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    if (isGoogleSheetsAuthorized()) {
      refreshThemeFromCloud().catch((error: unknown) => {
        console.error('Could not load the saved cloud theme:', error);
      });
    }
  }, [refreshThemeFromCloud]);

  const toggleTheme = useCallback(async () => {
    if (!isGoogleSheetsAuthorized()) {
      throw new Error('Connect Google in Settings before saving a theme preference.');
    }
    const nextTheme: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    try {
      await setCloudSetting('theme', nextTheme);
    } catch (error) {
      setTheme(theme);
      throw error;
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, refreshThemeFromCloud, isDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
