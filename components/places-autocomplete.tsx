'use client';

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';

/**
 * Property-address type-ahead backed by the Places API (New) REST endpoints.
 *
 * Design notes:
 * - Uses places:autocomplete + places/{id} (NOT the legacy JS Autocomplete
 *   widget), so it matches a key restricted to "Places API (New)" and needs no
 *   Maps JavaScript API enablement.
 * - Renders its own dropdown (themed to Concept B) instead of a Google web
 *   component, so styling stays under our control.
 * - Session token spans autocomplete + the details fetch for correct per-session
 *   billing; it is reset after a selection.
 * - GRACEFUL FALLBACK: if the key is missing or any request fails, this behaves
 *   as a plain controlled text input. The field is always usable by hand.
 */

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

type Suggestion = { placeId: string; text: string };

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';

function newSessionToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function PropertyAddressAutocomplete({
  id,
  value,
  onChange,
  placeholder,
  className,
}: Props) {
  const enabled = Boolean(KEY);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const sessionRef = useRef<string>('');
  const boxRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close the dropdown on any outside click.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const fetchSuggestions = useCallback(
    async (input: string) => {
      if (!enabled || input.trim().length < 3) {
        setSuggestions([]);
        setOpen(false);
        return;
      }
      if (!sessionRef.current) sessionRef.current = newSessionToken();
      try {
        const res = await fetch(AUTOCOMPLETE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': KEY as string,
          },
          body: JSON.stringify({
            input,
            sessionToken: sessionRef.current,
            includedRegionCodes: ['us'],
          }),
        });
        if (!res.ok) {
          setSuggestions([]);
          setOpen(false);
          return;
        }
        const json = await res.json();
        const list: Suggestion[] = (json.suggestions ?? [])
          .filter((s: { placePrediction?: unknown }) => Boolean(s.placePrediction))
          .map((s: { placePrediction: { placeId: string; text?: { text?: string } } }) => ({
            placeId: s.placePrediction.placeId,
            text: s.placePrediction.text?.text ?? '',
          }))
          .filter((s: Suggestion) => Boolean(s.placeId) && Boolean(s.text));
        setSuggestions(list);
        setActive(-1);
        setOpen(list.length > 0);
      } catch {
        setSuggestions([]);
        setOpen(false);
      }
    },
    [enabled],
  );

  function handleInput(e: ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    onChange(v); // always write raw text (fallback-friendly)
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchSuggestions(v);
    }, 250);
  }

  async function selectSuggestion(s: Suggestion) {
    setOpen(false);
    setSuggestions([]);
    try {
      const res = await fetch(
        'https://places.googleapis.com/v1/places/' +
          encodeURIComponent(s.placeId) +
          '?sessionToken=' +
          encodeURIComponent(sessionRef.current),
        {
          headers: {
            'X-Goog-Api-Key': KEY as string,
            'X-Goog-FieldMask': 'formattedAddress',
          },
        },
      );
      if (res.ok) {
        const json = await res.json();
        onChange(json.formattedAddress || s.text);
      } else {
        onChange(s.text);
      }
    } catch {
      onChange(s.text);
    }
    sessionRef.current = ''; // end the billing session
  }

  function handleKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      void selectSuggestion(suggestions[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        id={id}
        type="text"
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />
      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-rule bg-white shadow-lg"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.placeId}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                void selectSuggestion(s);
              }}
              onMouseEnter={() => setActive(i)}
              className={
                'cursor-pointer px-4 py-2.5 text-sm ' +
                (i === active ? 'bg-tint text-brand' : 'text-gray-700')
              }
            >
              {s.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
