"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
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

export function SalonProvider({ children }: { children: ReactNode }) {
  const [workingHours, setWorkingHours] = useState<WorkingHours>(
    MOCK_SALON.working_hours
  );
  const [specificDaysOff, setSpecificDaysOff] = useState<string[]>([]);
  const [services, setServices] = useState<Service[]>(MOCK_SERVICES);
  const [addons, setAddons] = useState<Addon[]>(MOCK_ADDONS);
  const [bookings, setBookings] = useState<Booking[]>(MOCK_BOOKINGS);

  const addBooking = (booking: Booking) => {
    setBookings((prev) => [...prev, booking]);
  };

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
