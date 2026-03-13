"use client";

import { useCallback, useState } from "react";
import { Upload, X, ImagePlus } from "lucide-react";
import Image from "next/image";

interface ImageUploaderProps {
  images: File[];
  onChange: (images: File[]) => void;
}

export function ImageUploader({ images, onChange }: ImageUploaderProps) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const newFiles = Array.from(files);
      const updated = [...images, ...newFiles];
      onChange(updated);

      const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
      setPreviews((prev) => [...prev, ...newPreviews]);
    },
    [images, onChange]
  );

  const removeImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    onChange(updated);
    URL.revokeObjectURL(previews[index]);
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          dragging
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/30"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.multiple = true;
          input.accept = "image/*";
          input.onchange = () => handleFiles(input.files);
          input.click();
        }}
      >
        <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
          <Upload className="h-6 w-6 text-primary" />
        </div>
        <p className="text-sm font-medium">
          {dragging ? "Drop images here" : "Drag & drop images or click to browse"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WebP up to 10MB each</p>
      </div>

      {previews.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {previews.map((src, i) => (
            <div
              key={i}
              className={`relative aspect-square rounded-xl overflow-hidden border-2 group ${
                i === 0 ? "border-primary ring-2 ring-primary/20" : "border-transparent"
              }`}
            >
              <Image
                src={src}
                alt={`Upload ${i + 1}`}
                fill
                className="object-cover"
              />
              {i === 0 && (
                <div className="absolute bottom-0 inset-x-0 bg-primary text-primary-foreground text-center text-xs py-0.5 font-medium">
                  Cover
                </div>
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-sm rounded-full p-1.5 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {previews.length < 8 && (
            <div
              className="aspect-square rounded-xl border-2 border-dashed border-muted-foreground/20 flex items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all"
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.multiple = true;
                input.accept = "image/*";
                input.onchange = () => handleFiles(input.files);
                input.click();
              }}
            >
              <ImagePlus className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
