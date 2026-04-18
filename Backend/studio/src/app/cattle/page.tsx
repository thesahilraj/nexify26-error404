"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  HeartPulse,
  Thermometer,
  Activity,
  Wifi,
  WifiOff,
  Wind,
  Zap,
  CircleDot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const CattleMapComponent = dynamic(
  () => import("@/components/CattleMapComponent"),
  { ssr: false }
);

// ── Types ──
interface CattleSensorData {
  heartRate: number;
  spo2: number;
  bodyTemp: number;
  ax: number;
  ay: number;
  az: number;
  gx: number;
  gy: number;
  gz: number;
  magnitude: number;
  activity: string;
  fingerDetected: boolean;
  irValue: number;
  uptime: number;
}

interface CattleApiResponse {
  data: CattleSensorData | null;
  connected: boolean;
  lastUpdate: number;
}

// ── Live Line Graph Component ──
function AccelGraph({ history }: { history: number[] }) {
  if (history.length < 2) return null;

  const width = 320;
  const height = 64;
  const padding = 4;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;

  const maxVal = Math.max(...history, 2.0);
  const minVal = Math.min(...history, 0);
  const range = maxVal - minVal || 1;

  const points = history
    .map((val, i) => {
      const x = padding + (i / (history.length - 1)) * graphWidth;
      const y = padding + graphHeight - ((val - minVal) / range) * graphHeight;
      return `${x},${y}`;
    })
    .join(" ");

  // Gradient fill below the line
  const lastX = padding + graphWidth;
  const firstX = padding;
  const fillPoints = `${firstX},${height} ${points} ${lastX},${height}`;

  // Current value for the dot
  const latestVal = history[history.length - 1];
  const latestX = lastX;
  const latestY =
    padding + graphHeight - ((latestVal - minVal) / range) * graphHeight;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ height: "64px" }}
    >
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map((pct) => (
        <line
          key={pct}
          x1={padding}
          y1={padding + graphHeight * pct}
          x2={width - padding}
          y2={padding + graphHeight * pct}
          stroke="rgba(0,0,0,0.04)"
          strokeWidth="1"
          strokeDasharray="4,4"
        />
      ))}

      {/* Fill gradient */}
      <defs>
        <linearGradient id="accelGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4CAF50" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#4CAF50" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPoints} fill="url(#accelGrad)" />

      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke="#4CAF50"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Current value dot */}
      <circle cx={latestX} cy={latestY} r="4" fill="#4CAF50" />
      <circle
        cx={latestX}
        cy={latestY}
        r="8"
        fill="#4CAF50"
        opacity="0.2"
      >
        <animate
          attributeName="r"
          values="6;10;6"
          dur="1.5s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.3;0;0.3"
          dur="1.5s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );
}

// ── Pulsing Heart Icon ──
function PulsingHeart({ bpm }: { bpm: number }) {
  const animationDuration = bpm > 0 ? 60 / bpm : 1;

  return (
    <div className="relative">
      <HeartPulse
        size={20}
        className="text-red-500"
        style={
          bpm > 0
            ? {
                animation: `heartbeat ${animationDuration}s ease-in-out infinite`,
              }
            : {}
        }
      />
    </div>
  );
}

