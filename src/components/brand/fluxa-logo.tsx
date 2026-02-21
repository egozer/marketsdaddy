"use client";

import Image from "next/image";

interface FluxaLogoProps {
  animated?: boolean;
  className?: string;
}

export const FluxaLogo = ({ animated = false, className }: FluxaLogoProps): JSX.Element => (
  <Image
    src={animated ? "/brand/fluxa-logo-animated.svg" : "/brand/fluxa-logo.svg"}
    alt="Fluxa Live logo"
    width={156}
    height={44}
    className={className}
    priority
  />
);
