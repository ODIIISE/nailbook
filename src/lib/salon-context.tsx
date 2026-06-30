"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { MOCK_SALON, MOCK_SERVICES, MOCK_BOOKINGS, MOCK_ADDONS } from "@/lib/mock-data";
import type { SalonInfo, Service, Booking, Addon } from "@/lib/mock-data";
import type { WorkingHours } from "@/lib/slots";

interface SalonContextType {
  salon: SalonInfo;
  workingHours: WorkingHours;
  specificDaysOff: string[];
  services: Service[];
  addons: Addon[];
  bookings: Booking[];
  updateWorkingHours: (hours: WorkingHours) => void;
  updateSpecificDaysOff: (daysOff: string[]) => void;
  updateServices: (services: Service[]) => void;
  updateAddons: (addons: Addon[]) => void;
  addBooking: (booking: Booking) => void;
}

const SalonContext = createContext<SalonContextType | null>(null);

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function SalonProvider({ children }: { children: ReactNode }) {
  const [workingHours, setWorkingHours] = useState<WorkingHours>(MOCK_SALON.working_hours);
  const [specificDaysOff, setSpecificDaysOff] = useState<string[]>([]);
  const [services, setServices] = useState<Service[]>(MOCK_SERVICES);
  const [addons, setAddons] = useState<Addon[]>(MOCK_ADDONS);
  const [bookings, setBookings] = useState<Booking[]>(MOCK_BOOKINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setWorkingHours(loadFromStorage("nb_working_hours", MOCK_SALON.working_hours));
    setSpecificDaysOff(loadFromStorage("nb_days_off", []));
    setServices(loadFromStorage("nb_services", MOCK_SERVICES));
    setAddons(loadFromStorage("nb_addons", MOCK_ADDONS));
    setBookings(loadFromStorage("nb_bookings", MOCK_BOOKINGS));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveToStorage("nb_working_hours", workingHours);
  }, [workingHours, loaded]);

  useEffect(() => {
    if (!loaded) return;
    saveToStorage("nb_days_off", specificDaysOff);
  }, [specificDaysOff, loaded]);

  useEffect(() => {
    if (!loaded) return;
    saveToStorage("nb_services", services);
  }, [services, loaded]);

  useEffect(() => {
    if (!loaded) return;
    saveToStorage("nb_addons", addons);
  }, [addons, loaded]);

  useEffect(() => {
    if (!loaded) return;
    saveToStorage("nb_bookings", bookings);
  }, [bookings, loaded]);

  const addBooking = (booking: Booking) => {
    setBookings((prev) => [...prev, booking]);
  };

  if (!loaded) return null;

  return (
    <SalonContext.Provider
      value={{
        salon: MOCK_SALON,
        workingHours,
        specificDaysOff,
        services,
        addons,
        bookings,
        updateWorkingHours: setWorkingHours,
        updateSpecificDaysOff: setSpecificDaysOff,
        updateServices: setServices,
        updateAddons: setAddons,
        addBooking,
      }}
    >
      {children}
    </SalonContext.Provider>
  );
}

export function useSalon() {
  const ctx = useContext(SalonContext);
  if (!ctx) throw new Error("useSalon must be used within SalonProvider");
  return ctx;
}
