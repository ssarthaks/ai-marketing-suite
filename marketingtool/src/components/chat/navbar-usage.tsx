"use client";

import { useEffect, useState } from "react";
import { getUserUsage } from "@/app/actions/user";
import { useSession } from "next-auth/react";

export function NavbarUsage() {
  const { data: session } = useSession();
  const [usage, setUsage] = useState({
    total_input_tokens: 0,
    total_output_tokens: 0,
    total_cost: 0,
  });

  useEffect(() => {
    if (!session?.user) return;

    let mounted = true;
    const fetchUsage = async () => {
      try {
        const data = await getUserUsage();
        if (mounted) setUsage(data);
      } catch (err) {
        // ignore
      }
    };

    fetchUsage();
    const interval = setInterval(fetchUsage, 60000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [session?.user?.email]);

  if (!session?.user) return null;

  return (
    <div className="hidden md:flex items-center gap-3 text-xs font-medium text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-full border border-border/50 mr-4">
      <div className="flex items-center gap-1">
        <span className="text-foreground/50">In:</span>
        <span className="text-foreground">
          {usage.total_input_tokens.toLocaleString()}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-foreground/50">Out:</span>
        <span className="text-foreground">
          {usage.total_output_tokens.toLocaleString()}
        </span>
      </div>
      <div className="flex items-center gap-1 border-l border-border/50 pl-3 ml-1">
        <span className="text-[#6FB941]">${usage.total_cost.toFixed(4)}</span>
      </div>
    </div>
  );
}
