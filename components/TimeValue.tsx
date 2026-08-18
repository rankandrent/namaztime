/**
 * A prayer time rendered inside prose.
 *
 * `dir="auto"` matters: a Latin-digit time like "6:45 PM" sitting inside
 * an Arabic or Urdu sentence gets visually reordered by the bidi
 * algorithm without it (the "PM" can jump to the wrong side). Letting the
 * browser resolve direction from the string's own first strong character
 * keeps the time readable in all 17 locales.
 */
export function TimeValue({ children }: { children: React.ReactNode }) {
  return (
    <strong dir="auto" className="font-semibold tabular-nums whitespace-nowrap">
      {children}
    </strong>
  );
}
