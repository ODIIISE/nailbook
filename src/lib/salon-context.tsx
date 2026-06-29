"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { MOCK_SALON, MOCK_SERVICES, MOCK_BOOKINGS } from "@/lib/mock-data";
import type { SalonInfo, Service, Booking } from "@/lib/mock-data";
import type { WorkingHours } from "@/lib/slots";

interface SalonContextType {
  salon: SalonInfo;
  workingHours: WorkingHours;
  specificDaysOff: string[];
  services: Service[];
  bookings: Booking[];
  updateWorkingHours: (hours: WorkingHours) => void;
  updateSpecificDaysOff: (daysOff: string[]) => void;
  updateServices: (services: Service[]) => void;
  addBooking: (booking: Booking) => void;
}

const SalonContext = createContext<SalonContextType | null>(null);

export function SalonProvider({ children }: { children: ReactNode }) {
  const [workingHours, setWorkingHours] = useState<WorkingHours>(
    MOCK_SALON.working_hours
  );
  const [specificDaysOff, setSpecificDaysOff] = useState<string[]>([]);
  const [services, setServices] = useState<Service[]>(MOCK_SERVICES);
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
        bookings,
        updateWorkingHours: setWorkingHours,
        updateSpecificDaysOff: setSpecificDaysOff,
        updateServices: setServices,
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
