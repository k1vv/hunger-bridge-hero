/**
 * AI Status Badge Component
 *
 * Displays the current status of the AI matching engine.
 * Shows whether AI is enabled, disabled, or has errors.
 */

import { useState, useEffect } from "react";
import { Brain, Sparkles, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { isAIMatchingAvailable } from "@/lib/matching-utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type AIStatus = "checking" | "active" | "inactive" | "error";

interface AIStatusBadgeProps {
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  /** If true, performs a live verification check on mount */
  verifyOnMount?: boolean;
}

export function AIStatusBadge({
  className,
  showLabel = true,
  size = "md",
  verifyOnMount = false,
}: AIStatusBadgeProps) {
  const [status, setStatus] = useState<AIStatus>("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        // First check if API key is configured
        if (!isAIMatchingAvailable()) {
          setStatus("inactive");
          return;
        }

        // If verifyOnMount is true, perform a live check
        if (verifyOnMount && typeof window !== "undefined" && (window as any).aiMatching) {
          const isWorking = await (window as any).aiMatching.isWorking();
          setStatus(isWorking ? "active" : "error");
          if (!isWorking) {
            setError("API connection failed");
          }
        } else {
          // Just check if API key is present
          setStatus("active");
        }
      } catch (e) {
        setStatus("error");
        setError(e instanceof Error ? e.message : "Unknown error");
      }
    };

    checkStatus();
  }, [verifyOnMount]);

  const sizeClasses = {
    sm: "text-xs gap-1",
    md: "text-sm gap-1.5",
    lg: "text-base gap-2",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const statusConfig = {
    checking: {
      icon: <Loader2 className={cn(iconSizes[size], "animate-spin text-muted-foreground")} />,
      label: "Checking AI...",
      color: "text-muted-foreground",
      bgColor: "bg-muted/50",
      description: "Verifying AI matching engine status",
    },
    active: {
      icon: (
        <span className="relative inline-flex">
          <Brain className={cn(iconSizes[size], "text-accent")} />
          <Sparkles className={cn(
            size === "sm" ? "h-2 w-2" : size === "md" ? "h-2.5 w-2.5" : "h-3 w-3",
            "absolute -top-0.5 -right-0.5 text-yellow-500"
          )} />
        </span>
      ),
      label: "AI Active",
      color: "text-accent",
      bgColor: "bg-accent/10",
      description: "AI-enhanced semantic matching is enabled",
    },
    inactive: {
      icon: <Brain className={cn(iconSizes[size], "text-muted-foreground")} />,
      label: "AI Inactive",
      color: "text-muted-foreground",
      bgColor: "bg-muted/50",
      description: "AI matching not configured. Using rule-based matching.",
    },
    error: {
      icon: <AlertCircle className={cn(iconSizes[size], "text-destructive")} />,
      label: "AI Error",
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      description: error || "AI matching engine encountered an error",
    },
  };

  const config = statusConfig[status];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center rounded-full px-2 py-1",
              sizeClasses[size],
              config.bgColor,
              className
            )}
          >
            {config.icon}
            {showLabel && (
              <span className={cn("font-medium", config.color)}>
                {config.label}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <p className="font-medium">{config.label}</p>
            <p className="text-muted-foreground">{config.description}</p>
            {status === "inactive" && (
              <p className="text-muted-foreground mt-1">
                Add VITE_OPENAI_API_KEY to enable AI matching
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Inline AI indicator for use in titles and headers
 */
export function AIIndicator({ className }: { className?: string }) {
  const isActive = isAIMatchingAvailable();

  if (!isActive) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("inline-flex items-center gap-0.5", className)}>
            <Brain className="h-3.5 w-3.5 text-accent" />
            <Sparkles className="h-2.5 w-2.5 text-yellow-500" />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">AI-Enhanced Matching Active</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default AIStatusBadge;
