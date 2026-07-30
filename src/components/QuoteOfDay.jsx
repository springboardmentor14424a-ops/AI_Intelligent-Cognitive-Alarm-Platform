const QUOTES = [
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Small daily improvements lead to staggering long-term results.", author: "Robin Sharma" },
];

export default function QuoteOfDay() {
  const quote = QUOTES[new Date().getDate() % QUOTES.length];
  return (
    <div className="card p-5 bg-brand-gradient text-white relative overflow-hidden">
      <span className="absolute -bottom-4 -right-2 font-display text-8xl opacity-20 select-none">"</span>
      <p className="relative text-xs uppercase tracking-wider opacity-80 mb-2">Quote of the day</p>
      <p className="relative font-display text-base leading-snug">{quote.text}</p>
      <p className="relative text-sm opacity-80 mt-3">— {quote.author}</p>
    </div>
  );
}
