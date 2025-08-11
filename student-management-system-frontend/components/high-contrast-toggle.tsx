"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Contrast, Eye } from "lucide-react";
import { useAccessibility } from "@/components/accessibility-provider";

interface HighContrastToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function HighContrastToggle({
  className,
  showLabel = true,
}: HighContrastToggleProps) {
  const { isHighContrast, toggleHighContrast } = useAccessibility();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleHighContrast}
      className={className}
      aria-label={
        isHighContrast ? "إلغاء وضع التباين العالي" : "تفعيل وضع التباين العالي"
      }
      aria-pressed={isHighContrast}
      role="switch"
    >
      {isHighContrast ? (
        <Eye className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Contrast className="h-4 w-4" aria-hidden="true" />
      )}
      {showLabel && (
        <span className="mr-2">
          {isHighContrast ? "التباين العادي" : "التباين العالي"}
        </span>
      )}
    </Button>
  );
}
