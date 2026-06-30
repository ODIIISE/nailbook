"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { MOCK_SALON, MOCK_SERVICES, MOCK_BOOKINGS, MOCK_ADDONS } from "@/lib/mock-data";
import type { SalonInfo, Service, Booking, Addon } from "@/lib/mock-data";
import type { WorkingHours } from "@/lib/slots";
import {
  fetchSalonInfo,
  fetchServices,
  fetchAddons,
  fetchBookings,
  upsertService,
  deleteService,
  upsertAddon,
  deleteAddon,
  insertBooking,
  updateWorkingHours as saveWorkingHours,
  fetchWorkingHours,
} from "@/lib/supabase/data";

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
  refreshBookings: () => Promise<void>;
}

const SalonContext = createContext<SalonContextType | null>(null);

export function SalonProvider({ children }: { children: ReactNode }) {
  const [salon, setSalon] = useState<SalonInfo>(MOCK_SALON);
  const [workingHours, setWorkingHours] = useState<WorkingHours>(MOCK_SALON.working_hours);
  const [specificDaysOff, setSpecificDaysOff] = useState<string[]>([]);
  const [services, setServices] = useState<Service[]>(MOCK_SERVICES);
  const [addons, setAddons] = useState<Addon[]>(MOCK_ADDONS);
  const [bookings, setBookings] = useState<Booking[]>(MOCK_BOOKINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [salonData, servicesData, addonsData, bookingsData, hoursData] = await Promise.all([
          fetchSalonInfo(),
          fetchServices(),
          fetchAddons(),
          fetchBookings(),
          fetchWorkingHours(),
        ]);
        if (salonData) setSalon(salonData);
        if (servicesData.length) setServices(servicesData);
        if (addonsData.length) setAddons(addonsData);
        if (bookingsData.length) setBookings(bookingsData);
        if (hoursData) {
          setWorkingHours(hoursData.working_hours);
          setSpecificDaysOff(hoursData.specific_days_off || []);
        }
      } catch {}
      setLoaded(true);
    }
    load();
  }, []);

  const handleUpdateWorkingHours = useCallback(async (hours: WorkingHours) => {
    setWorkingHours(hours);
    await saveWorkingHours(hours, specificDaysOff);
  }, [specificDaysOff]);

  const handleUpdateSpecificDaysOff = useCallback(async (daysOff: string[]) => {
    setSpecificDaysOff(daysOff);
    await saveWorkingHours(workingHours, daysOff);
  }, [workingHours]);

  const handleUpdateServices = useCallback(async (newServices: Service[]) => {
    setServices(newServices);
    for (const s of newServices) {
      await upsertService(s);
    }
  }, []);

  const handleUpdateAddons = useCallback(async (newAddons: Addon[]) => {
    setAddons(newAddons);
    for (const a of newAddons) {
      await upsertAddon(a);
    }
  }, []);

  const handleAddBooking = useCallback(async (booking: Booking) => {
    setBookings((prev) => [...prev, booking]);
    await insertBooking(booking);
  }, []);

  const refreshBookings = useCallback(async () => {
    const data = await fetchBookings();
    if (data.length) setBookings(data);
  }, []);

  if (!loaded) {
    return (
      <SalonContext.Provider
        value={{
          salon: MOCK_SALON,
          workingHours: MOCK_SALON.working_hours,
          specificDaysOff: [],
          services: MOCK_SERVICES,
          addons: MOCK_ADDONS,
          bookings: MOCK_BOOKINGS,
          updateWorkingHours: async () => {},
          updateSpecificDaysOff: async () => {},
          updateServices: async () => {},
          updateAddons: async () => {},
          addBooking: async () => {},
          refreshBookings: async () => {},
        }}
      >
        {children}
      </SalonContext.Provider>
    );
  }

  return (
    <SalonContext.Provider
      value={{
        salon,
        workingHours,
        specificDaysOff,
        services,
        addons,
        bookings,
        updateWorkingHours: handleUpdateWorkingHours,
        updateSpecificDaysOff: handleUpdateSpecificDaysOff,
        updateServices: handleUpdateServices,
        updateAddons: handleUpdateAddons,
        addBooking: handleAddBooking,
        refreshBookings,
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
