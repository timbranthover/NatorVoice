import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-[150px] w-full rounded-2xl border border-stone-900/10 bg-white/95 px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus-visible:ring-2 focus-visible:ring-amber-400/60",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
