import React from "react";
import { Check } from "lucide-react";

interface CustomCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export default function CustomCheckbox({
  checked,
  onChange,
  disabled = false,
}: CustomCheckboxProps) {
  const [isFocused, setIsFocused] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onChange(!checked);
      }}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => !disabled && setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "15px",
        height: "15px",
        borderRadius: "4px",
        border: checked
          ? "1px solid var(--accent-primary)"
          : isHovered
            ? "1px solid var(--border-hover)"
            : isFocused
              ? "1px solid var(--border-active)"
              : "1px solid var(--border)",
        background: checked
          ? "var(--accent-primary)"
          : isHovered
            ? "var(--bg-hover)"
            : "var(--bg-tertiary)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "all var(--transition-fast)",
        boxShadow: checked
          ? "0 0 8px var(--accent-glow)"
          : isFocused
            ? "0 0 0 2px var(--accent-glow)"
            : "none",
        outline: "none",
      }}
      role="checkbox"
      aria-checked={checked}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (!disabled && (e.key === " " || e.key === "Enter")) {
          e.preventDefault();
          e.stopPropagation();
          onChange(!checked);
        }
      }}
    >
      {checked && (
        <Check
          size={11}
          color="#ffffff"
          strokeWidth={3.5}
          style={{
            animation: "scaleInCheckbox 0.12s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          }}
        />
      )}
      <style>{`
        @keyframes scaleInCheckbox {
          from {
            transform: scale(0.6);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
