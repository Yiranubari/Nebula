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
  return (
    <div
      role="status"
      aria-label={ariaLabel}
      className={`inline-flex items-center justify-center gap-1 ${className}`}
      style={{ height: size, fontSize: size }}
    >
      <span className="w-[0.35em] h-[0.35em] bg-current rounded-full animate-[bounce_1.4s_infinite_ease-in-out_both] delay-[0ms]"></span>
      <span className="w-[0.35em] h-[0.35em] bg-current rounded-full animate-[bounce_1.4s_infinite_ease-in-out_both] [animation-delay:160ms]"></span>
      <span className="w-[0.35em] h-[0.35em] bg-current rounded-full animate-[bounce_1.4s_infinite_ease-in-out_both] [animation-delay:320ms]"></span>
    </div>
  );
}
