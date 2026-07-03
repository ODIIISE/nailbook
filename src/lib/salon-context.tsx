"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { MOCK_SALON, MOCK_SERVICES, MOCK_BOOKINGS, MOCK_ADDONS, MOCK_HIGHLIGHTS } from "@/lib/mock-data";
import type { SalonInfo, Service, Booking, Addon, Highlight, HighlightImage } from "@/lib/mock-data";
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
  fetchHighlights,
  upsertHighlight,
  deleteHighlight,
  upsertHighlightImage,
  deleteHighlightImage,
  uploadHighlightImage as uploadImage,
} from "@/lib/supabase/data";

interface SalonContextType {
  salon: SalonInfo;
  workingHours: WorkingHours;
  specificDaysOff: string[];
  services: Service[];
  addons: Addon[];
  bookings: Booking[];
  highlights: Highlight[];
  blockedTimes: Array<{ date_gregorian: string; start_time: string; end_time: string }>;
  updateWorkingHours: (hours: WorkingHours) => void;
  updateSpecificDaysOff: (daysOff: string[]) => void;
  updateServices: (services: Service[]) => void;
  updateAddons: (addons: Addon[]) => void;
  updateSalon: (updates: Partial<SalonInfo>) => Promise<void>;
  updateBlockedTimes: (blocks: Array<{ date_gregorian: string; start_time: string; end_time: string }>) => void;
  addBooking: (booking: Booking) => void;
  refreshBookings: () => Promise<void>;
  addHighlight: (highlight: Highlight) => Promise<void>;
  updateHighlight: (highlight: Highlight) => Promise<void>;
  removeHighlight: (id: string) => Promise<void>;
  addHighlightImage: (image: HighlightImage) => Promise<void>;
  removeHighlightImage: (id: string) => Promise<void>;
  uploadHighlightImage: (file: File) => Promise<string | null>;
}

const SalonContext = createContext<SalonContextType | null>(null);

export function SalonProvider({ children }: { children: ReactNode }) {
  const [salon, setSalon] = useState<SalonInfo>(MOCK_SALON);
  const [workingHours, setWorkingHours] = useState<WorkingHours>(MOCK_SALON.working_hours);
  const [specificDaysOff, setSpecificDaysOff] = useState<string[]>([]);
  const [services, setServices] = useState<Service[]>(MOCK_SERVICES);
  const [addons, setAddons] = useState<Addon[]>(MOCK_ADDONS);
  const [bookings, setBookings] = useState<Booking[]>(MOCK_BOOKINGS);
  const [highlights, setHighlights] = useState<Highlight[]>(MOCK_HIGHLIGHTS);
  const [blockedTimes, setBlockedTimes] = useState<Array<{ date_gregorian: string; start_time: string; end_time: string }>>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [salonData, servicesData, addonsData, bookingsData, hoursData, highlightsData] = await Promise.all([
          fetchSalonInfo(),
          fetchServices(),
          fetchAddons(),
          fetchBookings(),
          fetchWorkingHours(),
          fetchHighlights(),
        ]);
        if (salonData) setSalon(salonData);
        if (servicesData.length) setServices(servicesData);
        if (addonsData.length) setAddons(addonsData);
        if (bookingsData.length) setBookings(bookingsData);
        if (highlightsData.length) setHighlights(highlightsData);
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

  const handleUpdateSalon = useCallback(async (updates: Partial<SalonInfo>) => {
    setSalon((prev) => ({ ...prev, ...updates }));
    const { updateSalonInfo } = await import("@/lib/supabase/data");
    await updateSalonInfo(updates);
  }, []);

  const handleAddHighlight = useCallback(async (highlight: Highlight) => {
    setHighlights((prev) => [...prev, highlight].sort((a, b) => a.sort_order - b.sort_order));
    await upsertHighlight(highlight);
  }, []);

  const handleUpdateHighlight = useCallback(async (highlight: Highlight) => {
    setHighlights((prev) => prev.map((h) => (h.id === highlight.id ? highlight : h)));
    await upsertHighlight(highlight);
  }, []);

  const handleRemoveHighlight = useCallback(async (id: string) => {
    setHighlights((prev) => prev.filter((h) => h.id !== id));
    await deleteHighlight(id);
  }, []);

  const handleAddHighlightImage = useCallback(async (image: HighlightImage) => {
    setHighlights((prev) =>
      prev.map((h) =>
        h.id === image.highlight_id
          ? { ...h, images: [...h.images, image].sort((a, b) => a.sort_order - b.sort_order) }
          : h
      )
    );
    await upsertHighlightImage(image);
  }, []);

  const handleRemoveHighlightImage = useCallback(async (id: string) => {
    setHighlights((prev) =>
      prev.map((h) => ({
        ...h,
        images: h.images.filter((img) => img.id !== id),
      }))
    );
    await deleteHighlightImage(id);
  }, []);

  const handleUploadHighlightImage = useCallback(async (file: File) => {
    return uploadImage(file);
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
          highlights: MOCK_HIGHLIGHTS,
          blockedTimes: [],
          updateWorkingHours: async () => {},
          updateSpecificDaysOff: async () => {},
          updateServices: async () => {},
          updateAddons: async () => {},
          updateSalon: async () => {},
          updateBlockedTimes: () => {},
          addBooking: async () => {},
          refreshBookings: async () => {},
          addHighlight: async () => {},
          updateHighlight: async () => {},
          removeHighlight: async () => {},
          addHighlightImage: async () => {},
          removeHighlightImage: async () => {},
          uploadHighlightImage: async () => null,
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
        highlights,
        blockedTimes,
        updateWorkingHours: handleUpdateWorkingHours,
        updateSpecificDaysOff: handleUpdateSpecificDaysOff,
        updateServices: handleUpdateServices,
        updateAddons: handleUpdateAddons,
        updateSalon: handleUpdateSalon,
        updateBlockedTimes: setBlockedTimes,
        addBooking: handleAddBooking,
        refreshBookings,
        addHighlight: handleAddHighlight,
        updateHighlight: handleUpdateHighlight,
        removeHighlight: handleRemoveHighlight,
        addHighlightImage: handleAddHighlightImage,
        removeHighlightImage: handleRemoveHighlightImage,
        uploadHighlightImage: handleUploadHighlightImage,
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
