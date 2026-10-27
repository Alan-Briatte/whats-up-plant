"use client";

import React, { useRef, useState } from "react";
import { Camera, Upload, X, Sparkles, Image as ImageIcon } from "lucide-react";

interface ImagePickerProps {
  value: string;
  onChange: (base64OrUrl: string) => void;
  label?: string;
}

const SAMPLE_PHOTOS = [
  {
    label: "Monstera",
    url: "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&w=800&q=80",
  },
  {
    label: "Ficus Lyrata",
    url: "https://images.unsplash.com/photo-1545241047-6083a3684587?auto=format&fit=crop&w=800&q=80",
  },
  {
    label: "Calathea",
    url: "https://images.unsplash.com/photo-1637967886160-fd78dc3ce3f5?auto=format&fit=crop&w=800&q=80",
  },
];

export function ImagePicker({
  value,
  onChange,
  label = "Photo de la plante",
}: ImagePickerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [compressing, setCompressing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 900;
        let width = img.width;
        let height = img.height;

        if (width > height && width > MAX_SIZE) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
          onChange(dataUrl);
        } else if (typeof event.target?.result === "string") {
          onChange(event.target.result);
        }
        setCompressing(false);
      };
      img.onerror = () => {
        if (typeof event.target?.result === "string") {
          onChange(event.target.result);
        }
        setCompressing(false);
      };
      if (typeof event.target?.result === "string") {
        img.src = event.target.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const selectSampleUrlAsDataUrl = async (url: string) => {
    setCompressing(true);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          onChange(reader.result);
        } else {
          onChange(url);
        }
        setCompressing(false);
      };
      reader.readAsDataURL(blob);
    } catch {
      onChange(url);
      setCompressing(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-stone-800">
        {label}
      </label>

      {value ? (
        <div className="relative overflow-hidden rounded-2xl border-2 border-botanical-200 bg-stone-100 aspect-[16/10] max-h-72">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Aperçu plante"
            className="h-full w-full object-cover"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm hover:bg-black/80 transition-colors"
            title="Retirer la photo"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-botanical-300 bg-botanical-50/60 p-6 text-center transition-colors hover:border-botanical-500">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-botanical-100 text-botanical-700">
            <ImageIcon className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-stone-700">
            Prenez une photo avec votre mobile ou importez une image
          </p>
          <p className="mt-1 text-xs text-stone-500">
            JPG, PNG ou WebP • Compression automatique rapide
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={compressing}
              className="flex items-center gap-2 rounded-xl bg-botanical-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-botanical-800 transition-colors"
            >
              <Camera className="h-4 w-4" />
              Prendre une photo
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={compressing}
              className="flex items-center gap-2 rounded-xl border border-botanical-300 bg-white px-4 py-2.5 text-sm font-semibold text-botanical-800 hover:bg-botanical-50 transition-colors"
            >
              <Upload className="h-4 w-4" />
              Choisir un fichier
            </button>
          </div>

          <div className="mt-4 pt-3 border-t border-botanical-200/60">
            <span className="text-xs text-stone-500 mr-2 inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-botanical-600" />
              Exemples rapides :
            </span>
            <div className="mt-1.5 inline-flex flex-wrap gap-1.5 justify-center">
              {SAMPLE_PHOTOS.map((sample) => (
                <button
                  key={sample.label}
                  type="button"
                  onClick={() => selectSampleUrlAsDataUrl(sample.url)}
                  className="rounded-lg bg-white border border-stone-200 px-2.5 py-1 text-xs font-medium text-stone-700 hover:border-botanical-400 hover:text-botanical-700 transition-colors"
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Hidden inputs for Camera (mobile) and File upload */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
