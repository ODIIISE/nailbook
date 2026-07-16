"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from "react";
import type { SalonInfo, Service, Booking, Addon, Highlight, HighlightImage } from "@/lib/types";
import type { WorkingHours } from "@/lib/slots";
import { toast } from "sonner";
import {
  fetchSalonInfo,
  fetchServices,
  fetchAddons,
  fetchBookings,
  saveServices,
  saveAddons,
  insertBooking,
  cancelBooking as cancelBookingApi,
  updateWorkingHours as saveWorkingHours,
  fetchWorkingHours,
  fetchHighlights,
  upsertHighlight,
  deleteHighlight,
  upsertHighlightImage,
  deleteHighlightImage,
  uploadHighlightImage as uploadImage,
} from "@/lib/db/data";

interface SalonContextType {
  salon: SalonInfo;
  workingHours: WorkingHours;
  specificDaysOff: string[];
  services: Service[];
  addons: Addon[];
  bookings: Booking[];
  highlights: Highlight[];
  blockedTimes: Array<{ date_gregorian: string; start_time: string; end_time: string }>;
  loaded: boolean;
  updateWorkingHours: (hours: WorkingHours) => Promise<void>;
  updateSpecificDaysOff: (daysOff: string[]) => Promise<void>;
  saveSchedule: (hours: WorkingHours, daysOff: string[]) => Promise<void>;
  updateServices: (services: Service[]) => Promise<string | null>;
  updateAddons: (addons: Addon[]) => Promise<string | null>;
  updateSalon: (updates: Partial<SalonInfo>) => Promise<void>;
  updateBlockedTimes: (blocks: Array<{ date_gregorian: string; start_time: string; end_time: string }>) => void;
  addBooking: (booking: Booking) => Promise<{ success: boolean; error?: string; id?: string; start_time?: string; end_time?: string }>;
  cancelBooking: (bookingId: string) => Promise<boolean>;
  refreshBookings: () => Promise<void>;
  refreshSalonData: () => Promise<void>;
  addHighlight: (highlight: Highlight) => Promise<void>;
  updateHighlight: (highlight: Highlight) => Promise<void>;
  removeHighlight: (id: string) => Promise<void>;
  addHighlightImage: (image: HighlightImage) => Promise<void>;
  removeHighlightImage: (id: string) => Promise<void>;
  uploadHighlightImage: (file: File) => Promise<string | null>;
  toggleBookingPaid: (bookingId: string, paid: boolean) => Promise<void>;
  updateBookingStatus: (bookingId: string, status: string) => Promise<void>;
}

const SalonContext = createContext<SalonContextType | null>(null);

const DEFAULT_WORKING_HOURS: WorkingHours = {
  sat: { open: "10:00", close: "16:00" },
  sun: { open: "10:00", close: "16:00" },
  mon: { open: "10:00", close: "16:00" },
  tue: { open: "10:00", close: "16:00" },
  wed: { open: "10:00", close: "16:00" },
  thu: { open: "10:00", close: "16:00" },
  fri: null,
};

