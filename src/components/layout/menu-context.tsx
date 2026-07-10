"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface MenuContextType {
  open: boolean;
  openMenu: () => void;
  closeMenu: () => void;
}

const MenuContext = createContext<MenuContextType>({
  open: false,
  openMenu: () => {},
  closeMenu: () => {},
});

export function MenuProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openMenu = useCallback(() => setOpen(true), []);
  const closeMenu = useCallback(() => setOpen(false), []);

  return (
    <MenuContext.Provider value={{ open, openMenu, closeMenu }}>
      {children}
    </MenuContext.Provider>
  );
}

export function useMenu() {
  return useContext(MenuContext);
}
