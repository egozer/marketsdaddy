"use client";

import { FluxaLogo } from "@/components/brand/fluxa-logo";

export const TopNav = (): JSX.Element => (
  <header className="fluxa-topnav" aria-label="Global header">
    <div className="fluxa-shell-row">
      <FluxaLogo animated className="fluxa-logo" />
    </div>
  </header>
);