export function SalonProvider({ children }: { children: ReactNode }) {
  const [salon, setSalon] = useState<SalonInfo | null>(null);
  const [workingHours, setWorkingHours] = useState<WorkingHours>(DEFAULT_WORKING_HOURS);
  const [specificDaysOff, setSpecificDaysOff] = useState<string[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<Array<{ date_gregorian: string; start_time: string; end_time: string }>>([]);
  const [loaded, setLoaded] = useState(false);

  // Refs to avoid stale closures in callbacks
  const servicesRef = useRef(services);
  const addonsRef = useRef(addons);
  const salonRef = useRef(salon);
  const highlightsRef = useRef(highlights);
  const workingHoursRef = useRef(workingHours);
  const specificDaysOffRef = useRef(specificDaysOff);
  servicesRef.current = services;
  addonsRef.current = addons;
  salonRef.current = salon;
  highlightsRef.current = highlights;
  workingHoursRef.current = workingHours;
  specificDaysOffRef.current = specificDaysOff;

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const signal = controller.signal;
        const [salonData, servicesData, addonsData, bookingsData, hoursData, highlightsData, blockedData] = await Promise.all([
          fetchSalonInfo(),
          fetchServices(),
          fetchAddons(),
          fetchBookings(),
          fetchWorkingHours(),
          fetchHighlights(),
          fetch("/api/owner/blocked-times", { signal }).then((r) => r.json()).catch(() => ({ blockedTimes: [] })),
        ]);
        if (signal.aborted) return;
        if (salonData) setSalon(salonData);
        if (servicesData.length) setServices(servicesData);
        if (addonsData.length) setAddons(addonsData);
        setBookings(bookingsData);
        if (highlightsData.length) setHighlights(highlightsData);
        if (hoursData) {
          setWorkingHours(hoursData.working_hours);
          setSpecificDaysOff(hoursData.specific_days_off || []);
        }
        if (blockedData.blockedTimes?.length) {
          setBlockedTimes(blockedData.blockedTimes);
        }
      } catch (e) {
        if (!controller.signal.aborted) {
          console.error("Failed to load salon data:", e);
          toast.error("خطا در بارگذاری اطلاعات", {
            description: "لطفاً صفحه را رفرش کنید",
            duration: 5000,
          });
        }
      }
      if (!controller.signal.aborted) setLoaded(true);
    }
    load();
    return () => controller.abort();
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
    const prev = servicesRef.current;
    setServices(newServices);
    try {
      await saveServices(newServices);
      return null;
    } catch (e) {
      console.error("Failed to save services:", e);
      setServices(prev);
      return e instanceof Error ? e.message : "خطای ناشناخته";
    }
  }, []);

  const handleUpdateAddons = useCallback(async (newAddons: Addon[]): Promise<string | null> => {
    const prev = addonsRef.current;
    setAddons(newAddons);
    try {
      await saveAddons(newAddons);
      return null;
    } catch (e) {
      console.error("Failed to save addons:", e);
      setAddons(prev);
      return e instanceof Error ? e.message : "خطای ناشناخته";
    }
  }, []);

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

  const handleAddBooking = useCallback(async (booking: Booking): Promise<{ success: boolean; error?: string; id?: string; start_time?: string; end_time?: string }> => {
    setBookings((prev) => [...prev, booking]);
    try {
      const result = await insertBooking(booking);
      // Update local state with server-generated ID and normalized times
      setBookings((prev) => prev.map((b) =>
        b.id === booking.id ? { ...b, id: result.id, start_time: result.start_time, end_time: result.end_time } : b
      ));
      return { success: true, id: result.id, start_time: result.start_time, end_time: result.end_time };
    } catch (e) {
      console.error("Failed to save booking:", e);
      setBookings((prev) => prev.filter((b) => b.id !== booking.id));
      const message = e instanceof Error ? e.message : "خطای ناشناخته";
      return { success: false, error: message };
    }
  }, []);

  const handleCancelBooking = useCallback(async (bookingId: string): Promise<boolean> => {
    setBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b, status: "cancelled" } : b));
    try {
      await cancelBookingApi(bookingId);
      return true;
    } catch (e) {
      console.error("Failed to cancel booking:", e);
      setBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b, status: "confirmed" } : b));
      return false;
    }
  }, []);

  const refreshBookings = useCallback(async () => {
    const data = await fetchBookings();
    setBookings(data);
  }, []);

  const refreshSalonData = useCallback(async () => {
    try {
      const [salonData, hoursData] = await Promise.all([
        fetchSalonInfo(),
        fetchWorkingHours(),
      ]);
      if (salonData) setSalon(salonData);
      if (hoursData) {
        setWorkingHours(hoursData.working_hours);
        setSpecificDaysOff(hoursData.specific_days_off || []);
      }
    } catch (e) {
      console.error("Failed to refresh salon data:", e);
    }
  }, []);

  const handleUpdateSalon = useCallback(async (updates: Partial<SalonInfo>) => {
    const prev = salonRef.current;
    setSalon((prev) => prev ? { ...prev, ...updates } : prev);
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
  }, []);

  const handleAddHighlight = useCallback(async (highlight: Highlight) => {
    const prev = highlightsRef.current;
    setHighlights((prev) => [...prev, highlight].sort((a, b) => a.sort_order - b.sort_order));
    try {
      await upsertHighlight(highlight);
    } catch (e) {
      console.error("Failed to add highlight:", e);
      setHighlights(prev);
    }
  }, []);

  const handleUpdateHighlight = useCallback(async (highlight: Highlight) => {
    const prev = highlightsRef.current;
    setHighlights((prev) => prev.map((h) => (h.id === highlight.id ? highlight : h)));
    try {
      await upsertHighlight(highlight);
    } catch (e) {
      console.error("Failed to update highlight:", e);
      setHighlights(prev);
    }
  }, []);

  const handleRemoveHighlight = useCallback(async (id: string) => {
    const prev = highlightsRef.current;
    setHighlights((prev) => prev.filter((h) => h.id !== id));
    try {
      await deleteHighlight(id);
    } catch (e) {
      console.error("Failed to remove highlight:", e);
      setHighlights(prev);
    }
  }, []);

  const handleAddHighlightImage = useCallback(async (image: HighlightImage) => {
    const prev = highlightsRef.current;
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
  }, []);

  const handleRemoveHighlightImage = useCallback(async (id: string) => {
    const prev = highlightsRef.current;
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

  const handleToggleBookingPaid = useCallback(async (bookingId: string, paid: boolean) => {
    setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, paid } : b)));
    try {
      const res = await fetch("/api/owner/bookings/paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, paid }),
      });
      if (!res.ok) {
        setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, paid: !paid } : b)));
      }
    } catch {
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, paid: !paid } : b)));
    }
  }, []);

  const handleUpdateBookingStatus = useCallback(async (bookingId: string, status: string) => {
    const prev = bookings.find((b) => b.id === bookingId)?.status;
    setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status: status as Booking["status"] } : b)));
    try {
      const res = await fetch("/api/owner/bookings/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, status }),
      });
      if (!res.ok && prev) {
        setBookings((prev2) => prev2.map((b) => (b.id === bookingId ? { ...b, status: prev } : b)));
      }
    } catch {
      if (prev) {
        setBookings((prev2) => prev2.map((b) => (b.id === bookingId ? { ...b, status: prev } : b)));
      }
    }
  }, [bookings]);

  const value = useMemo<SalonContextType>(() => {
    if (!loaded || !salon) {
      return {
        salon: { id: "", name: "", description: "", slogan: "", phone: "", address: "", hero_image_url: null, logo_url: null, working_hours_text: "", working_hours: DEFAULT_WORKING_HOURS, slot_buffer_minutes: 15, slot_interval_minutes: 15, early_extra_hours: 0, late_extra_hours: 0, expand_threshold: 80, proximity_window_hours: 2, allow_overflow: false, overflow_minutes: 0 },
        workingHours: DEFAULT_WORKING_HOURS,
        specificDaysOff: [],
        services: [],
        addons: [],
        bookings: [],
        highlights: [],
        blockedTimes: [],
        loaded: false,
        updateWorkingHours: async () => {},
        updateSpecificDaysOff: async () => {},
        saveSchedule: async () => {},
        updateServices: async () => null,
        updateAddons: async () => null,
        updateSalon: async () => {},
        updateBlockedTimes: () => {},
        addBooking: async () => ({ success: false }),
        cancelBooking: async () => false,
        refreshBookings: async () => {},
        refreshSalonData: async () => {},
        addHighlight: async () => {},
        updateHighlight: async () => {},
        removeHighlight: async () => {},
        addHighlightImage: async () => {},
        removeHighlightImage: async () => {},
        uploadHighlightImage: async () => null,
        toggleBookingPaid: async () => {},
        updateBookingStatus: async () => {},
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
      loaded: true,
        updateWorkingHours: handleUpdateWorkingHours,
        updateSpecificDaysOff: handleUpdateSpecificDaysOff,
        saveSchedule: handleSaveSchedule,
      updateServices: handleUpdateServices,
      updateAddons: handleUpdateAddons,
      updateSalon: handleUpdateSalon,
        updateBlockedTimes: handleUpdateBlockedTimes,
      addBooking: handleAddBooking,
      cancelBooking: handleCancelBooking,
      refreshBookings,
      refreshSalonData,
      addHighlight: handleAddHighlight,
      updateHighlight: handleUpdateHighlight,
      removeHighlight: handleRemoveHighlight,
      addHighlightImage: handleAddHighlightImage,
      removeHighlightImage: handleRemoveHighlightImage,
      uploadHighlightImage: handleUploadHighlightImage,
      toggleBookingPaid: handleToggleBookingPaid,
      updateBookingStatus: handleUpdateBookingStatus,
    };
  }, [
    loaded, salon, workingHours, specificDaysOff, services, addons, bookings, highlights, blockedTimes,
    handleUpdateWorkingHours, handleUpdateSpecificDaysOff, handleSaveSchedule, handleUpdateServices, handleUpdateAddons,
    handleUpdateSalon, handleUpdateBlockedTimes, handleAddBooking, handleCancelBooking, refreshBookings, refreshSalonData, handleAddHighlight, handleUpdateHighlight,
    handleRemoveHighlight, handleAddHighlightImage, handleRemoveHighlightImage, handleUploadHighlightImage, handleToggleBookingPaid, handleUpdateBookingStatus,
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
