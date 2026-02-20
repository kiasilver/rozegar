"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  ChevronDown,
  Bold,
  Italic,
  Underline,
  Link as LinkIcon,
  Type,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  PaintBucket,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  
  const editorRef = useRef<HTMLDivElement>(null);
  const [blockType, setBlockType] = useState("p");
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [activeFormats, setActiveFormats] = useState<string[]>([]);
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [lang, setLang] = useState<"fa" | "en">("fa");
  const [selectedColor, setSelectedColor] = useState("#ffffff");
  const [opacity, setOpacity] = useState(1);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [shouldSaveColor, setShouldSaveColor] = useState(false);

  const format = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (command === "formatBlock" && value) {
      setBlockType(value);
    }
    updateActiveFormats();
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
      updateActiveFormats();
      setShowColorDropdown(false);
      if (shouldSaveColor) {
        const rgba = hexToRgba(selectedColor, opacity);
        addToRecentColors(rgba);
        setShouldSaveColor(false);
      }
    }
  };

  const updateActiveFormats = () => {
    const formats: string[] = [];
    if (document.queryCommandState("bold")) formats.push("bold");
    if (document.queryCommandState("italic")) formats.push("italic");
    if (document.queryCommandState("underline")) formats.push("underline");
    setActiveFormats(formats);
  };

  const addToRecentColors = (color: string) => {
    setRecentColors((prev) => {
      const updated = [color, ...prev.filter((c) => c !== color)].slice(0, 10);
      localStorage.setItem("recentColors", JSON.stringify(updated));
      return updated;
    });
  };

  const blockOptions = [
    { label: "Normal Text", value: "p", icon: <Type size={16} /> },
    { label: "Heading 1", value: "h1", icon: <Heading1 size={16} /> },
    { label: "Heading 2", value: "h2", icon: <Heading2 size={16} /> },
    { label: "Heading 3", value: "h3", icon: <Heading3 size={16} /> },
    { label: "Heading 4", value: "h4", icon: <Heading4 size={16} /> },
  ];

  const currentBlock = blockOptions.find((opt) => opt.value === blockType);



useEffect(() => {
  if (editorRef.current) {
    if (!editorRef.current.innerHTML.trim() && value) {
      editorRef.current.innerHTML = value; // مقدار description را در ویرایشگر قرار می‌دهیم
    }
  }
}, [value]); // وابسته به تغییرات value


  useEffect(() => {
    updateActiveFormats();
  }, []);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.setAttribute("lang", lang);
      editorRef.current.setAttribute("dir", lang === "fa" ? "rtl" : "ltr");
      editorRef.current.style.textAlign = lang === "fa" ? "right" : "left";
    }
  }, [lang]);

  useEffect(() => {
    const savedColors = localStorage.getItem("recentColors");
    if (savedColors) {
      setRecentColors(JSON.parse(savedColors));
    }
  }, []);

  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return (
    <div className="space-y-3 relative">
      <div className="absolute top-0 left-0 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs px-2 py-0.5 rounded-md m-2 z-20">
        زبان: {lang.toUpperCase()} / {lang === "fa" ? "راست‌چین" : "چپ‌چین"}
      </div>

      <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-2 rounded-md border dark:border-gray-700 gap-2 flex-wrap">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowFormatMenu(!showFormatMenu)}
            className="flex pt-[8px] items-stretch gap-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-white px-3 py-1.5 rounded-md text-sm border dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition"
          >
            {currentBlock?.icon}
            <span>{currentBlock?.label}</span>
            <ChevronDown size={16} />
          </button>

          {showFormatMenu && (
            <div className="absolute z-10 mt-1 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
              {blockOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    format("formatBlock", option.value);
                    setShowFormatMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {option.icon}
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1" />

        <div className="flex gap-1 items-center">
            
          <button type="button" onClick={() => format("bold")} className={`p-1.5 rounded ${activeFormats.includes("bold") ? "bg-blue-200 dark:bg-blue-600 text-blue-900 dark:text-white" : "hover:bg-gray-200 dark:text-white dark:hover:bg-gray-700"}`}><Bold size={16} /></button>
          <button type="button" onClick={() => format("italic")} className={`p-1.5 rounded ${activeFormats.includes("italic") ? "bg-blue-200 dark:bg-blue-600 text-blue-900 dark:text-white" : "hover:bg-gray-200 dark:text-white dark:hover:bg-gray-700"}`}><Italic size={16} /></button>
          <button type="button" onClick={() => format("underline")} className={`p-1.5 rounded ${activeFormats.includes("underline") ? "bg-blue-200 dark:bg-blue-600 text-blue-900 dark:text-white" : "hover:bg-gray-200 dark:text-white dark:hover:bg-gray-700"}`}><Underline size={16} /></button>
          <button type="button" onClick={() => { const url = prompt("لینک وارد کن:"); if (url) format("createLink", url); }} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 dark:text-white"><LinkIcon size={16} /></button>
          <button type="button" onClick={() => setLang((prev) => (prev === "fa" ? "en" : "fa"))} className="p-1.5 rounded bg-gray-200 dark:bg-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 text-sm">{lang === "fa" ? "EN" : "FA"}</button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColorDropdown(!showColorDropdown)}
              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 dark:text-white flex items-center gap-1"
            >
              <PaintBucket size={16} />
              <div
                className="w-4 h-4 rounded border dark:text-white"
                style={{ backgroundColor: hexToRgba(selectedColor, opacity) }}
              />
            </button>

            {showColorDropdown && (
              <div className="absolute top-10 z-20 p-4 w-64 bg-white dark:bg-gray-800 border rounded-md shadow space-y-4">
                {recentColors.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {recentColors.map((color, index) => (
                <button
                type="button" // اضافه‌شده
                key={index}
                onClick={() => {
                setSelectedColor(color);
                format("backColor", color);
                setShouldSaveColor(true);
                }}
                style={{ backgroundColor: color }}
                className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600 dark:text-white hover:scale-105 transition"
                />
                ))}
                  </div>
                )}

                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => {
                    const color = e.target.value;
                    setSelectedColor(color);
                    format("backColor", color);
                    setShouldSaveColor(true);
                  }}
                  className="w-full h-10 cursor-pointer"
                />
                <input
                  type="text"
                  value={selectedColor}
                  onChange={(e) => {
                    const color = e.target.value;
                    setSelectedColor(color);
                    format("backColor", color);
                    setShouldSaveColor(true);
                  }}
                  className="w-full px-2 py-1 border rounded-md text-sm dark:bg-gray-700 dark:text-white"
                />
                <div className="flex items-center gap-2">
                  <label className="text-sm dark:text-white">شفافیت</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={opacity}
                    onChange={(e) => {
                      const newOpacity = parseFloat(e.target.value);
                      setOpacity(newOpacity);
                      const rgba = hexToRgba(selectedColor, newOpacity);
                      format("backColor", rgba);
                      setShouldSaveColor(true);
                    }}
                    className="flex-1"
                  />
                  <span className="text-xs w-8 text-right dark:text-white">{Math.round(opacity * 100)}%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        ref={editorRef}
        contentEditable
        dir="auto"
        lang={lang}
        className="min-h-[200px] p-3 border rounded bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:outline-none leading-relaxed"
        style={{
          unicodeBidi: "isolate",
          direction: "rtl",
          textAlign: "right",
        }}
        onInput={handleInput}
      />
    </div>
  );
}
