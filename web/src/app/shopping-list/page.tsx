"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
    ShoppingCart,
    CheckCircle2,
    Circle,
    Sparkles,
    Printer,
    ShoppingBag,
    Plus,
    Trash2,
    Calendar,
    Package,
    Share2,
    X,
    Loader2,
    RefreshCw,
    Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface TodoItem {
    id: string;
    name: string;
    completed: boolean;
    day: string;
    category: string;
}

export default function ShoppingListPage() {
    const { user, loading: authLoading, isDemo } = useAuth();
    const router = useRouter();
    const [items, setItems] = useState<TodoItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [newItem, setNewItem] = useState("");
    const [showAddForm, setShowAddForm] = useState(false);

    // Initial load from cache
    useEffect(() => {
        setMounted(true);
        if (user) {
            const cachedItems = localStorage.getItem(`sehrimilan_shopping_${user.id}`);
            if (cachedItems) {
                try {
                    setItems(JSON.parse(cachedItems));
                    setLoading(false);
                } catch (e) {
                    console.error("Error parsing cached shopping list:", e);
                }
            }
        }
    }, [user]);

    const fetchItems = useCallback(async (forceRefresh = false) => {
        if (!user) return;

        if (isDemo) {
            // ... demo logic ...
            const demoItems: TodoItem[] = [
                { id: "demo-1", name: "Premium Dates (Kimia)", completed: false, day: "Day 1", category: "Grocery" },
                { id: "demo-2", name: "Lentils (Red & Yellow)", completed: true, day: "Day 1", category: "Grocery" },
                { id: "demo-3", name: "Fresh Chicken Breast", completed: false, day: "Day 1", category: "Meat" },
                { id: "demo-4", name: "Greek Yogurt", completed: false, day: "Day 2", category: "Grocery" },
                { id: "demo-5", name: "Whole Wheat Flour", completed: false, day: "Day 2", category: "Grocery" },
            ];
            setItems(demoItems);
            setLoading(false);
            return;
        }

        // Only show spinner if no cache or manual refresh
        if (items.length === 0 || forceRefresh) {
            setLoading(true);
        } else {
            setIsRefreshing(true);
        }

        try {
            // Only check saved list if not forcing a refresh
            if (!forceRefresh) {
                const { data: listData, error: listError } = await supabase
                    .from("shopping_lists")
                    .select("items")
                    .eq("id", user.id)
                    .single();

                if (!listError && listData && listData.items && listData.items.length > 0) {
                    // Deduplicate even if loading from DB to fix legacy duplicates
                    const uniqueItemsMap = new Map();
                    (listData.items as TodoItem[]).forEach(item => {
                        const normalized = item.name.toLowerCase().trim();
                        if (!uniqueItemsMap.has(normalized)) {
                            uniqueItemsMap.set(normalized, item);
                        }
                    });
                    const finalItems = Array.from(uniqueItemsMap.values());

                    setItems(finalItems);
                    localStorage.setItem(`sehrimilan_shopping_${user.id}`, JSON.stringify(finalItems));

                    // If we found duplicates, save the clean version back to the cloud
                    if (finalItems.length !== (listData.items as TodoItem[]).length) {
                        await supabase
                            .from("shopping_lists")
                            .upsert({ id: user.id, items: finalItems });
                    }

                    setLoading(false);
                    return;
                }
            }

            // Extract from plan
            const { data: planData, error: planError } = await supabase
                .from("plans")
                .select("full_plan")
                .eq("id", user.id)
                .single();

            if (!planError && planData) {
                const savedPlan = planData.full_plan || "";
                if (typeof savedPlan !== "string") {
                    setItems([]);
                    return;
                }

                const lines = savedPlan.split("\n");
                const foundItems: TodoItem[] = [];
                let currentDay = "Global";
                let isInShoppingSection = false;

                lines.forEach((line: string, index: number) => {
                    const trimmedLine = line?.trim() || "";

                    // Match # Day 1, ## Day 1, Day 1: etc.
                    if (trimmedLine.toLowerCase().includes("# day") || (trimmedLine.toLowerCase().startsWith("day") && trimmedLine.includes(":"))) {
                        currentDay = trimmedLine.replace(/#/g, "").replace(/:/g, "").trim();
                        isInShoppingSection = false;
                    }
                    // Match ## Shopping List, ### Shopping List, **Shopping List**
                    else if ((trimmedLine.startsWith("#") || trimmedLine.startsWith("*")) && trimmedLine.toLowerCase().includes("shopping")) {
                        isInShoppingSection = true;
                    }
                    else if (trimmedLine.startsWith("##") || (trimmedLine.startsWith("#") && !trimmedLine.toLowerCase().includes("shopping"))) {
                        // Check if it's another main section but not shopping
                        if (!trimmedLine.toLowerCase().includes("shopping")) {
                            // Only exit shopping section if we hit a new section that isn't shopping
                            // But we usually want to stay in shopping until the next Day or a major section
                        }
                    }

                    if (isInShoppingSection && trimmedLine.startsWith("-") && trimmedLine.length > 2) {
                        const itemName = trimmedLine.replace("-", "").trim();
                        if (itemName.length > 0) {
                            foundItems.push({
                                id: `item-${index}-${Date.now()}`,
                                name: itemName,
                                completed: false,
                                day: currentDay,
                                category: itemName.toLowerCase().includes("fruit") ? "Produce" :
                                    itemName.toLowerCase().includes("veg") ? "Produce" :
                                        itemName.toLowerCase().includes("meat") || itemName.toLowerCase().includes("chicken") ? "Meat" : "Grocery"
                            });
                        }
                    }
                });

                const cleanItems = foundItems.filter(item =>
                    item.name &&
                    !item.name.toLowerCase().includes("step") &&
                    !item.name.toLowerCase().includes("suhoor") &&
                    !item.name.toLowerCase().includes("iftar") &&
                    !item.name.toLowerCase().includes("preparation")
                );

                // Deduplicate by normalized name
                const uniqueItemsMap = new Map();
                cleanItems.forEach(item => {
                    const normalized = item.name.toLowerCase().trim();
                    if (!uniqueItemsMap.has(normalized)) {
                        uniqueItemsMap.set(normalized, item);
                    }
                });
                const finalItems = Array.from(uniqueItemsMap.values());

                setItems(finalItems);
                localStorage.setItem(`sehrimilan_shopping_${user.id}`, JSON.stringify(finalItems));
                // Save extracted items to Supabase
                if (finalItems.length > 0) {
                    await supabase
                        .from("shopping_lists")
                        .upsert({ id: user.id, items: finalItems });
                }
            }
        } catch (err: any) {
            console.error("Error fetching shopping list:", err?.message || err);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchItems();
        }
    }, [user, fetchItems]);

    const saveToSupabase = async (newItems: TodoItem[]) => {
        if (!user || isDemo) return;

        // Update local cache immediately for fast UI
        localStorage.setItem(`sehrimilan_shopping_${user.id}`, JSON.stringify(newItems));

        try {
            const { error } = await supabase
                .from("shopping_lists")
                .upsert({ id: user.id, items: newItems });
            if (error) throw error;
        } catch (err) {
            console.error("Error saving items:", err);
        }
    };

    const toggleItem = (id: string) => {
        const updated = items.map(item =>
            item.id === id ? { ...item, completed: !item.completed } : item
        );
        setItems(updated);
        saveToSupabase(updated);
    };

    const deleteItem = (id: string) => {
        const updated = items.filter(item => item.id !== id);
        setItems(updated);
        saveToSupabase(updated);
    };

    const addItem = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newItem.trim()) return;

        const item: TodoItem = {
            id: `manual-${Date.now()}`,
            name: newItem.trim(),
            completed: false,
            day: "Manual",
            category: "Personal"
        };

        const updated = [item, ...items];
        setItems(updated);
        saveToSupabase(updated);
        setNewItem("");
        setShowAddForm(false);
    };

    const shareOnWhatsApp = () => {
        const pendingItems = items.filter(i => !i.completed).map(i => `• ${i.name} (${i.day})`).join('\n');
        const completedItems = items.filter(i => i.completed).map(i => `✓ ${i.name}`).join('\n');

        const message = `*SehriMilan - Ramadan Shopping List* 🌙\n\n*Pending Items:*\n${pendingItems || 'None'}\n\n*Completed:*\n${completedItems || 'None'}\n\n_Generated for ${user?.user_metadata?.display_name || 'User'} by SehriMilan_`;

        const encoded = encodeURIComponent(message);
        window.open(`https://wa.me/?text=${encoded}`, '_blank');
    };

    if (!mounted || authLoading || (loading && user)) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#041c04] text-white">
                <Loader2 className="w-12 h-12 text-secondary animate-spin mb-4" />
                <p className="text-emerald-100/40 font-black uppercase tracking-widest">Loading Essentials...</p>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen px-4 lg:px-20 py-8 lg:py-12 pb-32 lg:pb-12 bg-transparent text-foreground relative">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 lg:gap-8 mb-12 lg:mb-20 relative z-20">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-center lg:text-left"
                >
                    <div className="flex items-center justify-center lg:justify-start gap-2 mb-4">
                        <div className="w-8 h-8 bg-secondary/20 rounded-lg flex items-center justify-center">
                            <Package className="w-4 h-4 text-secondary" />
                        </div>
                        <span className="text-secondary font-bold uppercase tracking-[0.2em] text-[10px] lg:text-xs">Cloud Managed List</span>
                    </div>
                    <h1 className="text-4xl lg:text-7xl font-black gold-text tracking-tighter leading-none mb-4 uppercase">
                        {user.user_metadata?.display_name?.split(' ')[0] || "MY"} SHOPPING
                    </h1>
                    <p className="text-emerald-200/40 text-sm lg:text-lg max-w-lg mx-auto lg:mx-0 flex items-center gap-2 justify-center lg:justify-start">
                        {isRefreshing ? <><Loader2 className="w-4 h-4 animate-spin text-secondary" /> Syncing updates...</> : `Auto-synced pantry items for ${user.email}.`}
                    </p>
                </motion.div>

                <div className="flex flex-wrap justify-center lg:justify-end gap-3 lg:gap-4 no-print">
                    {!isDemo ? (
                        <>
                            <button
                                onClick={shareOnWhatsApp}
                                className="glass px-4 lg:px-6 py-3 lg:py-5 rounded-2xl lg:rounded-3xl hover:bg-emerald-500/10 transition-all text-emerald-400 border-white/5 flex items-center gap-2"
                                title="Share on WhatsApp"
                            >
                                <Share2 className="w-5 h-5" />
                                <span className="text-[10px] lg:text-xs font-bold uppercase tracking-widest hidden sm:inline">WhatsApp</span>
                            </button>
                            <button onClick={() => window.print()} className="glass p-3 lg:p-5 rounded-2xl lg:rounded-3xl hover:bg-white/5 transition-all text-blue-200 border-white/5">
                                <Printer className="w-5 h-5 lg:w-6 lg:h-6" />
                            </button>
                            <button
                                onClick={() => fetchItems(true)}
                                className="glass p-3 lg:p-5 rounded-2xl lg:rounded-3xl hover:bg-secondary/10 transition-all text-secondary border-white/5"
                                title="Sync from Plan"
                            >
                                <RefreshCw className={`w-5 h-5 lg:w-6 lg:h-6 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                                onClick={() => setShowAddForm(true)}
                                className="bg-secondary text-black px-6 lg:px-10 py-3 lg:py-5 rounded-2xl lg:rounded-[2rem] font-black flex items-center gap-2 lg:gap-3 gold-glow hover:scale-[1.05] transition-all group relative overflow-hidden"
                            >
                                <Plus className="w-5 h-5 lg:w-6 lg:h-6 group-hover:rotate-90 transition-transform duration-300" />
                                <span className="text-sm lg:text-base">New Item</span>
                            </button>
                        </>
                    ) : (
                        <div className="px-8 py-5 glass rounded-[2rem] text-secondary font-black text-xs uppercase tracking-[0.2em] flex items-center gap-3">
                            <Zap className="w-5 h-5" /> Live Demo View
                        </div>
                    )}
                </div>
            </header>

            <AnimatePresence>
                {showAddForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="glass max-w-md w-full p-8 rounded-[3rem] relative"
                        >
                            <button
                                onClick={() => setShowAddForm(false)}
                                className="absolute top-6 right-6 p-2 text-emerald-100/20 hover:text-white transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                            <h3 className="text-2xl font-black text-white mb-6 uppercase tracking-tighter">Add New Essential</h3>
                            <form onSubmit={addItem} className="space-y-4">
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="e.g. Fresh Dates (2kg)"
                                    value={newItem}
                                    onChange={(e) => setNewItem(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white outline-none focus:border-secondary transition-all"
                                />
                                <button
                                    type="submit"
                                    className="w-full bg-secondary text-black py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] transition-all"
                                >
                                    Add to Cloud List
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="max-w-5xl mx-auto relative z-10">
                {items.length > 0 ? (
                    <div className="space-y-8 lg:space-y-12">
                        {/* Stats Bar */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 no-print">
                            {[
                                { label: "Total", value: items.length, color: "text-emerald-400" },
                                { label: "Done", value: items.filter(i => i.completed).length, color: "text-emerald-400" },
                                { label: "To-Go", value: items.filter(i => !i.completed).length, color: "text-secondary" },
                                { label: "Sync", value: "Cloud", color: "text-emerald-200/40" }
                            ].map((stat, i) => (
                                <div key={i} className="glass p-3 lg:p-6 rounded-2xl lg:rounded-3xl border-white/5 text-center">
                                    <p className="text-[8px] lg:text-[10px] font-black text-emerald-100/30 uppercase tracking-widest mb-1">{stat.label}</p>
                                    <p className={`text-lg lg:text-2xl font-black ${stat.color}`}>{stat.value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Todo Section */}
                        <div className="glass rounded-[3rem] lg:rounded-[4rem] border-white/5 p-6 lg:p-16">
                            <div className="flex items-center justify-between mb-8 lg:mb-12">
                                <h3 className="text-2xl lg:text-3xl font-black text-white flex items-center gap-3 lg:gap-4 tracking-tighter">
                                    <ShoppingBag className="w-6 lg:w-8 h-6 lg:h-8 text-secondary" />
                                    Essential Pickups
                                </h3>
                                <div className="flex gap-1.5">
                                    <div className="w-2 lg:w-3 h-2 lg:h-3 rounded-full bg-red-500 animate-pulse"></div>
                                    <div className="w-2 lg:w-3 h-2 lg:h-3 rounded-full bg-yellow-500 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                                    <div className="w-2 lg:w-3 h-2 lg:h-3 rounded-full bg-green-500 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                                </div>
                            </div>

                            <div className="space-y-3 lg:space-y-4">
                                <AnimatePresence>
                                    {items.map((item, index) => (
                                        <motion.div
                                            key={item.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ delay: index * 0.02 }}
                                            className={`group flex items-center gap-4 lg:gap-6 p-4 lg:p-6 rounded-2xl lg:rounded-[2rem] transition-all duration-300 border ${item.completed
                                                ? "bg-emerald-500/5 border-emerald-500/10 grayscale-[0.8] opacity-50"
                                                : "bg-white/5 border-white/5 hover:bg-white/[0.08] hover:border-secondary/20"
                                                }`}
                                        >
                                            <button
                                                onClick={() => toggleItem(item.id)}
                                                className={`transition-all duration-300 active:scale-[0.8] p-1.5 -m-1.5 ${item.completed ? "text-emerald-500" : "text-emerald-200/20 hover:text-emerald-400"}`}
                                            >
                                                {item.completed ? (
                                                    <CheckCircle2 className="w-7 lg:w-8 h-7 lg:h-8" />
                                                ) : (
                                                    <Circle className="w-7 lg:w-8 h-7 lg:h-8" />
                                                )}
                                            </button>

                                            <div className="flex-grow flex flex-col md:flex-row md:items-center justify-between gap-2 lg:gap-4" onClick={() => toggleItem(item.id)}>
                                                <div>
                                                    <p className={`text-base lg:text-xl font-bold tracking-tight transition-all ${item.completed ? "line-through" : "text-white"}`}>
                                                        {item.name}
                                                    </p>
                                                    <div className="flex items-center gap-2 lg:gap-3 mt-1">
                                                        <span className="flex items-center gap-1 text-[8px] lg:text-[10px] uppercase font-black tracking-widest text-emerald-100/20">
                                                            <Calendar className="w-2.5 lg:w-3 h-2.5 lg:h-3" /> {item.day}
                                                        </span>
                                                        <span className="w-1 h-1 bg-blue-100/20 rounded-full"></span>
                                                        <span className="flex items-center gap-1 text-[8px] lg:text-[10px] uppercase font-black tracking-widest text-secondary/60">
                                                            <Sparkles className="w-2.5 lg:w-3 h-2.5 lg:h-3" /> {item.category}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {!isDemo && (
                                                <button
                                                    onClick={() => deleteItem(item.id)}
                                                    className="p-3 lg:p-3 text-emerald-100/10 hover:text-red-400 hover:bg-red-400/10 rounded-xl lg:rounded-2xl transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                                                >
                                                    <Trash2 className="w-5 lg:w-5 h-5 lg:h-5" />
                                                </button>
                                            )}
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>

                            {items.length === 0 && (
                                <div className="text-center py-16 lg:py-24">
                                    <div className="w-16 lg:w-24 h-16 lg:h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <ShoppingCart className="w-8 lg:w-10 h-8 lg:h-10 text-emerald-100/10" />
                                    </div>
                                    <h4 className="text-xl lg:text-2xl font-bold text-emerald-100/20">No items found</h4>
                                    <p className="text-emerald-100/10 mt-2 text-sm lg:text-base">Try generating a new plan or manually adding items.</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="glass p-16 lg:p-32 rounded-[3.5rem] lg:rounded-[5rem] text-center border-dashed border-white/5 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <ShoppingCart className="w-20 lg:w-32 h-20 lg:h-32 text-emerald-100/5 mx-auto mb-8 lg:mb-10 group-hover:scale-110 transition-transform duration-700" />
                        <h3 className="text-2xl lg:text-4xl font-black text-emerald-100/20 tracking-tighter">Your pantry awaits instructions</h3>
                        <p className="text-emerald-100/10 text-base lg:text-xl mt-4 max-w-sm mx-auto">Generate a blessed meal plan first to auto-populate your shopping list.</p>
                        <button
                            onClick={() => window.location.href = "/"}
                            className="mt-10 lg:mt-12 bg-white/10 hover:bg-white/20 text-white px-8 lg:px-10 py-4 lg:py-5 rounded-3xl font-black transition-all active:scale-95"
                        >
                            Go to Launchpad
                        </button>
                    </div>
                )}
            </div>

        </div>
    );
}
