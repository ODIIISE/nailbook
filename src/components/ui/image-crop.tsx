"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { Button } from "./button";

interface ImageCropProps {
  image: string;
  onCropComplete: (croppedBlob: Blob) => void;
  onCancel: () => void;
  aspect?: number;
}

function getCroppedImg(imageSrc: string, pixelCrop: { x: number; y: number; width: number; height: number }): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onerror = () => reject(new Error("Failed to load image"));
    image.src = imageSrc;
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      );
      canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.9);
    };
  });
}

export function ImageCrop({ image, onCropComplete: onComplete, onCancel, aspect = 1 }: ImageCropProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const handleCropComplete = useCallback(
    (_: any, croppedAreaPixels: { x: number; y: number; width: number; height: number }) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    const blob = await getCroppedImg(image, croppedAreaPixels);
    onComplete(blob);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          انصراف
        </Button>
        <span className="text-sm font-bold">برش تصویر</span>
        <Button size="sm" onClick={handleConfirm}>
          تایید
        </Button>
      </div>

      {/* Cropper */}
      <div className="flex-1 relative">
        <Cropper
          image={image}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={handleCropComplete}
          cropShape="round"
          showGrid={false}
        />
      </div>

      {/* Zoom slider */}
      <div className="px-6 py-4 border-t">
        <input
          type="range"
          min={1}
          max={3}
          step={0.1}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>کوچک</span>
          <span>بزرگ</span>
        </div>
      </div>
    </div>
  );
}
