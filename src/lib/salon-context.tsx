"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from "react";
import { MOCK_SALON } from "@/lib/mock-data";
import type { SalonInfo, Service, Booking, Addon, Highlight, HighlightImage } from "@/lib/mock-data";
import type { WorkingHours } from "@/lib/slots";
import {
  fetchSalonInfo,
  fetchServices,
  fetchAddons,
  fetchBookings,
  saveServices,
  saveAddons,
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
  updateWorkingHours: (hours: WorkingHours) => Promise<void>;
  updateSpecificDaysOff: (daysOff: string[]) => Promise<void>;
  saveSchedule: (hours: WorkingHours, daysOff: string[]) => Promise<void>;
  updateServices: (services: Service[]) => Promise<string | null>;
  updateAddons: (addons: Addon[]) => Promise<string | null>;
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
  const [services, setServices] = useState<Service[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<Array<{ date_gregorian: string; start_time: string; end_time: string }>>([]);
  const [loaded, setLoaded] = useState(false);

  // Refs to avoid stale closures in callbacks
  const workingHoursRef = useRef(workingHours);
  const specificDaysOffRef = useRef(specificDaysOff);
  workingHoursRef.current = workingHours;
  specificDaysOffRef.current = specificDaysOff;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [salonData, servicesData, addonsData, bookingsData, hoursData, highlightsData, blockedData] = await Promise.all([
          fetchSalonInfo(),
          fetchServices(),
          fetchAddons(),
          fetchBookings(),
          fetchWorkingHours(),
          fetchHighlights(),
          fetch("/api/owner/blocked-times").then((r) => r.json()).catch(() => ({ blockedTimes: [] })),
        ]);
        if (cancelled) return;
        if (salonData) setSalon(salonData);
        if (servicesData.length) setServices(servicesData);
        if (addonsData.length) setAddons(addonsData);
        if (bookingsData.length) setBookings(bookingsData);
        if (highlightsData.length) setHighlights(highlightsData);
        if (hoursData) {
          setWorkingHours(hoursData.working_hours);
          setSpecificDaysOff(hoursData.specific_days_off || []);
        }
        if (blockedData.blockedTimes?.length) {
          setBlockedTimes(blockedData.blockedTimes);
        }
      } catch (e) {
        if (!cancelled) console.error("Failed to load salon data:", e);
      }
      if (!cancelled) setLoaded(true);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const handleUpdateWorkingHours = useCallback(async (hours: WorkingHours) => {
    const prev = workingHoursRef.current;
    setWorkingHours(hours);
    try {
      await saveWorkingHours(hours, specificDaysOffRef.current);
    } catch (e) {
      console.error("Failed to save working hours:", e);
      setWorkingHours(prev);
    }
  }, []);

  const handleUpdateSpecificDaysOff = useCallback(async (daysOff: string[]) => {
    const prev = specificDaysOffRef.current;
    setSpecificDaysOff(daysOff);
    try {
      await saveWorkingHours(workingHoursRef.current, daysOff);
    } catch (e) {
      console.error("Failed to save days off:", e);
      setSpecificDaysOff(prev);
    }
  }, []);

  const handleSaveSchedule = useCallback(async (hours: WorkingHours, daysOff: string[]) => {
    const prevHours = workingHoursRef.current;
    const prevDaysOff = specificDaysOffRef.current;
    setWorkingHours(hours);
    setSpecificDaysOff(daysOff);
    try {
      await saveWorkingHours(hours, daysOff);
    } catch (e) {
      console.error("Failed to save schedule:", e);
      setWorkingHours(prevHours);
      setSpecificDaysOff(prevDaysOff);
    }
  }, []);

  const handleUpdateServices = useCallback(async (newServices: Service[]): Promise<string | null> => {
    const prev = services;
    setServices(newServices);
    try {
      await saveServices(newServices);
      return null;
    } catch (e) {
      console.error("Failed to save services:", e);
      setServices(prev);
      return e instanceof Error ? e.message : "خطای ناشناخته";
    }
  }, [services]);

  const handleUpdateAddons = useCallback(async (newAddons: Addon[]): Promise<string | null> => {
    const prev = addons;
    console.log("[salon-context] Saving", newAddons.length, "addons");
    setAddons(newAddons);
    try {
      await saveAddons(newAddons);
      console.log("[salon-context] Addons saved successfully");
      return null;
    } catch (e) {
      console.error("[salon-context] Failed to save addons:", e);
      setAddons(prev);
      return e instanceof Error ? e.message : "خطای ناشناخته";
    }
  }, [addons]);

  const handleUpdateBlockedTimes = useCallback(async (blocks: Array<{ date_gregorian: string; start_time: string; end_time: string }>) => {
    const prev = blockedTimes;
    setBlockedTimes(blocks);
    try {
      const res = await fetch("/api/owner/blocked-times", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockedTimes: blocks }),
      });
      if (!res.ok) {
        console.error("Failed to save blocked times");
        setBlockedTimes(prev);
      }
    } catch (e) {
      console.error("Failed to save blocked times:", e);
      setBlockedTimes(prev);
    }
  }, [blockedTimes]);

  const handleAddBooking = useCallback(async (booking: Booking) => {
    setBookings((prev) => [...prev, booking]);
    try {
      await insertBooking(booking);
    } catch (e) {
      console.error("Failed to save booking:", e);
      setBookings((prev) => prev.filter((b) => b.id !== booking.id));
    }
  }, []);

  const refreshBookings = useCallback(async () => {
    const data = await fetchBookings();
    if (data.length) setBookings(data);
  }, []);

  const handleUpdateSalon = useCallback(async (updates: Partial<SalonInfo>) => {
    const prev = salon;
    setSalon((prev) => ({ ...prev, ...updates }));
    try {
      const res = await fetch("/api/update-salon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        console.error("Failed to update salon");
        setSalon(prev);
      }
    } catch (e) {
      console.error("Failed to update salon:", e);
      setSalon(prev);
    }
  }, [salon]);

  const handleAddHighlight = useCallback(async (highlight: Highlight) => {
    const prev = highlights;
    setHighlights((prev) => [...prev, highlight].sort((a, b) => a.sort_order - b.sort_order));
    try {
      await upsertHighlight(highlight);
    } catch (e) {
      console.error("Failed to add highlight:", e);
      setHighlights(prev);
    }
  }, [highlights]);

  const handleUpdateHighlight = useCallback(async (highlight: Highlight) => {
    const prev = highlights;
    setHighlights((prev) => prev.map((h) => (h.id === highlight.id ? highlight : h)));
    try {
      await upsertHighlight(highlight);
    } catch (e) {
      console.error("Failed to update highlight:", e);
      setHighlights(prev);
    }
  }, [highlights]);

  const handleRemoveHighlight = useCallback(async (id: string) => {
    const prev = highlights;
    setHighlights((prev) => prev.filter((h) => h.id !== id));
    try {
      await deleteHighlight(id);
    } catch (e) {
      console.error("Failed to remove highlight:", e);
      setHighlights(prev);
    }
  }, [highlights]);

  const handleAddHighlightImage = useCallback(async (image: HighlightImage) => {
    const prev = highlights;
    setHighlights((prev) =>
      prev.map((h) =>
        h.id === image.highlight_id
          ? { ...h, images: [...h.images, image].sort((a, b) => a.sort_order - b.sort_order) }
          : h
      )
    );
    try {
      await upsertHighlightImage(image);
    } catch (e) {
      console.error("Failed to add highlight image:", e);
      setHighlights(prev);
    }
  }, [highlights]);

  const handleRemoveHighlightImage = useCallback(async (id: string) => {
    const prev = highlights;
    setHighlights((prev) =>
      prev.map((h) => ({
        ...h,
        images: h.images.filter((img) => img.id !== id),
      }))
    );
    try {
      await deleteHighlightImage(id);
    } catch (e) {
      console.error("Failed to remove highlight image:", e);
      setHighlights(prev);
    }
  }, []);

  const handleUploadHighlightImage = useCallback(async (file: File) => {
    return uploadImage(file);
  }, []);

  const value = useMemo<SalonContextType>(() => {
    if (!loaded) {
      return {
        salon: MOCK_SALON,
        workingHours: MOCK_SALON.working_hours,
        specificDaysOff: [],
        services: [],
        addons: [],
        bookings: [],
        highlights: [],
        blockedTimes: [],
        updateWorkingHours: async () => {},
        updateSpecificDaysOff: async () => {},
        saveSchedule: async () => {},
        updateServices: async () => null,
        updateAddons: async () => null,
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
      };
    }
    return {
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
        saveSchedule: handleSaveSchedule,
      updateServices: handleUpdateServices,
      updateAddons: handleUpdateAddons,
      updateSalon: handleUpdateSalon,
        updateBlockedTimes: handleUpdateBlockedTimes,
      addBooking: handleAddBooking,
      refreshBookings,
      addHighlight: handleAddHighlight,
      updateHighlight: handleUpdateHighlight,
      removeHighlight: handleRemoveHighlight,
      addHighlightImage: handleAddHighlightImage,
      removeHighlightImage: handleRemoveHighlightImage,
      uploadHighlightImage: handleUploadHighlightImage,
    };
  }, [
    loaded, salon, workingHours, specificDaysOff, services, addons, bookings, highlights, blockedTimes,
    handleUpdateWorkingHours, handleUpdateSpecificDaysOff, handleSaveSchedule, handleUpdateServices, handleUpdateAddons,
    handleUpdateSalon, handleUpdateBlockedTimes, handleAddBooking, refreshBookings, handleAddHighlight, handleUpdateHighlight,
    handleRemoveHighlight, handleAddHighlightImage, handleRemoveHighlightImage, handleUploadHighlightImage,
  ]);

  return (
    <SalonContext.Provider value={value}>
      {children}
    </SalonContext.Provider>
  );
}

export function useSalon() {
  const ctx = useContext(SalonContext);
  if (!ctx) throw new Error("useSalon must be used within SalonProvider");
  return ctx;
}
