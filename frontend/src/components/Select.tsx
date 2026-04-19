import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

interface SelectProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  /** Extra classes applied to the trigger button. */
  className?: string;
  /** Optional icon rendered inside the trigger before the label. */
  leadingIcon?: React.ReactNode;
  ariaLabel?: string;
}

/**
 * Lightweight, framework-free dropdown styled to match the Nebula aesthetic.
 * Replaces native <select> when the default browser popup looks out of place.
 * Keyboard: ArrowUp/Down navigate, Enter selects, Esc closes.
 */
function Select<T extends string = string>({
  value,
  onChange,
  options,
  placeholder,
  className = "",
  leadingIcon,
  ariaLabel,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(() =>
    Math.max(
      options.findIndex((o) => o.value === value),
      0
    )
  );
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // Keep highlighted item in view
    const el = listRef.current?.querySelector<HTMLLIElement>(
      `[data-index="${activeIndex}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const commit = (idx: number) => {
    const opt = options[idx];
    if (!opt) return;
    onChange(opt.value);
    setOpen(false);
  };

  const onTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (
        e.key === "Enter" ||
        e.key === " " ||
        e.key === "ArrowDown" ||
        e.key === "ArrowUp"
      ) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + options.length) % options.length);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      commit(activeIndex);
    }
  };

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={`inline-flex items-center gap-2 px-3 py-2 bg-white/50 dark:bg-white/[0.03] backdrop-blur-sm rounded-xl text-sm text-slate-900 dark:text-slate-100 hover:bg-white/70 dark:hover:bg-white/[0.06] transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400/30 ${className}`}
      >
        {leadingIcon && (
          <span className="text-slate-400 dark:text-slate-500 shrink-0">
            {leadingIcon}
          </span>
        )}
        <span className="truncate">
          {selected?.label || placeholder || ""}
        </span>
        <ChevronDown
          size={14}
          className={`ml-auto text-slate-400 dark:text-slate-500 shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 top-full mt-1.5 min-w-full z-30 bg-white dark:bg-[#0f172a] rounded-2xl shadow-xl shadow-slate-900/10 dark:shadow-black/40 overflow-hidden backdrop-blur-md"
          style={{ minWidth: "max-content" }}
        >
          <ul
            ref={listRef}
            className="py-1.5 max-h-72 overflow-y-auto"
            onMouseLeave={() => {
              /* preserve last highlight */
            }}
          >
            {options.map((opt, idx) => {
              const isActive = idx === activeIndex;
              const isSelected = opt.value === value;
              return (
                <li
                  key={opt.value}
                  data-index={idx}
                  role="option"
                  aria-selected={isSelected}
                >
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => commit(idx)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                      isActive
                        ? "bg-slate-900/[0.04] dark:bg-white/[0.06]"
                        : ""
                    } ${
                      isSelected
                        ? "text-indigo-600 dark:text-indigo-300 font-medium"
                        : "text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    <span className="flex-1 truncate">{opt.label}</span>
                    {isSelected && (
                      <Check
                        size={14}
                        className="text-indigo-500 dark:text-indigo-300 shrink-0"
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export default Select;
