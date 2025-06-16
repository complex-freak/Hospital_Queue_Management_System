
import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface LoaderProps extends React.SVGAttributes<SVGElement> {}

const Loader = React.forwardRef<SVGSVGElement, LoaderProps>(
  ({ className, ...props }, ref) => {
    return (
      <Loader2
        ref={ref}
        className={cn("animate-spin", className)}
        {...props}
      />
    );
  }
);

Loader.displayName = "Loader";

export { Loader };
