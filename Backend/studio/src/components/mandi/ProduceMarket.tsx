"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, ShieldCheck, Star, ShoppingBag, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Dummy data
const PRODUCE_LISTINGS = [
  {
    id: 1,
    title: "Organic Basmati Rice",
    price: 80,
    unit: "kg",
    seller: "Ramesh Singh",
    location: "Karnal, Haryana",
    distance: 12,
    category: "Grain",
    quantity: "1000",
    emoji: "🌾",
    verified: true,
    rating: 4.8,
    reviews: 124,
  },
  {
    id: 2,
    title: "Fresh Mustard Seeds",
    price: 5500,
    unit: "quintal",
    seller: "Suresh Yadav",
    location: "Rewari, Haryana",
    distance: 45,
    category: "Oilseed",
    quantity: "50",
    emoji: "🌱",
    verified: true,
    rating: 4.9,
    reviews: 89,
  },
  {
    id: 3,
    title: "Premium Sugarcane",
    price: 380,
    unit: "quintal",
    seller: "Vikram Jat",
    location: "Yamunanagar, Haryana",
    distance: 80,
    category: "Cash Crop",
    quantity: "20",
    emoji: "🎋",
    verified: false,
    rating: 4.5,
    reviews: 32,
  },
  {
    id: 4,
    title: "Fresh Red Tomatoes",
    price: 40,
    unit: "kg",
    seller: "Amit Kumar",
    location: "Kurukshetra, Haryana",
    distance: 5,
    category: "Vegetable",
    quantity: "500",
    emoji: "🍅",
    verified: true,
    rating: 4.7,
    reviews: 210,
  },
  {
    id: 5,
    title: "Golden Wheat Grains",
    price: 2500,
    unit: "quintal",
    seller: "Sukhwinder Singh",
    location: "Ludhiana, Punjab",
    distance: 120,
    category: "Grain",
    quantity: "10",
    emoji: "🌾",
    verified: true,
    rating: 4.9,
    reviews: 450,
  }
];

const CATEGORIES = ["All", "Grain", "Vegetable", "Fruit", "Cash Crop", "Oilseed"];

export function ProduceMarket() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedListing, setSelectedListing] = useState<number | null>(null);

  const filteredListings = PRODUCE_LISTINGS.filter(l => {
    const matchesCategory = activeCategory === "All" || l.category === activeCategory;
    const matchesSearch = !searchQuery || l.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Category Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "px-4 py-2 rounded-full text-[12px] font-bold transition-all whitespace-nowrap shrink-0",
              activeCategory === cat
                ? "bg-[#184F35] text-white shadow-md"
                : "bg-white text-[#6C8576] border border-[#E9F4EC] hover:bg-[#F4F9F4]"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8DA697]" />
        <input
          type="text"
          placeholder="Search fresh produce..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-[14px] bg-white border border-[#E9F4EC] text-[13px] font-semibold text-[#113A28] placeholder-[#8DA697] outline-none focus:border-[#184F35] transition-all shadow-sm"
        />
      </div>

      <div className="py-2">
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-emerald-50 rounded-[16px] p-4 border border-emerald-100 flex items-start gap-3 shadow-sm mb-4"
        >
            <ShieldCheck size={20} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
                <p className="text-[12px] font-black text-emerald-900">Fair Trade Guarantee</p>
                <p className="text-[10px] font-medium text-emerald-700 leading-relaxed mt-1">
                    All payments are securely held in escrow. Funds are only released to the farmer once produce is verified on delivery. Quality assured.
                </p>
            </div>
        </motion.div>
      </div>

      {/* Listings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8 space-y-0">
        {filteredListings.map((listing, i) => (
          <motion.div
            key={listing.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-[20px] p-4 border border-[#E9F4EC] shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all cursor-pointer group"
            onClick={() => setSelectedListing(selectedListing === listing.id ? null : listing.id)}
          >
            <div className="flex items-start gap-3">
              {/* Emoji Avatar */}
              <div className="w-16 h-16 rounded-[16px] bg-[#F4F9F4] border border-[#E9F4EC] flex items-center justify-center text-[32px] shrink-0 group-hover:scale-105 transition-transform duration-300 shadow-inner">
                {listing.emoji}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="text-[15px] font-extrabold text-[#113A28] leading-tight truncate">{listing.title}</h4>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="bg-[#F4F9F4] text-[#184F35] px-2 py-0.5 rounded-[6px] text-[9px] font-black tracking-widest uppercase border border-[#E9F4EC]">
                        {listing.category}
                      </span>
                      {listing.verified && (
                        <span className="flex items-center gap-0.5 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-[6px]">
                          <ShieldCheck size={10} />
                          <span className="text-[9px] font-black uppercase tracking-wider">Secured</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-baseline gap-0.5">
                        <span className="text-[18px] font-black text-[#184F35] font-outfit">₹{listing.price.toLocaleString("en-IN")}</span>
                        <span className="text-[10px] font-bold text-[#8DA697]">/{listing.unit}</span>
                    </div>
                    <div className="text-[10px] font-bold text-[#8DA697] mt-0.5">{listing.quantity} {listing.unit}s avl.</div>
                  </div>
                </div>

                {/* Bottom row */}
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[11px] font-black text-[#113A28]">
                      {listing.seller}
                    </span>
                    <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600">
                      <Star size={10} className="fill-amber-500 text-amber-500" /> {listing.rating} <span className="text-gray-400 font-medium">({listing.reviews})</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-[#8DA697]">
                    <MapPin size={10} className="text-[#4CAF50]" /> {listing.distance} km away
                  </div>
                </div>

                <AnimatePresence>
                    {selectedListing === listing.id && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mt-4 pt-4 border-t border-[#E9F4EC] overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex gap-2">
                                <button className="flex-1 bg-[#184F35] hover:bg-[#123926] text-white py-3 rounded-[12px] font-bold text-[13px] transition-all shadow-md flex items-center justify-center gap-2">
                                    <ShoppingBag size={16} /> Buy Securely
                                </button>
                                <button className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-4 py-3 rounded-[12px] font-bold text-[13px] border border-emerald-200 transition-all shadow-sm">
                                    Contact
                                </button>
                            </div>
                            <div className="flex items-center justify-center gap-1 mt-3">
                                <ShieldCheck size={12} className="text-[#4CAF50] shrink-0" />
                                <span className="text-[9px] font-bold text-[#8DA697] uppercase tracking-wider">Payments held in escrow until delivery</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        ))}

        {filteredListings.length === 0 && (
          <div className="text-center py-10 bg-white rounded-[24px] border border-[#E9F4EC]">
            <p className="text-[28px] mb-2">🔍</p>
            <p className="text-[14px] font-bold text-[#113A28]">No produce found</p>
            <p className="text-[12px] text-[#8DA697] mt-1">Try a different search or category</p>
          </div>
        )}
      </div>
    </div>
  );
}
