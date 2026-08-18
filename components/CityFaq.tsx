import type { FaqItem } from "@/lib/content/city-faq";

/**
 * Renders the FAQ built by `lib/content/city-faq.ts`. The same array is
 * passed to `faqJsonLd`, so the visible answer and the structured data
 * can't drift apart.
 *
 * Always-visible <h3>/<p> rather than <details>: collapsed content is
 * weighted less by search engines and there's nothing here worth hiding.
 */
export function CityFaq({ items }: { items: FaqItem[] }) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.id}>
          <h3 className="font-medium">{item.question}</h3>
          <p className="text-sm text-ink-muted mt-1 leading-relaxed">
            {item.answer}
          </p>
        </div>
      ))}
    </div>
  );
}
