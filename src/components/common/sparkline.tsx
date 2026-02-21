interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
}

export const Sparkline = ({ values, width = 240, height = 70 }: SparklineProps): JSX.Element => {
  if (values.length < 2) {
    return <svg width={width} height={height} role="img" aria-label="Insufficient chart data" />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(0.0000001, max - min);

  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} role="img" aria-label="Recent movement sparkline">
      <polyline fill="none" stroke="currentColor" strokeWidth="1.6" points={points} />
    </svg>
  );
};
