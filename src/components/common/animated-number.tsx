"use client";

import { useEffect, useState } from "react";

interface AnimatedNumberProps {
  value: number;
  formatter: (value: number) => string;
  className?: string;
}

export const AnimatedNumber = ({ value, formatter, className }: AnimatedNumberProps): JSX.Element => {
  const [current, setCurrent] = useState(value);
  const [previous, setPrevious] = useState(value);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (value === current) {
      return;
    }

    setPrevious(current);
    setCurrent(value);
    setAnimating(true);

    const timeout = setTimeout(() => {
      setAnimating(false);
    }, 420);

    return () => clearTimeout(timeout);
  }, [current, value]);

  return (
    <span className={`slot-number ${className ?? ""} ${animating ? "is-animating" : ""}`.trim()}>
      <span className="slot-stack">
        <span>{formatter(previous)}</span>
        <span>{formatter(current)}</span>
      </span>
    </span>
  );
};
