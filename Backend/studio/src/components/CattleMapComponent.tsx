"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

function createCattleIcon(color: string, isAlert: boolean, isSelected: boolean) {
  return new L.DivIcon({
    className: "bg-transparent border-0",
    html: `
      <div class="relative flex items-center justify-center \${isSelected ? 'scale-150 transition-transform duration-300' : 'transition-transform duration-300'}">
        \${isAlert ? \`<div class="absolute inset-0 \${color === '#C62828' ? 'bg-red-500/50' : 'bg-yellow-500/50'} rounded-full blur-[8px] animate-[pulse_1s_ease-in-out_infinite] scale-[2]"></div>\` : ''}
        <div class="relative w-5 h-5 rounded-full flex items-center justify-center backdrop-blur-sm shadow-[0_4px_12px_rgba(0,0,0,0.6)]" style="background: linear-gradient(135deg, \${color}dd, \${color}aa); border: 2px solid rgba(255,255,255,0.9);">
           <div class="w-1 h-1 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,1)]"></div>
        </div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
}

const ICONS = {
  healthy: {
    normal: createCattleIcon("#2E7D32", false, false),
    selected: createCattleIcon("#2E7D32", false, true)
  },
  warning: {
    normal: createCattleIcon("#E7A600", true, false),
    selected: createCattleIcon("#E7A600", true, true)
  },
  critical: {
    normal: createCattleIcon("#C62828", true, false),
    selected: createCattleIcon("#C62828", true, true)
  }
};

function getIconForStatus(status: "healthy" | "warning" | "critical", isSelected: boolean) {
  return ICONS[status][isSelected ? "selected" : "normal"];
}

type MapComponentProps = {
  cows: Array<{ id: string, lat: number, lng: number, status: "healthy" | "warning" | "critical" }>;
  selectedCow: string | null;
  setSelectedCow: (id: string | null) => void;
  centerPos: [number, number];
};

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

export default function CattleMapComponent({ cows, selectedCow, setSelectedCow, centerPos }: MapComponentProps) {
  return (
    <MapContainer
      center={centerPos}
      zoom={18}
      zoomControl={false}
      scrollWheelZoom={true}
      preferCanvas={true}
      style={{ height: "100%", width: "100%" }}
      className="z-0"
    >
      <MapUpdater center={centerPos} />
      <TileLayer
        attribution='&copy; Google'
        url="https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}"
        subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
        maxZoom={21}
        maxNativeZoom={20}
      />
      {cows.map(cow => (
        <Marker
          key={cow.id}
          position={[cow.lat, cow.lng]}
          icon={getIconForStatus(cow.status, selectedCow === cow.id)}
          eventHandlers={{
            click: () => setSelectedCow(cow.id === selectedCow ? null : cow.id)
          }}
        />
      ))}
    </MapContainer>
  );
}
