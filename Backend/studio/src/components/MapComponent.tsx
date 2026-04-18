"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

function createIcon(num: string, color: string, isCritical: boolean) {
  return new L.DivIcon({
    className: "bg-transparent border-0",
    html: `
      <div class="relative flex items-center justify-center">
        <!-- Glowing aura for critical -->
        ${isCritical ? `<div class="absolute inset-0 bg-red-500/50 rounded-full blur-[12px] animate-[pulse_1s_ease-in-out_infinite] scale-[2]"></div>` : ''}
        
        <!-- Premium glass node -->
        <div class="relative w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm shadow-[0_8px_32px_rgba(0,0,0,0.6)]" style="background: linear-gradient(135deg, ${color}dd, ${color}aa); border: 2px solid rgba(255,255,255,0.6);">
           <!-- Inner glowing core -->
           <div class="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,1)]"></div>
        </div>

        <!-- Sleek Label below -->
        <div class="absolute -bottom-7 whitespace-nowrap px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/20 text-[9px] font-black tracking-widest text-white shadow-xl uppercase">
           Node 0${num}
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
}

const healthyIcon = createIcon("1", "#2E7D32", false);
const warningIcon = createIcon("1", "#E7A600", false);
const criticalIcon = createIcon("1", "#C62828", true);

function getIconForStatus(status: "healthy" | "warning" | "critical") {
  switch (status) {
    case "critical": return criticalIcon;
    case "warning": return warningIcon;
    default: return healthyIcon;
  }
}

type MapComponentProps = {
  selectedNode: string | null;
  setSelectedNode: (node: string | null) => void;
  nodeStatus: "healthy" | "warning" | "critical";
};

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function MapComponent({ selectedNode, setSelectedNode, nodeStatus }: MapComponentProps) {
  const [position, setPosition] = useState<[number, number]>([29.9695, 76.8226]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => console.log("Geolocation error:", err),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  return (
    <MapContainer
      center={position}
      zoom={18}
      zoomControl={true}
      scrollWheelZoom={true}
      style={{ height: "100%", width: "100%" }}
      className="z-0"
    >
      <MapUpdater center={position} />
      <TileLayer
        attribution='&copy; Google'
        url="https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}"
        subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
        maxZoom={20}
      />
      <Marker
        position={position}
        icon={getIconForStatus(nodeStatus)}
      />
    </MapContainer>
  );
}
