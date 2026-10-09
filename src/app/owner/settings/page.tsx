"use client";

import { useState, useRef } from "react";
import { ImageCrop } from "@/components/ui/image-crop";
import { SalonGuard } from "@/components/ui/salon-guard";
import { useSalon } from "@/lib/salon-context";
import { toast } from "sonner";
import Image from "next/image";
import { Save, Camera, Phone, FileText, Sparkles, Video } from "lucide-react";

export default function OwnerSettingsPage() {
  const { salon, updateSalon } = useSalon();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(salon.name);
  const [slogan, setSlogan] = useState(salon.slogan || "");
  const [description, setDescription] = useState(salon.description);
  const [phone, setPhone] = useState(salon.phone);
  const [address, setAddress] = useState(salon.address);
  const [city, setCity] = useState(salon.city || "");
  const [instagramHandle, setInstagramHandle] = useState(salon.instagram_handle || "");
  const [workingHoursText, setWorkingHoursText] = useState(salon.working_hours_text);
  const [avatarUrl, setAvatarUrl] = useState(salon.logo_url || "");
      const [splashLogoUrl, setSplashLogoUrl] = useState(salon.splash_logo_url || "");
  const [portraitUrl, setPortraitUrl] = useState(salon.portrait_image_url || "");
  const [heroUrl, setHeroUrl] = useState(salon.hero_image_url || "");
  // Homepage gallery (3 owner slots; slot 1 is the hero poster, null keeps position)
  const [galleryUrls, setGalleryUrls] = useState<Array<string | null>>(
    salon.home_gallery_urls ?? [null, null, null],
  );
  const [galleryUploading, setGalleryUploading] = useState<number | null>(null);
  const [galleryCrop, setGalleryCrop] = useState<{ index: number; src: string } | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [portraitUploading, setPortraitUploading] = useState(false);
  const [heroUploading, setHeroUploading] = useState(false);
  // Homepage background video (null → the bundled /media/forehand-hero.mp4)
  const [heroVideoUrl, setHeroVideoUrl] = useState(salon.hero_video_url || "");
  const [heroVideoUploading, setHeroVideoUploading] = useState(false);
  const heroVideoInputRef = useRef<HTMLInputElement>(null);
  const [splashUploading, setSplashUploading] = useState(false);
  const [splashCropImage, setSplashCropImage] = useState<string | null>(null);
  const splashFileInputRef = useRef<HTMLInputElement>(null);
  const portraitFileInputRef = useRef<HTMLInputElement>(null);
  const heroFileInputRef = useRef<HTMLInputElement>(null);
  // ── Customer-facing text (brand copy shown to customers) ──
  const [homepageKicker, setHomepageKicker] = useState(salon.homepage_kicker || "NAIL · CARE · RITUAL");
  const [homepageCtaLabel, setHomepageCtaLabel] = useState(salon.homepage_cta_label || "شروع رزرو");
  const [homepageMicro, setHomepageMicro] = useState(salon.homepage_micro || "بدون تماس تلفنی · زمان‌های آزاد همین‌جا");
  const [lookbookTitle, setLookbookTitle] = useState(salon.lookbook_title || "نمونه‌کارها");
  const [bookingSuccessTitle, setBookingSuccessTitle] = useState(salon.booking_success_title || "به‌زودی می‌بینیمت!");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);


  // Crop state
  const [cropImage, setCropImage] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم فایل بیشتر از ۵ مگابایت است");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropImage(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCropComplete = async (blob: Blob) => {
    setCropImage(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", blob, "logo.jpg");
      const res = await fetch("/api/upload-logo", { method: "POST", body: formData });
      if (!res.ok) throw new Error("upload");
      const data = await res.json();
      if (!data.url) throw new Error("upload");
      await updateSalon({ logo_url: data.url });
      setAvatarUrl(data.url);
    } catch {
      toast.error("خطا در آپلود تصویر");
    }
    setUploading(false);
  };

  const handlePortraitFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم فایل بیشتر از ۵ مگابایت است");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPortraitCropImage(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const [portraitCropImage, setPortraitCropImage] = useState<string | null>(null);
  const handlePortraitCropComplete = async (blob: Blob) => {
    setPortraitCropImage(null);
    setPortraitUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", blob, "portrait.jpg");
      const res = await fetch("/api/upload-logo", { method: "POST", body: formData });
      if (!res.ok) throw new Error("upload");
      const data = await res.json();
      if (!data.url) throw new Error("upload");
      await updateSalon({ portrait_image_url: data.url });
      setPortraitUrl(data.url);
    } catch {
      toast.error("خطا در آپلود تصویر");
    } finally {
      setPortraitUploading(false);
    }
  };

  // ─── Splash logo upload (separate from primary salon logo) ───
  const handleSplashFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم فایل بیشتر از ۵ مگابایت است");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setSplashCropImage(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSplashCropComplete = async (blob: Blob) => {
    setSplashCropImage(null);
    setSplashUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", blob, "splash-logo.jpg");
      const res = await fetch("/api/upload-logo", { method: "POST", body: formData });
      if (!res.ok) throw new Error("upload");
      const data = await res.json();
      if (!data.url) throw new Error("upload");
      // Persist first. If the settings update fails, do not show an image in
      // the local preview that the customer page cannot actually load later.
      await updateSalon({ splash_logo_url: data.url });
      setSplashLogoUrl(data.url);
    } catch {
      toast.error("خطا در آپلود تصویر");
    }
    setSplashUploading(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("نام سالن نمی‌تواند خالی باشد");
      return;
    }
    if (homepageCtaLabel.trim().length < 2) {
      toast.error("متن دکمه رزرو را وارد کنید");
      return;
    }
    setSaving(true);
    try {
      await updateSalon({
        name: name.trim(), slogan, description, phone: phone.trim(), address, city,
        instagram_handle: instagramHandle.replace(/^@/, "").trim(),
        working_hours_text: workingHoursText,
        homepage_kicker: homepageKicker.trim() || "NAIL · CARE · RITUAL",
        homepage_cta_label: homepageCtaLabel.trim() || "شروع رزرو",
        homepage_micro: homepageMicro.trim() || "بدون تماس تلفنی · زمان‌های آزاد همین‌جا",
        lookbook_title: lookbookTitle.trim() || "نمونه‌کارها",
        booking_success_title: bookingSuccessTitle.trim() || "به‌زودی می‌بینیمت!",
      });
    } catch {
      toast.error("خطا در ذخیره تغییرات");
    }
    setSaving(false);
  };

  // ─── Hero background image (full-bleed cover behind the homepage profile) ───
  const handleHeroFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم فایل بیشتر از ۵ مگابایت است");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setHeroCropImage(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const [heroCropImage, setHeroCropImage] = useState<string | null>(null);
  const handleHeroCropComplete = async (blob: Blob) => {
    setHeroCropImage(null);
    setHeroUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", blob, "hero.jpg");
      const res = await fetch("/api/upload-logo", { method: "POST", body: formData });
      if (!res.ok) throw new Error("upload");
      const data = await res.json();
      if (!data.url) throw new Error("upload");
      await updateSalon({ hero_image_url: data.url });
      setHeroUrl(data.url);
    } catch {
      toast.error("خطا در آپلود تصویر");
    } finally {
      setHeroUploading(false);
    }
  };

  // ─── Homepage background video ───
  const handleHeroVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setHeroVideoUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file, file.name);
      const res = await fetch("/api/upload-hero-video", { method: "POST", body: formData });
      if (!res.ok) throw new Error("upload");
      const data = await res.json();
      if (!data.url) throw new Error("upload");
      await updateSalon({ hero_video_url: data.url });
      setHeroVideoUrl(data.url);
      toast.success("ویدیوی پس‌زمینه ذخیره شد");
    } catch {
      toast.error("خطا در آپلود ویدیو");
    } finally {
      setHeroVideoUploading(false);
    }
  };

  // ─── Homepage gallery (3 customer-facing slots) ───
  const handleGalleryFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const index = Number(galleryInputRef.current?.dataset.index ?? "-1");
    const file = e.target.files?.[0];
    if (index < 0 || !file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم فایل بیشتر از ۵ مگابایت است");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setGalleryCrop({ index, src: reader.result as string });
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleGalleryCropComplete = async (blob: Blob) => {
    const index = galleryCrop?.index ?? -1;
    setGalleryCrop(null);
    if (index < 0) return;
    setGalleryUploading(index);
    try {
      const formData = new FormData();
      formData.append("file", blob, `home-gallery-${index + 1}.jpg`);
      const res = await fetch("/api/upload-logo", { method: "POST", body: formData });
      if (!res.ok) throw new Error("upload");
      const data = await res.json();
      if (!data.url) throw new Error("upload");
      const next = [...galleryUrls];
      next[index] = data.url;
      await updateSalon({ home_gallery_urls: next });
      setGalleryUrls(next);
      toast.success(`تصویر ${index + 1} ذخیره شد`);
    } catch {
      toast.error("خطا در آپلود تصویر");
    } finally {
      setGalleryUploading(null);
    }
  };

  const handleGalleryRemove = async (index: number) => {
    const next = [...galleryUrls];
    next[index] = null;
    await updateSalon({ home_gallery_urls: next });
    setGalleryUrls(next);
    toast.success(`تصویر ${index + 1} حذف شد`);
  };

  return (
    <SalonGuard>
    <div className="page-gutter pb-8 pt-2" style={{ display: "grid", gap: 18 }}>
      <h2 className="h-m">تنظیمات سالن</h2>
      <section className="panel">
        <div className="row" style={{ gap: 16 }}>
          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={salon.name}
                width={80}
                height={80}
                unoptimized
                style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover" }}
              />
            ) : (
              <span className="nail" style={{ width: 80, height: 80, borderRadius: "50%" }}>
                <Sparkles size={30} strokeWidth={1.2} aria-hidden="true" style={{ color: "var(--faint)" }} />
              </span>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              aria-label="تغییر لوگو"
              className="iconbtn"
              style={{ position: "absolute", bottom: -4, insetInlineEnd: -4, background: "var(--pearl)", color: "#1b1511" }}
            >
              <Camera size={16} strokeWidth={1.6} />
            </button>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 17 }}>{salon.name}</p>
            <p className="t-s">لوگوی سالن</p>
            {avatarUrl && (
              <button
                onClick={async () => {
                  setAvatarUrl("");
                  await updateSalon({ logo_url: null });
                }}
                className="t-s"
                style={{ color: "var(--wine-hi)", marginTop: 4 }}
              >
                حذف عکس
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="row" style={{ gap: 8, marginBottom: 4 }}>
          <FileText className="h-4 w-4 text-primary" />
          <h3 style={{ fontSize: 17 }}>اطلاعات پایه</h3>
        </div>

        <label className="field">
          <span>نام سالن</span>
          <input id="settings-field-1" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="نام سالن" />
        </label>

        <label className="field">
          <span>شعار تبلیغاتی</span>
          <input id="settings-field-2" className="input" value={slogan} onChange={(e) => setSlogan(e.target.value)} placeholder="مثلاً: زیبایی ناخن، اعتماد به نفس شما" />
        </label>

        <label className="field">
          <span>توضیحات</span>
          <input id="settings-field-3" className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="توضیح کوتاه درباره سالن" />
        </label>
      </section>

      <section className="panel">
        <div className="row" style={{ gap: 8, marginBottom: 4 }}>
          <Phone className="h-4 w-4 text-primary" />
          <h3 style={{ fontSize: 17 }}>اطلاعات تماس</h3>
        </div>

        <label className="field">
          <span>شماره موبایل</span>
          <input id="settings-field-4" className="input ltr" style={{ textAlign: "left" }} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09121234567" />
        </label>

        <label className="field">
          <span>آدرس</span>
          <input id="settings-field-5" className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="آدرس سالن" />
        </label>

        <label className="field">
          <span>شهر</span>
          <input id="settings-field-6" className="input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="مثلاً مشهد" />
        </label>

        <label className="field">
          <span>آیدی اینستاگرام</span>
          <input id="settings-field-7" className="input ltr" style={{ textAlign: "left" }} value={instagramHandle} onChange={(e) => setInstagramHandle(e.target.value)} placeholder="forehand.nail" />
        </label>

        <label className="field">
          <span>ساعت کار</span>
          <input id="settings-field-8" className="input" value={workingHoursText} onChange={(e) => setWorkingHoursText(e.target.value)} placeholder="مثلاً: شنبه تا پنج شنبه . ۱۰ تا ۱۸" />
        </label>
      </section>

      <section className="panel">
        <div className="row" style={{ gap: 8, marginBottom: 4 }}>
          <Camera className="h-4 w-4 text-primary" />
          <h3 style={{ fontSize: 17 }}>تصویر صفحه اصلی</h3>
        </div>
        <p className="text-small text-muted-foreground">این تصویر جدا از لوگو است و داخل دایره پروفایل صفحه اصلی نمایش داده می‌شود؛ مثلاً عکس دست یا نمونه کار ناخن.</p>
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 overflow-hidden rounded-full bg-muted">
            <input ref={portraitFileInputRef} type="file" accept="image/*" onChange={handlePortraitFileSelect} className="hidden" />
            {portraitUrl ? <Image src={portraitUrl} alt="تصویر صفحه اصلی" fill unoptimized className="object-cover" /> : <div className="flex h-full w-full items-center justify-center"><Sparkles className="h-7 w-7 text-muted-foreground" /></div>}
            <button type="button" onClick={() => portraitFileInputRef.current?.click()} disabled={portraitUploading} aria-label="تغییر تصویر صفحه اصلی" className="absolute bottom-1 end-1 grid tap-44 place-items-center rounded-full bg-primary text-primary-foreground disabled:bg-primary/15 disabled:text-foreground/70"><Camera className="h-3.5 w-3.5" /></button>
          </div>
          <div className="text-small text-muted-foreground">عکس دست یا ناخن، مربع یا عمودی، حداکثر ۵ مگابایت.</div>
        </div>
        {portraitUrl && <button type="button" onClick={async () => { setPortraitUrl(""); await updateSalon({ portrait_image_url: null }); toast.success("تصویر حذف شد"); }} className="text-small text-destructive hover:underline">حذف تصویر</button>}
      </section>

      {/* Splash Screen section */}
      {/* Hero background image — full-bleed cover behind the homepage profile */}
      <section className="panel">
        <div className="row" style={{ gap: 8, marginBottom: 4 }}>
          <Camera className="h-4 w-4 text-primary" />
          <h3 style={{ fontSize: 17 }}>تصویر پس‌زمینه صفحه اصلی</h3>
        </div>
        <p className="text-small text-muted-foreground">تصویر پس‌زمینه بالای صفحه اصلی (پشت عکس پروفایل). افقی و با کیفیت بالا.</p>
        <div className="flex items-center gap-4">
          <div className="relative h-24 w-36 overflow-hidden rounded-none bg-muted">
            <input ref={heroFileInputRef} type="file" accept="image/*" onChange={handleHeroFileSelect} className="hidden" />
            {heroUrl ? <Image src={heroUrl} alt="تصویر پس‌زمینه" fill unoptimized className="object-cover" /> : <div className="flex h-full w-full items-center justify-center"><Sparkles className="h-6 w-6 text-muted-foreground" /></div>}
            <button type="button" onClick={() => heroFileInputRef.current?.click()} disabled={heroUploading} aria-label="تغییر تصویر پس‌زمینه" className="absolute bottom-1 end-1 grid tap-44 place-items-center rounded-full bg-primary text-primary-foreground disabled:bg-primary/15 disabled:text-foreground/70"><Camera className="h-3.5 w-3.5" /></button>
          </div>
          <div className="text-small text-muted-foreground">افقی، حداکثر ۵ مگابایت. بدون این تصویر، رنگ گرم پیش‌فرض نمایش داده می‌شود.</div>
        </div>
        {heroUrl && <button type="button" onClick={async () => { setHeroUrl(""); await updateSalon({ hero_image_url: null }); toast.success("تصویر حذف شد"); }} className="text-small text-destructive hover:underline">حذف تصویر</button>}
      </section>

      {/* Homepage background video — silent, looping clip behind the hero */}
      <section className="panel">
        <div className="row" style={{ gap: 8, marginBottom: 4 }}>
          <Video className="h-4 w-4 text-primary" />
          <h3 style={{ fontSize: 17 }}>ویدیوی پس‌زمینه صفحه اصلی</h3>
        </div>
        <p className="text-small text-muted-foreground -mt-2">
          یک کلیپ کوتاه و بی‌صدا پشت عنوان صفحه اصلی پخش می‌شود. افقی یا عمودی، حداکثر ۲۵ مگابایت.
          بدون ویدیو، کلیپ پیش‌فرض سایت نمایش داده می‌شود.
        </p>
        <input
          ref={heroVideoInputRef}
          type="file"
          accept="video/mp4,video/webm"
          onChange={handleHeroVideoSelect}
          className="hidden"
        />
        <div className="relative aspect-video w-full overflow-hidden rounded-none border border-border bg-muted">
          {heroVideoUrl ? (
            <video src={heroVideoUrl} muted playsInline loop preload="metadata" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Video className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <button
            type="button"
            onClick={() => heroVideoInputRef.current?.click()}
            disabled={heroVideoUploading}
            aria-label="تغییر ویدیوی پس‌زمینه"
            className="absolute bottom-1 end-1 grid tap-44 place-items-center rounded-full bg-primary text-primary-foreground disabled:bg-primary/15 disabled:text-foreground/70"
          >
            <Video className="h-3.5 w-3.5" />
          </button>
          {heroVideoUploading && (
            <div className="absolute inset-0 grid place-items-center bg-background/60 text-caption">در حال آپلود…</div>
          )}
        </div>
        {heroVideoUrl && (
          <button
            type="button"
            onClick={async () => {
              setHeroVideoUrl("");
              await updateSalon({ hero_video_url: null });
              toast.success("ویدیو حذف شد");
            }}
            className="text-small text-destructive hover:underline"
          >
            حذف ویدیو
          </button>
        )}
      </section>

      {/* Homepage gallery — 3 customer-facing slots */}
      <section className="panel">
        <div className="row" style={{ gap: 8, marginBottom: 4 }}>
          <Camera className="h-4 w-4 text-primary" />
          <h3 style={{ fontSize: 17 }}>گالری صفحه اصلی</h3>
        </div>
        <p className="text-small text-muted-foreground -mt-2">
          تصویر اول نقش «پوستر» ویدیوی پس‌زمینه صفحه اصلی را دارد و پیش از پخش ویدیو نشان داده می‌شود؛ تصاویر دوم و سوم فعلاً استفاده نمی‌شوند. مربع یا افقی، حداکثر ۵ مگابایت.
        </p>
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          onChange={handleGalleryFileSelect}
          className="hidden"
        />
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((index) => {
            const url = galleryUrls[index] || "";
            const uploading = galleryUploading === index;
            return (
              <div key={index} className="space-y-1.5">
                <div className="relative aspect-[4/3] overflow-hidden rounded-none border border-border bg-muted">
                  {url ? (
                    <Image src={url} alt={`تصویر ${index + 1} گالری`} fill unoptimized className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center"><Sparkles className="h-5 w-5 text-muted-foreground" /></div>
                  )}
                  <button
                    type="button"
                    data-index={index}
                    onClick={() => {
                      if (galleryInputRef.current) {
                        galleryInputRef.current.dataset.index = String(index);
                        galleryInputRef.current.click();
                      }
                    }}
                    disabled={galleryUploading !== null}
                    aria-label={`تغییر تصویر ${index + 1}`}
                    className="absolute bottom-1 end-1 grid tap-44 place-items-center rounded-full bg-primary text-primary-foreground disabled:bg-primary/15 disabled:text-foreground/70"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                  {uploading && <div className="absolute inset-0 grid place-items-center bg-background/60 text-caption">در حال آپلود…</div>}
                </div>
                <div className="flex items-center justify-between text-caption text-muted-foreground">
                  <span>تصویر {index + 1}</span>
                  {url && (
                    <button type="button" onClick={() => handleGalleryRemove(index)} className="text-destructive hover:underline">حذف</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Customer-facing text — every brand string shown to customers */}
      <section className="panel">
        <div className="row" style={{ gap: 8, marginBottom: 4 }}>
          <FileText className="h-4 w-4 text-primary" />
          <h3 style={{ fontSize: 17 }}>متن‌های نمایشی مشتریان</h3>
        </div>
        <p className="text-small text-muted-foreground -mt-2">
          این متن‌ها همان‌هایی هستند که مشتری در صفحه اصلی و روند رزرو می‌بیند.
        </p>

        <label className="field">
          <span>نوشته بالای نام برند (انگلیسی)</span>
          <input id="settings-field-9" className="input ltr" style={{ textAlign: "left" }} value={homepageKicker} onChange={(e) => setHomepageKicker(e.target.value)} placeholder="NAIL · CARE · RITUAL" maxLength={40} />
        </label>

        <label className="field">
          <span>متن دکمه اصلی رزرو</span>
          <input id="settings-field-10" className="input" value={homepageCtaLabel} onChange={(e) => setHomepageCtaLabel(e.target.value)} placeholder="شروع رزرو" maxLength={40} />
        </label>

        <label className="field">
          <span>متن زیر دکمه رزرو</span>
          <input id="settings-field-11" className="input" value={homepageMicro} onChange={(e) => setHomepageMicro(e.target.value)} placeholder="بدون تماس تلفنی · زمان‌های آزاد همین‌جا" maxLength={80} />
        </label>

        <label className="field">
          <span>عنوان بخش نمونه‌کارها</span>
          <input id="settings-field-12" className="input" value={lookbookTitle} onChange={(e) => setLookbookTitle(e.target.value)} placeholder="نمونه‌کارها" maxLength={40} />
        </label>

        <label className="field">
          <span>متن موفقیت رزرو</span>
          <input id="settings-field-13" className="input" value={bookingSuccessTitle} onChange={(e) => setBookingSuccessTitle(e.target.value)} placeholder="به‌زودی می‌بینیمت!" maxLength={40} />
        </label>
      </section>

      <section className="panel">
        <div className="row" style={{ gap: 8, marginBottom: 4 }}>
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 style={{ fontSize: 17 }}>اسپلش (صفحه ورود)</h3>
        </div>
        <p className="text-small text-muted-foreground -mt-2">
          متن و لوگوی صفحه ورود مشتریان. برای دیدن تغییرات، صفحه را رفرش کنید.
        </p>

        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              ref={splashFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleSplashFileSelect}
              className="hidden"
            />
            {splashLogoUrl ? (
              <Image
                src={splashLogoUrl}
                alt={name}
                width={64}
                height={64}
                unoptimized
                className="h-16 w-16 rounded-none object-cover border border-border"
              />
            ) : (
              <div className="h-16 w-16 rounded-none bg-foreground/5 border border-border border-dashed flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <button
              onClick={() => splashFileInputRef.current?.click()}
              disabled={splashUploading}
              aria-label="تغییر لوگوی اسپلش"
              className="tap-44 absolute -bottom-1 -left-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:bg-primary/15 disabled:text-foreground/70"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-caption font-normal text-foreground">لوگوی اسپلش</p>
            <p className="text-small text-muted-foreground mt-0.5">PNG، JPG تا ۵ مگابایت. اختیاری.</p>
            {splashLogoUrl && (
              <button
                onClick={async () => {
                  setSplashLogoUrl("");
                  await updateSalon({ splash_logo_url: null });
                }}
                className="text-small text-destructive mt-1 hover:underline"
              >
                حذف عکس
              </button>
            )}
          </div>
        </div>
      </section>

      <button type="button" onClick={handleSave} disabled={saving} className="btn pri block">
        <Save size={18} strokeWidth={1.6} aria-hidden="true" />
        {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
      </button>

      {/* Backup Section */}
      <section className="panel">
        <div className="row" style={{ gap: 8, marginBottom: 4 }}>
          <h3 style={{ fontSize: 17 }}>پشتیبان‌گیری</h3>
        </div>
        <p className="t-s">
          از تمام اطلاعات سالن (خدمات، قیمت‌ها، رزروها، تنظیمات) خروجی بگیرید
        </p>
        <div className="row" style={{ gap: 10, marginTop: 14 }}>
          <button
            type="button"
            className="btn gl"
            style={{ flex: 1 }}
            onClick={async () => {
              try {
                const res = await fetch("/api/owner/backup", { credentials: "include" });
                if (!res.ok) throw new Error("خطا");
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `nailbook-backup-${new Date().toISOString().split("T")[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success("فایل پشتیبان دانلود شد");
              } catch {
                toast.error("خطا در دریافت پشتیبان");
              }
            }}
          >
            دانلود پشتیبان
          </button>
          <button
            type="button"
            className="btn gl"
            style={{ flex: 1 }}
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = ".json";
              input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) return;
                try {
                  const text = await file.text();
                  const backup = JSON.parse(text);
                  if (!backup.data) {
                    toast.error("فایل پشتیبان نامعتبر است");
                    return;
                  }
                  const res = await fetch("/api/owner/backup", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ data: backup.data, mode: "merge" }),
                  });
                  const result = await res.json();
                  if (result.success) {
                    toast.success(`${result.restored} مورد بازیابی شد`);
                    window.location.reload();
                  } else {
                    toast.error(result.error || "خطا در بازیابی");
                  }
                } catch {
                  toast.error("فایل پشتیبان نامعتبر است");
                }
              };
              input.click();
            }}
          >
            بازیابی از فایل
          </button>
        </div>
      </section>

      {/* Crop Modal (salon logo) */}
      {cropImage && (
        <ImageCrop
          image={cropImage}
          onCropComplete={handleCropComplete}
          onCancel={() => setCropImage(null)}
          aspect={1}
        />
      )}
      {/* Crop Modal (splash logo) */}
      {portraitCropImage && (
        <ImageCrop
          image={portraitCropImage}
          onCropComplete={handlePortraitCropComplete}
          onCancel={() => setPortraitCropImage(null)}
          aspect={1}
        />
      )}
      {/* Crop Modal (hero background) */}
      {heroCropImage && (
        <ImageCrop
          image={heroCropImage}
          onCropComplete={handleHeroCropComplete}
          onCancel={() => setHeroCropImage(null)}
          aspect={16 / 9}
        />
      )}
      {/* Crop Modal (homepage gallery slot) */}
      {galleryCrop && (
        <ImageCrop
          image={galleryCrop.src}
          onCropComplete={handleGalleryCropComplete}
          onCancel={() => setGalleryCrop(null)}
          aspect={4 / 3}
        />
      )}
      {splashCropImage && (
        <ImageCrop
          image={splashCropImage}
          onCropComplete={handleSplashCropComplete}
          onCancel={() => setSplashCropImage(null)}
          aspect={1}
        />
      )}
    </div>
    </SalonGuard>
  );
}
