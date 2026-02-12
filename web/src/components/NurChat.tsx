"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    MessageSquare,
    X,
    Send,
    Loader2,
    Moon,
    Sparkles,
    ChevronDown,
    ChefHat,
    Heart
} from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Message {
    role: "user" | "assistant";
    content: string;
}

export default function NurChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            content: "As-salamu alaykum! I am **Nur**, your Ramadan Spiritual & Culinary Assistant. How can I guide your journey today? 🌙"
        }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSend = async () => {
        if (!input.trim() || isTyping) return;

        const userMessage = input.trim();
        setInput("");
        setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
        setIsTyping(true);

        let assistantResponse = "";

        try {
            const websocket = new WebSocket('wss://backend.buildpicoapps.com/ask_ai_streaming_v2');

            const systemPrompt = `You are Nur, a compassionate, wise, and knowledgeable Ramadan Spiritual & Culinary Assistant for the 'SehriMilan' app. 
      Your goals:
      1. Provide culinary guidance: recipes, step-by-step cooking steps, and ingredient substitutions for Iftar and Suhoor.
      2. Offer spiritual support: tips for mindfulness, patience, and the spirit of Ramadan.
      3. Help with planning: Suggest meals based on budget, family size, or dietary needs.
      
      Style: Warm, professional, and encouraging. Use occasional emojis like 🌙, ✨, 🥗. Keep responses concise but helpful. Use Markdown for formatting.`;

            const chatHistory = messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
            const finalPrompt = `${systemPrompt}\n\nChat History:\n${chatHistory}\n\nUser: ${userMessage}\n\nAssistant:`;

            websocket.addEventListener("open", () => {
                websocket.send(JSON.stringify({ appId: "early-ahead", prompt: finalPrompt }));
            });

            websocket.addEventListener("message", (event) => {
                assistantResponse += event.data;
                // Update the last message if it's from the assistant, or add a new one
                setMessages((prev) => {
                    const last = prev[prev.length - 1];
                    if (last && last.role === "assistant" && prev.length > messages.length) {
                        return [...prev.slice(0, -1), { role: "assistant", content: assistantResponse }];
                    } else {
                        return [...prev, { role: "assistant", content: assistantResponse }];
                    }
                });
            });

            websocket.addEventListener("close", (event) => {
                setIsTyping(false);
                if (event.code !== 1000) {
                    console.error("AI Chat connection closed unexpectedly");
                }
            });

            websocket.addEventListener("error", (err) => {
                console.error("AI Chat error:", err);
                setIsTyping(false);
            });

        } catch (err) {
            console.error("Chat error:", err);
            setIsTyping(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[100] no-print">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="absolute bottom-20 right-0 w-[90vw] sm:w-[400px] h-[500px] sm:h-[600px] glass rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col mb-4"
                    >
                        {/* Header */}
                        <div className="p-6 bg-gradient-to-r from-emerald-900/80 to-primary/80 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-secondary/20 rounded-xl flex items-center justify-center">
                                    <Moon className="w-5 h-5 text-secondary fill-secondary" />
                                </div>
                                <div>
                                    <h3 className="text-white font-black text-lg tracking-tight">Nur-AI</h3>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                                        <span className="text-[10px] text-emerald-100/40 font-bold uppercase tracking-widest">Divine Guide Active</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors text-emerald-100/40"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Messages */}
                        <div
                            ref={scrollRef}
                            className="flex-grow overflow-y-auto p-6 space-y-6 scroll-smooth no-scrollbar"
                        >
                            {messages.map((m, i) => (
                                <div
                                    key={i}
                                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${m.role === "user"
                                            ? "bg-secondary text-black font-medium"
                                            : "bg-white/5 text-emerald-50 border border-white/5"
                                        }`}>
                                        <ReactMarkdown className="prose prose-invert prose-sm">
                                            {m.content}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            ))}
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                        <Loader2 className="w-4 h-4 text-secondary animate-spin" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input */}
                        <div className="p-6 border-t border-white/5 bg-white/5">
                            <div className="relative group">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyPress={(e) => e.key === "Enter" && handleSend()}
                                    placeholder="Ask Nur about recipes or guidance..."
                                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-6 pr-14 text-white placeholder:text-emerald-100/20 outline-none focus:border-secondary transition-all"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={isTyping || !input.trim()}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-secondary text-black rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="mt-4 flex items-center justify-between px-2">
                                <div className="flex gap-3">
                                    <button className="text-[10px] text-emerald-100/20 hover:text-secondary transition-colors font-bold uppercase tracking-widest flex items-center gap-1">
                                        <ChefHat className="w-3 h-3" /> Recipes
                                    </button>
                                    <button className="text-[10px] text-emerald-100/20 hover:text-secondary transition-colors font-bold uppercase tracking-widest flex items-center gap-1">
                                        <Heart className="w-3 h-3" /> Tips
                                    </button>
                                </div>
                                <p className="text-[9px] text-emerald-100/10 font-bold uppercase tracking-[0.2em]">Powered by Nur Intelligence</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-16 h-16 bg-gradient-to-br from-secondary to-accent rounded-full flex items-center justify-center shadow-2xl shadow-secondary/20 hover:scale-110 active:scale-90 transition-all group relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                {isOpen ? (
                    <ChevronDown className="w-8 h-8 text-black relative z-10" />
                ) : (
                    <div className="relative">
                        <Moon className="w-8 h-8 text-black relative z-10 fill-black" />
                        <Sparkles className="w-4 h-4 text-amber-100 absolute -top-1 -right-1 animate-pulse" />
                    </div>
                )}
            </button>
        </div>
    );
}
