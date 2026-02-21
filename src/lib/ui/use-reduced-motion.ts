"use client";

import { useMediaQuery } from "@/lib/ui/use-media-query";

export const useReducedMotion = (): boolean => useMediaQuery("(prefers-reduced-motion: reduce)");
