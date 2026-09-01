const MESSAGE = 'New drop: Coming Soon'

export default function AnnouncementBar() {
  return (
    <div className="bg-void text-bone text-[11px] tracking-[0.15em] uppercase font-medium overflow-hidden">
      {/* Mobile: continuous one-line marquee */}
      <div className="md:hidden py-2.5 whitespace-nowrap">
        <div className="inline-flex animate-marquee">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="mx-6 shrink-0">{MESSAGE}</span>
          ))}
        </div>
      </div>
      {/* Desktop: static, centered, fits on one line */}
      <div className="hidden md:block py-2.5 text-center">
        {MESSAGE}
      </div>
    </div>
  )
}
