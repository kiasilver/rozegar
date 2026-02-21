"use client";
import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

// Dynamic import for Leaflet to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

// Component to handle map clicks and updates - must be inside MapContainer
const MapClickHandler = dynamic(
  () =>
    import("react-leaflet").then((mod) => {
      const { useMapEvents, useMap } = mod;
      const React = require("react");
      return function MapClickHandlerInner({
        onLocationSelect,
        pickerActive,
        center,
      }: {
        onLocationSelect?: (lat: number, lng: number) => void;
        pickerActive?: boolean;
        center?: [number, number];
      }) {
        const map = useMap();
        
        // Update map center when center prop changes
        React.useEffect(() => {
          if (center && map) {
            map.setView(center, map.getZoom());
          }
        }, [center, map]);
        
        useMapEvents({
          click: (e: any) => {
            if (pickerActive && onLocationSelect) {
              const { lat, lng } = e.latlng;
              onLocationSelect(lat, lng);
            }
          },
        });
        return null;
      };
    }),
  { ssr: false }
);

interface ClickableMapProps {
  latitude?: number | string;
  longitude?: number | string;
  onLocationSelect?: (lat: number, lng: number) => void;
  height?: string;
  pickerActive?: boolean;
  className?: string;
}

export default function ClickableMap({
  latitude,
  longitude,
  onLocationSelect,
  height = "400px",
  pickerActive = false,
  className = "",
}: ClickableMapProps) {
  const [mounted, setMounted] = useState(false);
  const [L, setL] = useState<any>(null);
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLng, setCurrentLng] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
    // Dynamically import Leaflet
    import("leaflet").then((leaflet) => {
      setL(leaflet.default);
      
      // Fix for default marker icon in Next.js
      delete (leaflet.default.Icon.Default.prototype as any)._getIconUrl;
      leaflet.default.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });
    });
  }, []);

  useEffect(() => {
    if (latitude && longitude) {
      const lat = typeof latitude === "string" ? parseFloat(latitude) : latitude;
      const lng = typeof longitude === "string" ? parseFloat(longitude) : longitude;
      if (!isNaN(lat) && !isNaN(lng)) {
        setCurrentLat(lat);
        setCurrentLng(lng);
      }
    }
  }, [latitude, longitude]);

  const handleLocationSelect = (lat: number, lng: number) => {
    setCurrentLat(lat);
    setCurrentLng(lng);
    if (onLocationSelect) {
      onLocationSelect(lat, lng);
    }
  };

  // Default to Tehran, Iran if no coordinates provided
  const defaultLat = currentLat ?? 35.6892;
  const defaultLng = currentLng ?? 51.3890;

  if (!mounted || !L) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 ${className}`}
        style={{ height }}
      >
        <p className="text-gray-500">در حال بارگذاری نقشه...</p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ height }}>
      {pickerActive && (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-[1000] bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
          روی نقشه کلیک کنید تا موقعیت را انتخاب کنید
        </div>
      )}
      <MapContainer
        center={[defaultLat, defaultLng]}
        zoom={currentLat && currentLng ? 15 : 10}
        style={{ height: "100%", width: "100%", zIndex: 0 }}
        className={pickerActive ? "cursor-crosshair" : ""}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {currentLat && currentLng && (
          <Marker position={[currentLat, currentLng]}>
            <Popup>
              موقعیت انتخاب شده: {currentLat.toFixed(6)}, {currentLng.toFixed(6)}
            </Popup>
          </Marker>
        )}
        <MapClickHandler
          onLocationSelect={handleLocationSelect}
          pickerActive={pickerActive}
          center={currentLat && currentLng ? [currentLat, currentLng] : undefined}
        />
      </MapContainer>
    </div>
  );
}
