import { useState } from 'react';

/**
 * Numeric input that avoids leading-zero issues.
 * Uses a text input internally so the user has full control over
 * the displayed string, then emits a synthetic onChange with a
 * numeric value when the input is valid.
 */
export default function NumericInput({ value, onChange, min, max, step, className, ...props }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const displayed = editing ? draft : String(value ?? '');

  const handleFocus = (e) => {
    setEditing(true);
    setDraft(String(value ?? ''));
    // Select all on focus so typing replaces the value
    requestAnimationFrame(() => e.target.select());
  };

  const handleChange = (e) => {
    const raw = e.target.value;
    setDraft(raw);

    // Allow empty, minus sign, or partial decimal during editing
    if (raw === '' || raw === '-' || raw === '.' || raw === '-.') return;

    const num = Number(raw);
    if (!isNaN(num)) {
      // Emit a synthetic event that looks like the original
      onChange({ target: { value: raw } });
    }
  };

  const handleBlur = () => {
    setEditing(false);
    // If draft is empty or invalid, revert to current value
    if (draft === '' || isNaN(Number(draft))) {
      onChange({ target: { value: String(value ?? 0) } });
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={displayed}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={className}
      {...props}
    />
  );
}
