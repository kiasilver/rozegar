"use client";

import { RgbaColorPicker } from "react-colorful";
import { useState, useRef, useEffect } from "react";
import { PaintBucket } from "lucide-react";

interface CustomColorPickerProps {
  value?: string;
  onChange: (color: string) => void;
}

const rgbaStringToObject = (rgba: string) => {
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([0-9.]*)\)/);
  if (!match) return { r: 255, g: 0, b: 0, a: 1 };
  return {
    r: parseInt(match[1]),
    g: parseInt(match[2]),
    b: parseInt(match[3]),
    a: match[4] === "" ? 1 : parseFloat(match[4]),
  };
};

export const CustomColorPicker = ({ value, onChange }: CustomColorPickerProps) => {
  const initial = value ? rgbaStringToObject(value) : { r: 255, g: 0, b: 0, a: 1 };
  const [color, setColor] = useState(initial);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const rgbaString = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      {/* Icon Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-9 h-9 rounded-full border shadow flex items-center justify-center relative"
        style={{ backgroundColor: rgbaString }}
      >
        <PaintBucket className="text-white drop-shadow" size={18} />
      </button>

      {/* Picker Panel */}
      {open && (
        <div className="absolute z-50 mt-2 p-4 bg-white dark:bg-zinc-900 rounded-lg shadow-lg w-72">
          <RgbaColorPicker
            color={color}
            onChange={(c) => {
              setColor(c);
              onChange(`rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})`);
            }}
          />

          {/* RGBA Inputs */}
          <div className="grid grid-cols-4 gap-2 mt-4 text-xs text-zinc-800 dark:text-zinc-200">
            {["R", "G", "B", "A"].map((key) => {
              const lowerKey = key.toLowerCase() as keyof typeof color;
              return (
                <div key={key} className="flex flex-col items-center">
                  <label className="mb-1">{key}</label>
                  <input
                    type="number"
                    min={0}
                    max={key === "A" ? 1 : 255}
                    step={key === "A" ? 0.01 : 1}
                    value={color[lowerKey]}
                    onChange={(e) => {
                      const val =
                        key === "A" ? parseFloat(e.target.value) : parseInt(e.target.value);
                      const updated = { ...color, [lowerKey]: isNaN(val) ? 0 : val };
                      setColor(updated);
                      onChange(
                        `rgba(${updated.r}, ${updated.g}, ${updated.b}, ${updated.a})`
                      );
                    }}
                    className="w-12 px-1 py-0.5 border rounded bg-white dark:bg-zinc-800 text-center"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
