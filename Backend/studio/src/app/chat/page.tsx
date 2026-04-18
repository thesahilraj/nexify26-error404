"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Send, Loader2, Bot, User, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";

export default function ChatPage() {
    const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { t } = useLanguage();

    useEffect(() => { 
        if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" }); 
    }, [messages, isLoading]);
    
    useEffect(() => { 
        if (textareaRef.current) { 
            textareaRef.current.style.height = "auto"; 
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px"; 
        } 
    }, [input]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;
        const userMsg = input.trim();
        const newMessages = [...messages, { role: "user", content: userMsg }];
        setMessages(newMessages);
        setInput("");
        setIsLoading(true);

        try {
            const baseUrl = typeof window !== "undefined" && window.location.origin !== "null" && window.location.origin !== "file://" 
                ? window.location.origin 
                : "";
            
            let res;
            try {
                res = await fetch(`${baseUrl}/api/chat`, { 
                    method: "POST", 
                    headers: { "Content-Type": "application/json" }, 
                    body: JSON.stringify({ messages: newMessages }) 
                });
            } catch (networkErr: any) {
                console.warn("First fetch failed, retrying (Turbopack hot-reload drops):", networkErr.message);
                await new Promise(resolve => setTimeout(resolve, 1500));
                res = await fetch(`${baseUrl}/api/chat`, { 
                    method: "POST", 
                    headers: { "Content-Type": "application/json" }, 
                    body: JSON.stringify({ messages: newMessages }) 
                });
            }

            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || "Server error");
            
            const assistantContent = data.message?.content || "No response.";
            setMessages(prev => [...prev, { role: "assistant", content: assistantContent }]);
        } catch (err: any) {
            console.error(err);
            setMessages(prev => [...prev, { role: "assistant", content: `⚠️ ${err.message || "Could not connect to Dr. Farm AI."}` }]);
        } finally { 
            setIsLoading(false); 
        }
    };

    const clearChat = () => setMessages([]);

    return (
        <div className="flex flex-col h-[100dvh] bg-[#F4F9F4] text-[#1B4332] font-sans">
            <header className="flex items-center justify-between px-5 py-4 bg-white/80 backdrop-blur-md border-b border-[#E9F4EC] z-10 sticky top-0 shadow-sm">
                <div className="flex items-center gap-3">
                    <Link href="/" className="w-10 h-10 rounded-full bg-[#F4F9F4] flex items-center justify-center hover:bg-[#E8EEEA] transition-colors active:scale-95">
                        <ArrowLeft className="w-5 h-5 text-[#113A28]" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#DBEDD9] flex items-center justify-center border border-[#B7D8C6] overflow-hidden">
                            <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Dr Farm3&backgroundColor=transparent" alt="AI" className="w-8 h-8 object-contain" />
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-[17px] font-extrabold text-[#113A28] leading-none">{t("dr_farm_ai") || "Dr. Farm AI"}</h1>
                            <div className="text-[11px] font-bold text-[#6C8576] flex items-center gap-1 mt-1">
                                <span className={`w-1.5 h-1.5 rounded-full bg-[#4CAF50] animate-pulse`}></span>
                                {isLoading ? "Thinking..." : "Online"}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {messages.length > 0 && (
                        <button onClick={clearChat} className="w-10 h-10 rounded-full bg-white border border-[#E9F4EC] shadow-sm flex items-center justify-center hover:bg-red-50 transition-colors active:scale-95">
                            <Trash2 className="w-4 h-4 text-[#6C8576]" />
                        </button>
                    )}
                </div>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-6">
                <div className="max-w-md md:max-w-3xl lg:max-w-5xl mx-auto space-y-5">
                    {messages.length === 0 && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center text-center py-10 space-y-4">
                            <div className="w-20 h-20 bg-[#DBEDD9] rounded-full flex items-center justify-center mb-2 shadow-sm">
                                <Bot className="w-10 h-10 text-[#184F35]" />
                            </div>
                            <h2 className="text-[20px] font-black text-[#113A28]">
                                Smart Assistant
                            </h2>
                            <p className="text-[14px] font-medium text-[#6C8576] max-w-[260px]">
                                Ask questions or command the water pump directly!
                            </p>

                            <div className="flex flex-wrap gap-2 mt-4 justify-center">
                                {["Turn ON the water pump", "Turn OFF the water pump", "What crops should I plant?", "Give me soil tips"].map(q => (
                                    <button key={q} onClick={() => setInput(q)} className="bg-white border border-[#E9F4EC] rounded-full px-4 py-2 text-[13px] font-bold text-[#184F35] hover:bg-[#DBEDD9] transition-colors shadow-sm active:scale-95">
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {messages.map((msg, idx) => (
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.2 }} key={idx} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.role === "user" ? "bg-[#184F35]" : "bg-[#DBEDD9] border border-[#B7D8C6]"}`}>
                                {msg.role === "user" ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-[#184F35]" />}
                            </div>
                            <div className={`max-w-[78%] px-4 py-3 rounded-[20px] whitespace-pre-wrap ${msg.role === "user" ? "bg-[#184F35] text-white rounded-tr-[4px] shadow-sm" : "bg-white text-[#113A28] border border-[#E9F4EC] rounded-tl-[4px] shadow-[0_4px_12px_rgba(0,0,0,0.03)]"}`}>
                                <p className="text-[14.5px] font-medium leading-[1.6]">{msg.content}</p>
                            </div>
                        </motion.div>
                    ))}

                    {isLoading && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#DBEDD9] border border-[#B7D8C6] flex items-center justify-center shrink-0 mt-1"><Bot className="w-4 h-4 text-[#184F35]" /></div>
                            <div className="bg-white border border-[#E9F4EC] rounded-[20px] rounded-tl-[4px] px-5 py-4 shadow-sm flex items-center gap-1.5 h-[50px]">
                                <motion.div animate={{y:[0,-4,0]}} transition={{repeat:Infinity, duration:0.6, delay:0}} className="w-2 h-2 rounded-full bg-[#B7D8C6]" />
                                <motion.div animate={{y:[0,-4,0]}} transition={{repeat:Infinity, duration:0.6, delay:0.2}} className="w-2 h-2 rounded-full bg-[#B7D8C6]" />
                                <motion.div animate={{y:[0,-4,0]}} transition={{repeat:Infinity, duration:0.6, delay:0.4}} className="w-2 h-2 rounded-full bg-[#B7D8C6]" />
                            </div>
                        </motion.div>
                    )}
                    <div ref={bottomRef} className="h-4" />
                </div>
            </div>

            <div className="bg-white px-4 py-3 pb-6 border-t border-[#E9F4EC] z-10 shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
                <div className="max-w-md md:max-w-3xl lg:max-w-5xl mx-auto relative flex items-end bg-[#F4F9F4] rounded-[24px] pr-2 pl-4 py-1.5 border border-[#E9F4EC] shadow-inner focus-within:border-[#B7D8C6] focus-within:ring-2 focus-within:ring-[#B7D8C6]/20 transition-all">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                        placeholder="Type a message or command..."
                        className="flex-1 max-h-[120px] min-h-[44px] bg-transparent resize-none outline-none py-3 text-[15px] font-medium text-[#113A28] placeholder-[#8DA697]"
                        rows={1}
                        disabled={isLoading}
                    />
                    <button onClick={handleSend} disabled={!input.trim() || isLoading} className="w-[44px] h-[44px] shrink-0 rounded-[18px] bg-[#184F35] flex items-center justify-center ml-2 text-white disabled:opacity-50 disabled:bg-[#B7D8C6] hover:bg-[#123926] transition-colors shadow-sm mb-0.5 active:scale-95">
                        {isLoading ? <Loader2 className="w-[18px] h-[18px] animate-spin" /> : <Send className="w-[18px] h-[18px] ml-0.5" />}
                    </button>
                </div>
                <div className="text-center mt-2">
                    <p className="text-[10px] font-bold text-[#8DA697] uppercase tracking-wider">
                        Powered by Google Gemini
                    </p>
                </div>
            </div>
        </div>
    );
}
