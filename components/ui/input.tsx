import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full rounded-xl border border-stone-900/10 bg-white/95 px-3 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus-visible:ring-2 focus-visible:ring-amber-400/60",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
