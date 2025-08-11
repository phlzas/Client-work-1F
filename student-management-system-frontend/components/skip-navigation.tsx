"use client";

import React from "react";
import { Button } from "@/components/ui/button";

interface SkipLink {
  href: string;
  text: string;
}

interface SkipNavigationProps {
  links?: SkipLink[];
}

export function SkipNavigation({ links }: SkipNavigationProps) {
  const defaultLinks: SkipLink[] = [
    { href: "#main-content", text: "تخطي إلى المحتوى الرئيسي" },
    { href: "#sidebar-navigation", text: "الانتقال إلى قائمة التنقل" },
  ];

  const skipLinks = links || defaultLinks;

  const handleSkip = (href: string) => {
    const target = document.querySelector(href);
    if (target) {
      (target as HTMLElement).focus();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <nav
      className="sr-only focus-within:not-sr-only fixed top-0 left-0 z-50 bg-background border border-border p-2 rounded-br-md shadow-lg"
      aria-label="روابط التخطي"
    >
      <div className="flex gap-2">
        {skipLinks.map((link, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => handleSkip(link.href)}
            className="focus:not-sr-only focus:relative focus:z-10"
          >
            {link.text}
          </Button>
        ))}
      </div>
    </nav>
  );
}
