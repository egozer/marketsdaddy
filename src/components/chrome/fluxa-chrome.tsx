"use client";

import { type ReactNode } from "react";

import { FluxaFooter } from "@/components/chrome/footer";
import { TopNav } from "@/components/chrome/top-nav";
import { useFxStore } from "@/store/useFxStore";

export const FluxaChrome = ({ children }: { children: ReactNode }): JSX.Element => {
  const stress = useFxStore((state) => state.stress);

  return (
    <>
      <TopNav stressLevel={stress.level} stressScore={stress.score} />
      <div className="fluxa-page-wrap">{children}</div>
      <FluxaFooter />
    </>
  );
};
