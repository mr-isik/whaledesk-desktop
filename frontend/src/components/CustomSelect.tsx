import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface Option {
  value: any;
  label: string;
}

interface CustomSelectProps {
  value: any;
  onChange: (value: any) => void;
  options: Option[];
  style?: React.CSSProperties;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  style,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      const activeIdx = options.findIndex((opt) => opt.value === value);
      setFocusedIndex(activeIdx >= 0 ? activeIdx : 0);
    }
  };

  const handleOptionClick = (val: any) => {
    onChange(val);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleToggle();
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev - 1 + options.length) % options.length);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < options.length) {
        handleOptionClick(options[focusedIndex].value);
      }
    } else if (e.key === "Tab") {
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        display: "inline-block",
        userSelect: "none",
        fontFamily: "inherit",
        ...style,
      }}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "4px 8px",
          background: "var(--bg-tertiary)",
          border: isOpen ? "1px solid var(--border-active)" : "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          color: "var(--text-primary)",
          fontSize: "11px",
          fontWeight: "500",
          cursor: "pointer",
          outline: "none",
          gap: "8px",
          boxShadow: isOpen ? "0 0 8px var(--accent-glow)" : "none",
          transition: "all var(--transition-fast)",
        }}
      >
        <span>{selectedOption ? selectedOption.label : ""}</span>
        <ChevronDown
          size={12}
          color="var(--text-secondary)"
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform var(--transition-normal)",
          }}
        />
      </button>

      {/* Options Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 4px)",
            right: 0,
            zIndex: 1000,
            minWidth: "120px",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-hover)",
            borderRadius: "var(--radius-sm)",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 1px rgba(255, 255, 255, 0.1)",
            padding: "4px",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            animation: "slideUpSelect 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            backdropFilter: "blur(12px)",
          }}
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value;
            const isFocused = idx === focusedIndex;

            return (
              <div
                key={idx}
                onClick={() => handleOptionClick(opt.value)}
                onMouseEnter={() => setFocusedIndex(idx)}
                style={{
                  padding: "6px 10px",
                  borderRadius: "3px",
                  fontSize: "11px",
                  fontWeight: isSelected ? "600" : "500",
                  color: isSelected
                    ? "var(--accent-foreground)"
                    : "var(--text-secondary)",
                  background: isSelected
                    ? "var(--accent-primary)"
                    : isFocused
                      ? "var(--bg-hover)"
                      : "transparent",
                  cursor: "pointer",
                  transition: "all var(--transition-fast)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>{opt.label}</span>
              </div>
            );
          })}
        </div>
      )}
      <style>{`
        @keyframes slideUpSelect {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
