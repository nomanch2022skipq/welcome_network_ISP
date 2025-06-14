import React, { createContext, useContext, useState, useEffect } from 'react';

const SidebarContext = createContext();

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

export const SidebarProvider = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [hasShownShortcutTip, setHasShownShortcutTip] = useState(false);

  // Show keyboard shortcut tip once
  useEffect(() => {
    const hasSeenTip = localStorage.getItem('sidebar-shortcut-tip');
    if (!hasSeenTip && window.innerWidth >= 1024) {
      setTimeout(() => {
        setHasShownShortcutTip(true);
        localStorage.setItem('sidebar-shortcut-tip', 'true');
      }, 3000); // Show after 3 seconds
    }
  }, []);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const dismissShortcutTip = () => {
    setHasShownShortcutTip(false);
  };

  const value = {
    isSidebarCollapsed,
    toggleSidebar,
    setIsSidebarCollapsed,
    hasShownShortcutTip,
    dismissShortcutTip
  };

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
}; 