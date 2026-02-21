"use client";

import { createContext, useContext, type ReactNode } from "react";

import { useFxEngine, type FxEngineController } from "@/lib/fx/useFxEngine";

const FluxaRuntimeContext = createContext<FxEngineController | null>(null);

export const FluxaRuntimeProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  const controller = useFxEngine();

  return <FluxaRuntimeContext.Provider value={controller}>{children}</FluxaRuntimeContext.Provider>;
};

export const useFluxaRuntime = (): FxEngineController => {
  const context = useContext(FluxaRuntimeContext);

  if (!context) {
    throw new Error("useFluxaRuntime must be used inside FluxaRuntimeProvider.");
  }

  return context;
};
