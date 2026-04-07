import React from "react";

type SpinnerProps = {
  size?: number;
  className?: string;
  "aria-label"?: string;
};

export default function Spinner({
  size = 18,
  className = "",
  "aria-label": ariaLabel = "Loading",
}: SpinnerProps) {
  const px = Math.max(12, size);
  return (
    <span
      role="status"
      aria-label={ariaLabel}
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      style={{ width: px, height: px }}
    />
  );
}
