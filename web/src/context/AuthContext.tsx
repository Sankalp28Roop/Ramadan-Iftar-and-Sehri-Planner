"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

import { Loader2, Moon } from "lucide-react";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isDemo: boolean;
    startDemo: () => void;
    exitDemo: () => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    isDemo: false,
    startDemo: () => { },
    exitDemo: () => { }
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isDemo, setIsDemo] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const initializeAuth = async () => {
            try {
                // 1. Check for active Supabase session
                const { data: { session } } = await supabase.auth.getSession();

                if (session?.user) {
                    console.log("AuthContext: Valid session found", session.user.email);
                    setUser(session.user);
                    setIsDemo(false);
                    localStorage.removeItem("sehrimilan_demo_mode");
                } else {
                    // 2. No session, check for Demo Mode
                    const demoStatus = localStorage.getItem("sehrimilan_demo_mode") === "true";
                    if (demoStatus) {
                        console.log("AuthContext: Entering Demo Mode via LocalStorage");
                        setIsDemo(true);
                        setUser({
                            id: "00000000-0000-0000-0000-000000000000",
                            email: "demo@sehrimilan.com",
                            user_metadata: { display_name: "Demo Guest" },
                            aud: "authenticated",
                            role: "authenticated",
                            app_metadata: {},
                            created_at: new Date().toISOString()
                        } as any);
                    } else {
                        console.log("AuthContext: No session, no demo mode");
                        setUser(null);
                        setIsDemo(false);
                    }
                }
            } catch (err) {
                console.error("AuthContext: Initialization error", err);
            } finally {
                setLoading(false);
            }
        };

        initializeAuth();

        // Listen for auth changes
        const { data } = supabase.auth.onAuthStateChange((event: any, session: any) => {
            console.log("AuthContext: onAuthStateChange event ->", event);

            if (event === "SIGNED_OUT" || (event === "SIGNED_IN" && session?.user)) {
                // Clear all app-related caches
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith("sehrimilan_")) {
                        localStorage.removeItem(key);
                    }
                });
                setIsDemo(false);
            }

            if (session?.user) {
                setUser(session.user);
            } else if (event === "SIGNED_OUT") {
                setUser(null);
            }

            setLoading(false);
        });

        const subscription = data?.subscription;

        return () => {
            if (subscription) subscription.unsubscribe();
        };
    }, []);

    const startDemo = () => {
        setIsDemo(true);
        localStorage.setItem("sehrimilan_demo_mode", "true");
        setUser({
            id: "00000000-0000-0000-0000-000000000000",
            email: "demo@sehrimilan.com",
            user_metadata: { display_name: "Demo Guest" },
            aud: "authenticated",
            role: "authenticated",
            app_metadata: {},
            created_at: new Date().toISOString()
        } as any);
    };

    const exitDemo = () => {
        setIsDemo(false);
        localStorage.removeItem("sehrimilan_demo_mode");
        setUser(null);
    };

    if (!mounted || loading) {
        return (
            <div className="min-h-screen relative flex flex-col items-center justify-center p-4 overflow-hidden bg-[#041c04]">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/20 blur-[180px] rounded-full opacity-40"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 blur-[150px] rounded-full opacity-30"></div>

                <div className="relative z-10 text-center space-y-8">
                    <div className="flex justify-center">
                        <div className="p-6 bg-secondary/10 rounded-3xl border border-secondary/20 shadow-2xl shadow-secondary/20">
                            <Moon className="text-secondary w-16 h-16 animate-pulse filter drop-shadow-[0_0_15px_rgba(246,224,94,0.5)]" />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h2 className="text-2xl font-black gold-text tracking-widest uppercase">Initializing Session</h2>
                        <div className="flex justify-center">
                            <Loader2 className="w-8 h-8 text-secondary animate-spin" />
                        </div>
                        <p className="text-emerald-100/30 text-[10px] font-black uppercase tracking-[0.5em]">SehriMilan v3.0 Cloud</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{ user, loading, isDemo, startDemo, exitDemo }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
