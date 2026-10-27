"use client";

import React, { useRef, useState } from "react";
import { Camera, Upload, X, Plus, Image as ImageIcon } from "lucide-react";

interface MultiImagePickerProps {
  values: string[];
  onChange: (images: string[]) => void;
  label?: string;
  maxImages?: number;
}

export function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 1000;
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
          resolve(canvas.toDataURL("image/jpeg", 0.84));
        } else if (typeof event.target?.result === "string") {
          resolve(event.target.result);
        } else {
          resolve("");
        }
      };
      img.onerror = () => {
        resolve(typeof event.target?.result === "string" ? event.target.result : "");
      };
      if (typeof event.target?.result === "string") {
        img.src = event.target.result;
      }
    };
    reader.readAsDataURL(file);
  });
}

export function MultiImagePicker({
  values,
  onChange,
  label = "Photos du problème (feuilles, tiges, terreau...)",
  maxImages = 6,
}: MultiImagePickerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [compressing, setCompressing] = useState(false);

  const handleFilesSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setCompressing(true);
    try {
      const remainingSlots = Math.max(0, maxImages - values.length);
      const filesToProcess = Array.from(fileList).slice(0, remainingSlots);
      const compressedList: string[] = [];

      for (const file of filesToProcess) {
        const dataUrl = await compressImageFile(file);
        if (dataUrl) compressedList.push(dataUrl);
      }

      if (compressedList.length > 0) {
        onChange([...values, ...compressedList]);
      }
    } finally {
      setCompressing(false);
      e.target.value = "";
    }
  };

  const handleRemove = (index: number) => {
    onChange(values.filter((_, idx) => idx !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-stone-800">
          {label}
        </label>
        <span className="text-xs font-medium text-stone-500">
          {values.length} / {maxImages} photo{values.length > 1 ? "s" : ""}
        </span>
      </div>

      {values.length > 0 ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {values.map((imgSrc, idx) => (
              <div
                key={idx}
                className="group relative aspect-[4/3] overflow-hidden rounded-2xl border-2 border-botanical-200 bg-stone-100 shadow-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imgSrc}
                  alt={`Photo diagnostic ${idx + 1}`}
                  className="h-full w-full object-cover"
                />
                <div className="absolute left-2 top-2 rounded-lg bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                  Photo #{idx + 1}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white backdrop-blur-sm hover:bg-red-600 transition-colors"
                  title="Supprimer cette photo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {values.length < maxImages && (
              <div className="flex flex-col items-center justify-center gap-2 aspect-[4/3] rounded-2xl border-2 border-dashed border-botanical-300 bg-botanical-50/50 p-3 text-center">
                <p className="text-xs font-semibold text-botanical-900">
                  Ajouter un autre angle
                </p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  <button
                    type="button"
                    disabled={compressing}
                    onClick={() => cameraInputRef.current?.click()}
                    className="inline-flex items-center gap-1 rounded-xl bg-botanical-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-botanical-800"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    Photo
                  </button>
                  <button
                    type="button"
                    disabled={compressing}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 rounded-xl border border-botanical-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-botanical-800 hover:bg-botanical-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Fichier
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-botanical-300 bg-botanical-50/60 p-6 text-center transition-colors hover:border-botanical-500">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-botanical-100 text-botanical-700">
            <ImageIcon className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-stone-700">
            Ajoutez une ou plusieurs photos pour illustrer le problème
          </p>
          <p className="mt-1 text-xs text-stone-500">
            Vue d&apos;ensemble, zoom sur une feuille malade, revers de feuille
            ou état du terreau (jusqu&apos;à {maxImages} photos)
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
              Choisir des photos
            </button>
          </div>
        </div>
      )}

      {/* Hidden inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFilesSelected}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFilesSelected}
        className="hidden"
      />
    </div>
  );
}
