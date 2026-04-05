import React, { useEffect, useState } from "react";

interface AvatarProps {
  src?: string;
  name?: string;
  alt?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  title?: string;
  status?: "online" | "idle" | "offline" | "in-huddle";
  showStatusDot?: boolean;
}

const sizeMap: Record<NonNullable<AvatarProps["size"]>, string> = {
  xs: "w-5 h-5",
  sm: "w-6 h-6",
  md: "w-8 h-8",
  lg: "w-10 h-10",
  xl: "w-12 h-12",
};

function getInitials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase() || "?";
}

function Avatar({
  src,
  name,
  alt,
  size = "md",
  className = "",
  title,
  status,
  showStatusDot = false,
}: AvatarProps) {
  const [broken, setBroken] = useState(false);
  const showImg = !!src && !broken;
  const label = alt || name || "Avatar";

  // Reset broken state when the image source changes
  useEffect(() => {
    setBroken(false);
  }, [src]);

  const dotColorClass =
    status === "online"
      ? "bg-green-500"
      : status === "idle"
      ? "bg-amber-400"
      : status === "in-huddle"
      ? "bg-violet-500"
      : "bg-slate-400"; // offline/default

  return (
    <span className="inline-block relative align-middle">
      {showImg ? (
        <img
          src={src}
          alt={label}
          title={title}
          className={`${sizeMap[size]} rounded-full ${className}`}
          onError={() => setBroken(true)}
        />
      ) : (
        <div
          className={`${sizeMap[size]} rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-semibold ${className}`}
          title={title || label}
          aria-label={label}
        >
          <span
            className={
              size === "xs"
                ? "text-[10px]"
                : size === "sm"
                ? "text-xs"
                : size === "md"
                ? "text-sm"
                : size === "lg"
                ? "text-base"
                : "text-lg"
            }
          >
            {getInitials(name)}
          </span>
        </div>
      )}
      {showStatusDot && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-white ${
            size === "xs"
              ? "w-2 h-2"
              : size === "sm"
              ? "w-2.5 h-2.5"
              : size === "md"
              ? "w-3 h-3"
              : size === "lg"
              ? "w-3.5 h-3.5"
              : "w-4 h-4"
          } ${dotColorClass}`}
          aria-hidden="true"
        />
      )}
    </span>
  );
}

export default Avatar;
