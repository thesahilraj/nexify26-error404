"use client";

import { useEffect, useState } from "react";
import { CloudRain, Droplets, Wind, Sun, Cloud, Moon, CloudSnow, CloudLightning, Loader2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/LanguageContext";

type HourlyData = {
    timeKey: string;
    time: string;
    temp: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    icon: any;
};

type WeatherInfo = {
    temp: number;
    condition: string;
    feelsLike: number;
    humidity: number;
    windKph: number;
    hourly: HourlyData[];
    isDay: boolean;
    location: string;
};

function getWeatherIcon(condition: string, isDay: boolean) {
    const c = condition.toLowerCase();
    if (c.includes("rain") || c.includes("drizzle") || c.includes("shower")) return CloudRain;
    if (c.includes("snow") || c.includes("sleet") || c.includes("ice")) return CloudSnow;
    if (c.includes("thunder")) return CloudLightning;
    if (c.includes("cloud") || c.includes("overcast")) return Cloud;
    return isDay ? Sun : Moon;
}

export function AdvancedWeatherWidget() {
    const { t } = useLanguage();
    const [weather, setWeather] = useState<WeatherInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [espMoisture, setEspMoisture] = useState<number | null>(null);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        const fetchEspData = async () => {
            try {
                const res = await fetch("http://192.168.4.1/status", { cache: "no-store", mode: "cors" });
                if (res.ok) {
                    const data = await res.json();
                    setEspMoisture(data.moisture);
                } else {
                    setEspMoisture(null);
                }
            } catch (err) {
                // Ignore silent fetch errors when not connected to ESP32 AP
                setEspMoisture(null);
            }
        };
        fetchEspData();
        interval = setInterval(fetchEspData, 2000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const fetchWeather = async (query: string) => {
            try {
                const res = await fetch(`/api/weather?q=${encodeURIComponent(query)}`);
                if (!res.ok) throw new Error("Weather fetch failed");
                const data = await res.json();

                const current = data.current;
                const forecastDays = data.forecast.forecastday;

                // Collect hours from today and tomorrow
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const allHours: any[] = [];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                forecastDays.forEach((day: any) => {
                    allHours.push(...day.hour);
                });

                const nowEpoch = current.last_updated_epoch;
                // Find next 5 hours (including current hour)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const futureHours = allHours.filter((h: any) => h.time_epoch >= nowEpoch - 3600).slice(0, 5);

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const hourly: HourlyData[] = futureHours.map((h: any, index: number) => {
                    const date = new Date(h.time_epoch * 1000);
                    const hours = date.getHours();
                    const ampm = hours >= 12 ? 'PM' : 'AM';
                    const displayHours = hours % 12 || 12;
                    const timeStr = `${displayHours} ${ampm}`;

                    return {
                        timeKey: index === 0 ? "now" : "",
                        time: timeStr,
                        temp: Math.round(h.temp_c),
                        icon: getWeatherIcon(h.condition.text, h.is_day === 1)
                    };
                });

                setWeather({
                    temp: Math.round(current.temp_c),
                    condition: current.condition.text,
                    feelsLike: Math.round(current.feelslike_c),
                    humidity: current.humidity,
                    windKph: Math.round(current.wind_kph),
                    hourly,
                    isDay: current.is_day === 1,
                    location: "Sushant University"
                });
            } catch (e) {
                console.error("Failed to load weather:", e);
            } finally {
                setLoading(false);
            }
        };

        if (!navigator.geolocation) {
            fetchWeather("New Delhi"); // Fallback
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                fetchWeather(`${position.coords.latitude},${position.coords.longitude}`);
            },
            () => {
                fetchWeather("New Delhi"); // Fallback on permission denied
            }
        );
    }, []);

    if (loading || !weather) {
        return (
            <div className="bg-white rounded-[18px] p-4 flex items-center justify-center min-h-[60px] border border-[#E9F4EC] shadow-sm">
                <Loader2 className="animate-spin text-[#184F35]" size={20} />
            </div>
        );
    }

    const MainIcon = getWeatherIcon(weather.condition, weather.isDay);

    return (
        <div className="bg-white text-[#113A28] rounded-[18px] px-4 py-3 shadow-[0_2px_12px_rgba(17,58,40,0.03)] relative border border-[#E9F4EC] group overflow-hidden flex items-center justify-between font-outfit">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-[#4CAF50]/10 to-transparent blur-xl rounded-full mix-blend-multiply opacity-50 transition pointer-events-none"></div>

            <div className="flex items-center gap-3 relative z-10">
                <MainIcon size={26} strokeWidth={2.5} className="text-[#F29C38]" />
                <div className="flex flex-col">
                    <div className="flex items-baseline gap-2">
                        <span className="text-[26px] font-bold tracking-tight leading-none text-[#184F35]">
                            {weather.temp}°
                        </span>
                        <span className="text-[13px] font-semibold text-[#6C8576] capitalize leading-none pt-0.5">
                            {weather.condition}
                        </span>
                    </div>
                    {weather.location && (
                        <div className="flex items-center gap-1 text-[#8DA697] font-bold text-[9px] uppercase tracking-[0.05em] mt-1.5 opacity-80">
                            <MapPin size={9} className="text-[#4CAF50]" strokeWidth={2.5} />
                            {weather.location}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-3.5 text-right relative z-10">
                <div className="flex flex-col items-end gap-0.5" title={espMoisture !== null ? "Live ESP Moisture" : "Humidity"}>
                    <div className="flex items-center gap-1">
                        <span className="text-[12px] font-bold text-[#113A28] flex items-center gap-1">
                            {espMoisture !== null ? `${espMoisture}%` : `${weather.humidity}%`}
                            {espMoisture !== null && <span className="w-1 h-1 rounded-full bg-[#4CAF50] animate-pulse" />}
                        </span>
                    </div>
                    <Droplets size={12} strokeWidth={2} className="text-[#4CAF50] opacity-70" />
                </div>
                <div className="w-[1px] h-6 bg-[#E9F4EC]"></div>
                <div className="flex flex-col items-end gap-0.5">
                    <span className="text-[12px] font-bold text-[#113A28]">
                        {weather.windKph} <span className="text-[9px] font-medium opacity-60">km/h</span>
                    </span>
                    <Wind size={12} strokeWidth={2} className="text-[#5D87FF] opacity-70" />
                </div>
            </div>
        </div>
    );
}
