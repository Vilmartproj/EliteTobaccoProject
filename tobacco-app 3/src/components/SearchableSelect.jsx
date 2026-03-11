import { useEffect, useMemo, useState } from 'react';

const defaultMenuStyle = {
  position: 'absolute',
  top: 'calc(100% + 4px)',
  left: 0,
  right: 0,
  maxHeight: 220,
  overflowY: 'auto',
  background: '#fff',
  border: '1px solid #ddd',
  borderRadius: 8,
  boxShadow: '0 10px 26px rgba(0,0,0,0.12)',
  zIndex: 50,
};

const defaultOptionStyle = {
  width: '100%',
  textAlign: 'left',
  background: '#fff',
  border: 'none',
  padding: '9px 12px',
  cursor: 'pointer',
  fontSize: 14,
};

function normalizeOptions(options) {
  return options.map((opt) => {
    if (typeof opt === 'string') return { value: opt, label: opt };
    return {
      value: String(opt.value),
      label: String(opt.label ?? opt.value),
      keywords: String(opt.keywords ?? ''),
    };
  });
}

export default function SearchableSelect({
  options = [],
  value = '',
  onChange,
  placeholder = 'Search...',
  inputStyle,
  disabled = false,
  noResultsText = 'No matches found',
}) {
  const normalized = useMemo(() => normalizeOptions(options), [options]);
  const selected = normalized.find((o) => o.value === String(value));
  const [query, setQuery] = useState(selected?.label || '');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) setQuery(selected?.label || '');
  }, [selected?.label, open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return normalized;
    return normalized.filter((o) =>
      o.label.toLowerCase().includes(q)
      || o.value.toLowerCase().includes(q)
      || o.keywords.toLowerCase().includes(q)
    );
  }, [normalized, query]);

  const pick = (opt) => {
    onChange?.(opt.value);
    setQuery(opt.label);
    setOpen(false);
  };

  const inputValue = open ? query : (selected?.label || '');

  return (
    <div style={{ position: 'relative' }}>
      <input
        style={inputStyle}
        value={inputValue}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) setOpen(true);
        }}
        onBlur={() => {
          setTimeout(() => {
            setOpen(false);
            setQuery(selected?.label || '');
          }, 120);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && filtered.length > 0) {
            e.preventDefault();
            pick(filtered[0]);
          }
        }}
      />

      {open && (
        <div style={defaultMenuStyle}>
          {filtered.length === 0 ? (
            <div style={{ padding: '10px 12px', color: '#888', fontSize: 13 }}>{noResultsText}</div>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt.value}
                type="button"
                style={defaultOptionStyle}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(opt);
                }}
              >
                {opt.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}