// ── Vitals Card ──
function VitalCard({
  icon,
  label,
  value,
  unit,
  bgColor,
  iconBg,
  iconColor,
  isAlert = false,
  subtitle,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  bgColor: string;
  iconBg: string;
  iconColor: string;
  isAlert?: boolean;
  subtitle?: string;
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
        <div className={cn("p-2 rounded-[12px]", iconBg)}>{icon}</div>
        <div className="min-w-0 flex-1">
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
          {subtitle && (
            <p className="text-[9px] font-semibold text-[#8DA697] mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  Main Cattle Page
// ═══════════════════════════════════════════════

export default function CattleManagementPage() {
  const [sensorData, setSensorData] = useState<CattleSensorData>({
    heartRate: 0,
    spo2: 0,
    bodyTemp: 0,
    ax: 0,
    ay: 0,
    az: 0,
    gx: 0,
    gy: 0,
    gz: 0,
    magnitude: 0,
    activity: "resting",
    fingerDetected: false,
    irValue: 0,
    uptime: 0
  });
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>("");
  const [isClient, setIsClient] = useState(false);

  // History for accelerometer graph
  const accelHistoryRef = useRef<number[]>([]);
  const [accelHistory, setAccelHistory] = useState<number[]>([]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // ── Fetch sensor data every 1 second ──
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/cattle", { cache: "no-store" });
      if (res.ok) {
        const result: CattleApiResponse = await res.json();
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

          // Update accelerometer history
          const mag = result.data.magnitude;
          accelHistoryRef.current = [
            ...accelHistoryRef.current.slice(-39),
            mag,
          ];
          setAccelHistory([...accelHistoryRef.current]);
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
    const interval = setInterval(fetchData, 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (!isClient) return null;

  // ── Health Status Calculation ──
  const getHealthStatus = (): {
    status: "healthy" | "warning" | "critical";
    reason: string;
  } => {
    if (!sensorData || !isConnected)
      return { status: "warning", reason: "Device offline" };

    if (sensorData.bodyTemp > 39.5)
      return {
        status: "critical",
        reason: `High fever: ${sensorData.bodyTemp.toFixed(1)}°C`,
      };
    if (
      sensorData.heartRate > 100 &&
      sensorData.fingerDetected
    )
      return {
        status: "critical",
        reason: `Abnormal heart rate: ${sensorData.heartRate} BPM`,
      };
    if (sensorData.bodyTemp > 39.0)
      return {
        status: "warning",
        reason: `Elevated temperature: ${sensorData.bodyTemp.toFixed(1)}°C`,
      };
    if (sensorData.spo2 > 0 && sensorData.spo2 < 95)
      return {
        status: "warning",
        reason: `Low SpO2: ${sensorData.spo2}%`,
      };

    return { status: "healthy", reason: "All vitals normal" };
  };

  const health = getHealthStatus();
  const isMoving =
    sensorData?.activity === "walking" ||
    sensorData?.activity === "running";

  // Map data for single cattle marker
  const cowMapData = [
    {
      id: "band-001",
      lat: 29.9695,
      lng: 76.8226,
      status: health.status,
    },
  ];

  const centerPos: [number, number] = [29.9695, 76.8226];

  // ── Activity Colors ──
  const activityConfig: Record<
    string,
    { color: string; bg: string; icon: typeof Activity }
  > = {
    resting: { color: "text-[#4CAF50]", bg: "bg-green-50", icon: CircleDot },
    walking: { color: "text-[#2196F3]", bg: "bg-blue-50", icon: Activity },
    running: { color: "text-[#FF9800]", bg: "bg-orange-50", icon: Zap },
  };

  const activityCfg =
    activityConfig[sensorData?.activity || "resting"] ||
    activityConfig.resting;

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
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                isConnected
                  ? "bg-blue-500 animate-pulse"
                  : "bg-gray-400"
              )}
            />
            <h1 className="text-sm font-black tracking-widest uppercase text-[#113A28]">
              Livestock Band
            </h1>
          </div>
        </div>
      </header>

      {/* ── Map Section (40vh) ── */}
      <div className="h-[40vh] w-full relative z-0 shrink-0 shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
        <CattleMapComponent
          cows={cowMapData}
          selectedCow={null}
          setSelectedCow={() => {}}
          centerPos={centerPos}
        />
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#DBEDD9] to-transparent z-[10] pointer-events-none" />

        {/* Activity Banner on Map */}
        {isConnected && sensorData && isMoving && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[20] bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-white flex items-center gap-2"
          >
            <Activity
              size={14}
              className={cn(
                sensorData.activity === "running"
                  ? "text-orange-500"
                  : "text-blue-500",
                "animate-pulse"
              )}
            />
            <span className="text-xs font-black uppercase tracking-wider text-[#113A28]">
              {sensorData.activity === "running"
                ? "🏃 Running Detected"
                : "🚶 Movement Detected"}
            </span>
          </motion.div>
        )}
      </div>

      {/* ── Bottom Content ── */}
      <div className="flex-1 bg-[#DBEDD9] relative z-20 flex flex-col pt-2 pb-6 max-w-md md:max-w-3xl lg:max-w-5xl mx-auto w-full overflow-y-auto thin-scrollbar">
        {/* ── Connection Status Bar ── */}
        <div className="px-5 mb-3">
          <div
            className={cn(
              "rounded-[16px] p-3 flex items-center justify-between border transition-all",
              isConnected
                ? health.status === "critical"
                  ? "bg-red-50 border-red-200"
                  : health.status === "warning"
                  ? "bg-yellow-50 border-yellow-200"
                  : "bg-[#F4F9F4] border-[#E9F4EC]"
                : "bg-red-50 border-red-100"
            )}
          >
            <div className="flex items-center gap-2.5">
              {isConnected ? (
                <div
                  className={cn(
                    "w-8 h-8 rounded-[10px] flex items-center justify-center",
                    health.status === "critical"
                      ? "bg-red-100"
                      : health.status === "warning"
                      ? "bg-yellow-100"
                      : "bg-[#4CAF50]/10"
                  )}
                >
                  <Wifi
                    size={16}
                    className={
                      health.status === "critical"
                        ? "text-red-500"
                        : health.status === "warning"
                        ? "text-yellow-600"
                        : "text-[#4CAF50]"
                    }
                  />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-[10px] bg-red-100 flex items-center justify-center">
                  <WifiOff size={16} className="text-red-500" />
                </div>
              )}
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-[#113A28]">
                  BAND-001 • ESP32-C3
                </p>
                <p
                  className={cn(
                    "text-[10px] font-semibold",
                    isConnected
                      ? health.status === "critical"
                        ? "text-red-600"
                        : health.status === "warning"
                        ? "text-yellow-600"
                        : "text-[#4CAF50]"
                      : "text-red-500"
                  )}
                >
                  {isConnected ? health.reason : "Offline — Check USB"}
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
              key="live-cattle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="px-5 space-y-3"
            >
              {/* ── Main Cattle Vitals Card ── */}
              <div className="bg-white rounded-[28px] p-5 border border-white shadow-[0_12px_32px_rgba(0,0,0,0.05)] relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-40 h-40 bg-red-500/5 rounded-full blur-3xl pointer-events-none"></div>
                
                <h3 className="text-[11px] font-bold text-[#8DA697] uppercase tracking-[0.1em] mb-4">Core Vitals</h3>
                
                <div className="grid grid-cols-2 gap-4">
                    {/* Primary Metric: Heart Rate */}
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <PulsingHeart bpm={sensorData.fingerDetected ? sensorData.heartRate : 0} />
                            <span className="text-[11px] font-bold text-[#6C8576]">Heart Rate</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className={cn("text-[38px] font-black leading-none font-outfit tracking-tighter", (sensorData.heartRate > 100 && sensorData.fingerDetected) ? "text-red-600" : "text-[#113A28]")}>
                                {sensorData.fingerDetected && sensorData.heartRate > 0 ? sensorData.heartRate : "--"}
                            </span>
                            <span className="text-[14px] font-bold text-[#6C8576]">bpm</span>
                        </div>
                        {/* Status Label */}
                        <div className="mt-2 text-[10px] font-bold text-[#8DA697]">
                             {sensorData.fingerDetected ? "Stable rhythm" : "No contact"}
                        </div>
                    </div>

                    {/* Secondary Metric: SpO2 */}
                    <div className="flex flex-col border-l border-gray-100 pl-4">
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <Wind size={14} strokeWidth={2.5} className="text-indigo-500" />
                            <span className="text-[11px] font-bold text-[#6C8576]">Oxygen (SpO2)</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className={cn("text-[38px] font-black leading-none font-outfit tracking-tighter", (sensorData.spo2 > 0 && sensorData.spo2 < 95) ? "text-yellow-600" : "text-[#113A28]")}>
                                {sensorData.fingerDetected && sensorData.spo2 > 0 ? sensorData.spo2 : "--"}
                            </span>
                            <span className="text-[14px] font-bold text-[#6C8576]">%</span>
                        </div>
                    </div>
                </div>

                <div className="w-full h-px bg-gray-100/80 my-5" />

                {/* Secondary Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <div className={cn("rounded-[16px] p-3 border", sensorData.bodyTemp > 39.5 ? "bg-red-50 border-red-100" : "bg-[#F8FBF8] border-[#E9F4EC]")}>
                        <div className="flex items-center gap-1.5 mb-1">
                            <Thermometer size={12} strokeWidth={2.5} className={sensorData.bodyTemp > 39.5 ? "text-red-500 animate-pulse" : "text-teal-500"} />
                            <span className="text-[9px] font-bold text-[#8DA697] uppercase tracking-wider">Body Temp</span>
                        </div>
                        <span className={cn("text-[18px] font-black font-outfit", sensorData.bodyTemp > 39.5 ? "text-red-600" : "text-[#113A28]")}>
                            {sensorData.bodyTemp > 0 ? sensorData.bodyTemp.toFixed(1) : "--"}
                            <span className="text-[12px] text-[#6C8576] ml-0.5">°C</span>
                        </span>
                    </div>
                    <div className={cn("rounded-[16px] p-3 border bg-[#F8FBF8] border-[#E9F4EC]")}>
                        <div className="flex items-center gap-1.5 mb-1">
                            <activityCfg.icon size={12} strokeWidth={2.5} className={cn(activityCfg.color, isMoving && "animate-pulse")} />
                            <span className="text-[9px] font-bold text-[#8DA697] uppercase tracking-wider">Activity</span>
                        </div>
                        <span className="text-[18px] font-black text-[#113A28] font-outfit capitalize overflow-hidden text-ellipsis whitespace-nowrap block">
                            {sensorData.activity}
                        </span>
                    </div>
                </div>
              </div>

              {/* ── Motion Graph ── */}
              <div className="bg-white rounded-[22px] p-4 border border-white shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-black text-[#113A28]">
                      Motion Tracking
                    </p>
                    <p className="text-[10px] font-semibold text-[#8DA697]">
                      Accelerometer magnitude (g-force) over time
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full",
                      isMoving
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-500"
                    )}
                  >
                    {isMoving ? "ACTIVE" : "IDLE"}
                  </span>
                </div>

                <div className="bg-[#FAFFF9] rounded-[14px] p-2 border border-[#E9F4EC]">
                  {accelHistory.length > 1 ? (
                    <AccelGraph history={accelHistory} />
                  ) : (
                    <div className="h-16 flex items-center justify-center">
                      <p className="text-[10px] font-bold text-[#8DA697]">
                        Collecting data...
                      </p>
                    </div>
                  )}
                </div>

                {/* Axis Values */}
                <div className="flex items-center justify-between mt-2.5 px-1">
                  {[
                    {
                      label: "X",
                      value: sensorData.ax,
                      color: "text-red-500",
                    },
                    {
                      label: "Y",
                      value: sensorData.ay,
                      color: "text-green-500",
                    },
                    {
                      label: "Z",
                      value: sensorData.az,
                      color: "text-blue-500",
                    },
                  ].map((axis) => (
                    <div
                      key={axis.label}
                      className="flex items-center gap-1.5"
                    >
                      <span
                        className={cn(
                          "text-[10px] font-black",
                          axis.color
                        )}
                      >
                        {axis.label}
                      </span>
                      <span className="text-[11px] font-bold text-[#113A28] font-mono">
                        {axis.value.toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div className="w-px h-4 bg-gray-200" />
                  {[
                    {
                      label: "GX",
                      value: sensorData.gx,
                      color: "text-pink-500",
                    },
                    {
                      label: "GY",
                      value: sensorData.gy,
                      color: "text-amber-500",
                    },
                    {
                      label: "GZ",
                      value: sensorData.gz,
                      color: "text-violet-500",
                    },
                  ].map((axis) => (
                    <div
                      key={axis.label}
                      className="flex items-center gap-1"
                    >
                      <span
                        className={cn(
                          "text-[9px] font-black",
                          axis.color
                        )}
                      >
                        {axis.label}
                      </span>
                      <span className="text-[10px] font-bold text-[#8DA697] font-mono">
                        {axis.value.toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Raw Sensor Debug Card ── */}
              <div className="bg-white/60 rounded-[18px] p-3.5 border border-white/80">
                <p className="text-[10px] font-bold text-[#8DA697] uppercase tracking-wider mb-2">
                  Sensor Status
                </p>
                <div className="flex flex-wrap gap-2">
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full",
                      sensorData.fingerDetected
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    )}
                  >
                    MAX30102:{" "}
                    {sensorData.fingerDetected ? "Contact" : "No contact"}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                    MPU6500: Active
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full",
                      sensorData.bodyTemp > 0
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    )}
                  >
                    DS18B20:{" "}
                    {sensorData.bodyTemp > 0 ? "Reading" : "Waiting"}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    IR: {sensorData.irValue}
                  </span>
                </div>
              </div>
            </motion.div>
        </AnimatePresence>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          15% { transform: scale(1.3); }
          30% { transform: scale(1); }
          45% { transform: scale(1.15); }
          60% { transform: scale(1); }
        }
        .thin-scrollbar::-webkit-scrollbar { width: 4px; }
        .thin-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .thin-scrollbar::-webkit-scrollbar-thumb { background-color: #B7D8C6; border-radius: 10px; }
      `,
        }}
      />
    </div>
  );
}
