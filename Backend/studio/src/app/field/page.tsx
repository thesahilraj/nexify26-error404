"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Radio,
  Droplets,
  Thermometer,
  CloudRain,
  Wind,
  Gauge,
  Power,
  Wifi,
  WifiOff,
  Loader2,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const MapComponent = dynamic(() => import("@/components/MapComponent"), {
  ssr: false,
});

// ── Types ──
interface FarmSensorData {
  temp: number;
  humidity: number;
  moisture: number;
  moistureRaw: number;
  gas: number;
  gasRaw: number;
  pump: boolean;
  uptime: number;
}

interface FarmApiResponse {
  data: FarmSensorData | null;
  connected: boolean;
  lastUpdate: number;
}

// ── Circular Gauge Component ──
function CircularGauge({
  value,
  max,
  label,
  unit,
  color,
  warningThreshold,
  invertWarning = false,
}: {
  value: number;
  max: number;
  label: string;
  unit: string;
  color: string;
  warningThreshold?: number;
  invertWarning?: boolean;
}) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(value / max, 1);
  const strokeDashoffset = circumference * (1 - pct);

  const isWarning = warningThreshold !== undefined
    ? (invertWarning ? value > warningThreshold : value < warningThreshold)
    : false;

  const activeColor = isWarning ? "#EF4444" : color;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[88px] h-[88px]">
        <svg
          className="w-full h-full -rotate-90"
          viewBox="0 0 88 88"
        >
          {/* Background track */}
          <circle
            cx="44"
            cy="44"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-black/5"
          />
          {/* Active arc */}
          <circle
            cx="44"
            cy="44"
            r={radius}
            fill="none"
            stroke={activeColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: "stroke-dashoffset 0.8s ease, stroke 0.3s ease",
            }}
          />
        </svg>
        {/* Center Value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-xl font-black leading-none"
            style={{ color: activeColor }}
          >
            {value}
          </span>
          <span className="text-[9px] font-bold text-gray-400 uppercase">
            {unit}
          </span>
        </div>
      </div>
      <span className="text-[10px] font-extrabold text-[#6C8576] uppercase tracking-wider mt-1.5">
        {label}
      </span>
    </div>
  );
}

// ── Sensor Card Component ──
function SensorCard({
  icon: Icon,
  label,
  value,
  unit,
  bgColor,
  iconColor,
  iconBg,
  isAlert = false,
}: {
  icon: typeof Thermometer;
  label: string;
  value: string;
  unit?: string;
  bgColor: string;
  iconColor: string;
  iconBg: string;
  isAlert?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[18px] p-3.5 border transition-all",
        bgColor,
        isAlert && "ring-1 ring-red-300"
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className={cn("p-2 rounded-[12px]", iconBg)}>
          <Icon
            size={16}
            className={cn(iconColor, isAlert && "animate-pulse")}
          />
        </div>
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
            {label}
          </p>
          <p className="text-lg font-black text-[#113A28] leading-tight">
            {value}
            {unit && (
              <span className="text-xs font-bold text-gray-400 ml-0.5">
                {unit}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  Main Field Page
// ═══════════════════════════════════════════════

export default function FieldPage() {
  const [sensorData, setSensorData] = useState<FarmSensorData>({
    temp: 0,
    humidity: 0,
    moisture: 0,
    moistureRaw: 0,
    gas: 0,
    gasRaw: 0,
    pump: false,
    uptime: 0
  });
  const [isConnected, setIsConnected] = useState(false);
  const [pumpLoading, setPumpLoading] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>("");

  // ── Fetch sensor data every 2 seconds ──
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/farm", { cache: "no-store" });
      if (res.ok) {
        const result: FarmApiResponse = await res.json();
        if (result.connected && result.data) {
          setSensorData(result.data);
          setIsConnected(true);
          setLastUpdateTime(
            new Date(result.lastUpdate).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          );
        } else {
          setIsConnected(false);
        }
      } else {
        setIsConnected(false);
      }
    } catch {
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ── Pump Control ──
  const togglePump = async () => {
    if (!isConnected) return;
    setPumpLoading(true);
    try {
      const action = sensorData.pump ? "off" : "on";
      await fetch("/api/farm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      // Optimistic update
      setSensorData({ ...sensorData, pump: !sensorData.pump });
    } catch (e) {
      console.error("Pump command failed:", e);
    } finally {
      setPumpLoading(false);
    }
  };

  const isDry = sensorData ? sensorData.moisture < 40 : false;
  const isHighGas = sensorData ? sensorData.gas > 400 : false;
  const nodeStatus = !isConnected
    ? ("warning" as const)
    : isDry
    ? ("critical" as const)
    : ("healthy" as const);

  // Format uptime
  const formatUptime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="min-h-screen bg-[#DBEDD9] text-[#1B4332] font-sans selection:bg-[#B7D8C6] flex flex-col h-screen overflow-hidden">
      {/* ── Floating Header ── */}
      <header className="absolute top-0 left-0 right-0 z-50 p-4 pt-10 pointer-events-none">
        <div className="max-w-md md:max-w-3xl lg:max-w-5xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="pointer-events-auto bg-white/60 backdrop-blur-md p-3 rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.05)] border border-white hover:bg-white transition-all text-[#113A28]"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="pointer-events-auto bg-white/80 backdrop-blur-md px-5 py-2.5 rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.05)] border border-white flex items-center gap-2">
            <Radio
              size={14}
              className={cn(
                isConnected ? "text-[#4CAF50] animate-pulse" : "text-gray-400"
              )}
            />
            <h1 className="text-sm font-black tracking-widest uppercase text-[#113A28]">
              Live Field
            </h1>
          </div>
        </div>
      </header>

      {/* ── Map Section (45vh) ── */}
      <div className="h-[40vh] w-full relative z-0 shrink-0 shadow-[0_8px_32px_rgba(0,0,0,0.1)] bg-[#DBEDD9]">
        <MapComponent
          selectedNode={null}
          setSelectedNode={() => {}}
          nodeStatus={nodeStatus}
        />
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#DBEDD9] to-transparent z-[500] pointer-events-none" />
      </div>

      {/* ── Bottom Content ── */}
      <div className="flex-1 bg-[#DBEDD9] relative z-20 flex flex-col pt-2 pb-6 max-w-md md:max-w-3xl lg:max-w-5xl mx-auto w-full overflow-y-auto">
        {/* ── Connection Status Bar ── */}
        <div className="px-5 mb-3">
          <div
            className={cn(
              "rounded-[16px] p-3 flex items-center justify-between border transition-all",
              isConnected
                ? "bg-[#F4F9F4] border-[#E9F4EC]"
                : "bg-red-50 border-red-100"
            )}
          >
            <div className="flex items-center gap-2.5">
              {isConnected ? (
                <div className="w-8 h-8 rounded-[10px] bg-[#4CAF50]/10 flex items-center justify-center">
                  <Wifi size={16} className="text-[#4CAF50]" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-[10px] bg-red-100 flex items-center justify-center">
                  <WifiOff size={16} className="text-red-500" />
                </div>
              )}
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-[#113A28]">
                  ESP32-C6 Node
                </p>
                <p
                  className={cn(
                    "text-[10px] font-semibold",
                    isConnected ? "text-[#4CAF50]" : "text-red-500"
                  )}
                >
                  {isConnected
                    ? `Connected • Updated ${lastUpdateTime}`
                    : "Offline — Check USB connection"}
                </p>
              </div>
            </div>
            {isConnected && sensorData && (
              <span className="text-[10px] font-bold text-[#8DA697] bg-white px-2 py-1 rounded-lg">
                {formatUptime(sensorData.uptime)}
              </span>
            )}
          </div>
        </div>

        <AnimatePresence mode="wait">
            <motion.div
              key="live-data"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="px-5 space-y-3"
            >
              {/* ── Main Field Vitals Card ── */}
              <div className="bg-white rounded-[28px] p-5 border border-white shadow-[0_12px_32px_rgba(0,0,0,0.05)] relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-40 h-40 bg-[#4CAF50]/5 rounded-full blur-3xl pointer-events-none"></div>
                
                <h3 className="text-[11px] font-bold text-[#8DA697] uppercase tracking-[0.1em] mb-4">Core Vitals</h3>
                
                <div className="grid grid-cols-2 gap-4">
                    {/* Primary Metric: Soil Moisture */}
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <Droplets size={14} strokeWidth={2.5} className={isDry ? "text-red-500" : "text-[#2196F3]"} />
                            <span className="text-[11px] font-bold text-[#6C8576]">Soil Moisture</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className={cn("text-[38px] font-black leading-none font-outfit tracking-tighter", isDry ? "text-red-600" : "text-[#113A28]")}>
                                {sensorData.moisture}
                            </span>
                            <span className="text-[14px] font-bold text-[#6C8576]">%</span>
                        </div>
                        {/* Progress Bar */}
                        <div className="h-1.5 w-[90%] bg-gray-100 rounded-full mt-3 overflow-hidden">
                            <div 
                                className={cn("h-full rounded-full transition-all duration-1000", isDry ? "bg-red-500" : "bg-[#2196F3]")} 
                                style={{ width: `${Math.min(sensorData.moisture, 100)}%` }} 
                            />
                        </div>
                    </div>

                    {/* Secondary Metric: Temperature */}
                    <div className="flex flex-col border-l border-gray-100 pl-4">
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <Thermometer size={14} strokeWidth={2.5} className="text-orange-500" />
                            <span className="text-[11px] font-bold text-[#6C8576]">Soil Temp</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-[38px] font-black text-[#113A28] leading-none font-outfit tracking-tighter">
                                {sensorData.temp.toFixed(1)}
                            </span>
                            <span className="text-[14px] font-bold text-[#6C8576]">°C</span>
                        </div>
                    </div>
                </div>

                <div className="w-full h-px bg-gray-100/80 my-5" />

                {/* Secondary Grid */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-[#F8FBF8] rounded-[16px] p-3 border border-[#E9F4EC]">
                        <div className="flex items-center gap-1.5 mb-1">
                            <CloudRain size={12} strokeWidth={2.5} className="text-cyan-500" />
                            <span className="text-[9px] font-bold text-[#8DA697] uppercase tracking-wider">Humidity</span>
                        </div>
                        <span className="text-[16px] font-black text-[#113A28] font-outfit">{sensorData.humidity.toFixed(0)}<span className="text-[10px] text-[#6C8576] ml-0.5">%</span></span>
                    </div>
                    <div className={cn("rounded-[16px] p-3 border", isHighGas ? "bg-red-50 border-red-100" : "bg-[#F8FBF8] border-[#E9F4EC]")}>
                        <div className="flex items-center gap-1.5 mb-1">
                            <Flame size={12} strokeWidth={2.5} className={isHighGas ? "text-red-500" : "text-purple-500"} />
                            <span className="text-[9px] font-bold text-[#8DA697] uppercase tracking-wider">Gas</span>
                        </div>
                        <span className={cn("text-[16px] font-black font-outfit", isHighGas ? "text-red-600" : "text-[#113A28]")}>{sensorData.gas}<span className="text-[10px] text-[#6C8576] ml-0.5">ppm</span></span>
                    </div>
                    <div className="bg-[#F8FBF8] rounded-[16px] p-3 border border-[#E9F4EC]">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Gauge size={12} strokeWidth={2.5} className="text-blue-500" />
                            <span className="text-[9px] font-bold text-[#8DA697] uppercase tracking-wider">Raw ADC</span>
                        </div>
                        <span className="text-[16px] font-black text-[#113A28] font-outfit">{sensorData.moistureRaw}</span>
                    </div>
                </div>
              </div>

              {/* ── Pump Control ── */}
              <div className="bg-white rounded-[22px] p-4 border border-white shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-black text-[#113A28]">
                      Irrigation Pump
                    </p>
                    <p className="text-[10px] font-semibold text-[#8DA697]">
                      {isDry
                        ? "⚠️ Low moisture detected — watering recommended"
                        : sensorData.pump
                        ? "Pump is running (LED blinking)"
                        : "Soil moisture level is adequate"}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full",
                      sensorData.pump
                        ? "bg-blue-500 animate-pulse shadow-[0_0_12px_rgba(33,150,243,0.6)]"
                        : "bg-gray-200"
                    )}
                  />
                </div>

                <button
                  onClick={togglePump}
                  disabled={pumpLoading}
                  className={cn(
                    "w-full py-3 rounded-[14px] flex items-center justify-center gap-2 font-bold text-[13px] transition-all active:scale-[0.98] shadow-sm",
                    sensorData.pump
                      ? "bg-red-500 hover:bg-red-600 text-white"
                      : isDry
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-[#F4F9F4] hover:bg-[#E9F4EC] text-[#184F35]"
                  )}
                >
                  {pumpLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Power size={16} />
                  )}
                  {pumpLoading
                    ? "Sending..."
                    : sensorData.pump
                    ? "Stop Irrigation Pump"
                    : "Start Irrigation Pump"}
                </button>
              </div>

              {/* ── Alerts ── */}
              {(isDry || isHighGas) && (
                <div
                  className={cn(
                    "rounded-[18px] p-3.5 border flex items-start gap-2.5",
                    isDry && isHighGas
                      ? "bg-red-50 border-red-200"
                      : isDry
                      ? "bg-yellow-50 border-yellow-200"
                      : "bg-red-50 border-red-200"
                  )}
                >
                  <Wind
                    size={18}
                    className={cn(
                      "mt-0.5 shrink-0",
                      isDry ? "text-yellow-600" : "text-red-500"
                    )}
                  />
                  <div>
                    {isDry && (
                      <p className="text-xs font-bold text-yellow-900">
                        Low Soil Moisture ({sensorData.moisture}%) — Crop
                        stress risk
                      </p>
                    )}
                    {isHighGas && (
                      <p className="text-xs font-bold text-red-900 mt-1">
                        High CO Level ({sensorData.gas} ppm) — Check ventilation
                      </p>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
        </AnimatePresence>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .thin-scrollbar::-webkit-scrollbar { width: 4px; }
        .thin-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .thin-scrollbar::-webkit-scrollbar-thumb { background-color: #B7D8C6; border-radius: 10px; }
      `,
        }}
      />
    </div>
  );
}
