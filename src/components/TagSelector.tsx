import styles from "@/styles/Tags.module.css";
import { useEffect, useMemo, useRef, useState } from "react";

type TagSelectorProps = {
  options: string[];
  selected: string[];
  onChange: (newSelected: string[]) => void;
  labelForValue?: (val: string) => string;
  placeholder?: string;
  mode?: "multi" | "single";
  allowCreate?: boolean;
};

export default function TagSelector({
  options,
  selected,
  onChange,
  labelForValue,
  placeholder = "Type tag & press 'Enter'...",
  mode = "multi",
  allowCreate = true,
}: TagSelectorProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();

    return options
      .filter((val) => !selected.includes(val))
      .filter((val) => {
        const label = labelForValue ? labelForValue(val) : val;
        return !q || label.toLowerCase().includes(q);
      });
  }, [options, selected, query, labelForValue]);

  const exactExistingMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;

    return (
      options.find((val) => {
        const label = labelForValue ? labelForValue(val) : val;
        return label.trim().toLowerCase() === q;
      }) || null
    );
  }, [options, query, labelForValue]);

  const exactSelectedMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return false;

    return selected.some((val) => {
      const label = labelForValue ? labelForValue(val) : val;
      return label.trim().toLowerCase() === q;
    });
  }, [selected, query, labelForValue]);

  const canCreate =
    allowCreate &&
    !!query.trim() &&
    !exactExistingMatch &&
    !exactSelectedMatch;

  const suggestionValues = useMemo(() => {
    return canCreate ? [...filteredOptions, query.trim()] : filteredOptions;
  }, [filteredOptions, canCreate, query]);

  const addValue = (val: string) => {
    if (!val) return;

    if (mode === "single") {
      onChange([val]);
      setQuery("");
      setActiveIndex(-1);
      setIsOpen(false);
      return;
    }

    if (selected.includes(val)) return;

    onChange([...selected, val]);
    setQuery("");
    setActiveIndex(-1);
  };

  const addFromQuery = () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    if (exactExistingMatch) {
      addValue(exactExistingMatch);
      return;
    }

    if (!allowCreate) return;

    addValue(trimmed);
  };

  const remove = (val: string) => {
    onChange(selected.filter((v) => v !== val));
    setQuery("");
    setActiveIndex(-1);
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!wrapperRef.current) return;

      if (!wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const shouldShowInput = mode === "multi" || selected.length === 0;

  return (
    <div
      ref={wrapperRef}
      className={styles.tagSelector}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(false);
          setQuery("");
          setActiveIndex(-1);
        }
      }}
    >
      <div
        className={`${styles.tags} ${mode === "single" ? styles.tagsSingle : ""}`}
        onClick={() => setIsOpen(true)}
      >
        {selected.map((val) => (
          <span key={val} className={styles.tag}>
            {labelForValue ? labelForValue(val) : val}
            <button
              type="button"
              className={styles.removeBtn}
              onClick={(e) => {
                e.stopPropagation();
                remove(val);
              }}
            >
              ×
            </button>
          </span>
        ))}

        {shouldShowInput && (
          <input
            className={`${styles.tagInput} ${mode === "single" ? styles.tagInputSingle : ""}`}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(-1);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Tab") {
                setIsOpen(false);
                setActiveIndex(-1);
                return;
              }

              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIsOpen(true);
                setActiveIndex((current) => {
                  if (suggestionValues.length === 0) return -1;
                  return current >= suggestionValues.length - 1 ? 0 : current + 1;
                });
                return;
              }

              if (e.key === "ArrowUp") {
                e.preventDefault();
                setIsOpen(true);
                setActiveIndex((current) => {
                  if (suggestionValues.length === 0) return -1;
                  return current <= 0 ? suggestionValues.length - 1 : current - 1;
                });
                return;
              }

              if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                setIsOpen(false);
                setQuery("");
                return;
              }

              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();

                if (activeIndex >= 0 && suggestionValues[activeIndex]) {
                  addValue(suggestionValues[activeIndex]);
                } else {
                  addFromQuery();
                }

                setIsOpen(mode !== "single");
                return;
              }

              if (e.key === "Escape") {
                e.preventDefault();
                setIsOpen(false);
                setActiveIndex(-1);
                return;
              }

              if (e.key === "Backspace" && !query.trim() && selected.length) {
                remove(selected[selected.length - 1]);
              }
            }}
            placeholder={selected.length ? "" : placeholder}
          />
        )}
      </div>

      {isOpen && shouldShowInput && (
        <div className={styles.suggestions}>
          {filteredOptions.map((val, index) => (
            <button
              key={val}
              type="button"
              tabIndex={-1}
              className={`${styles.suggestionButton} ${activeIndex === index ? styles.suggestionButtonActive : ""
                }`}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => {
                addValue(val);
                setIsOpen(mode !== "single");
              }}
            >
              <span className={styles.suggestionTag}>
                {labelForValue ? labelForValue(val) : val}
              </span>
            </button>
          ))}

          {canCreate && (
            <button
              type="button"
              tabIndex={-1}
              className={`${styles.suggestionButton} ${activeIndex === filteredOptions.length
                  ? styles.suggestionButtonActive
                  : ""
                }`}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActiveIndex(filteredOptions.length)}
              onClick={() => {
                addFromQuery();
                setIsOpen(mode !== "single");
              }}
            >
              <span className={styles.createTagLabel}>Create</span>
              <span className={styles.suggestionTag}>{query.trim()}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}