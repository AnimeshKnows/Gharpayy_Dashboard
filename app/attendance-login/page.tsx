"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalLink, Lock, Mail } from "lucide-react";
import { motion } from "framer-motion";

const ATTENDANCE_URL = "https://gharpayy-core.vercel.app";

export default function AttendanceLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    window.location.href = ATTENDANCE_URL;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        className="w-full max-w-[420px] rounded-2xl border border-border bg-card p-6 shadow-sm"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
      >
        <div className="mb-4">
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Attendance Login
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            This will open the ARENA OS attendance system.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-2xs">Email</Label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                required
                placeholder="Enter email"
                className="pl-9 h-11 rounded-xl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-2xs">Password</Label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                required
                placeholder="Enter password"
                className="pl-9 h-11 rounded-xl"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90"
            disabled={loading}
          >
            {loading ? "Redirecting..." : "Sign In & Continue"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => window.open(ATTENDANCE_URL, "_blank")}
          className="mt-4 w-full text-xs text-muted-foreground hover:text-accent flex items-center justify-center gap-1.5"
        >
          Open attendance system directly <ExternalLink size={12} />
        </button>
      </motion.div>
    </div>
  );
}
