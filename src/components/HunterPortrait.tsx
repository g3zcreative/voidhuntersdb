export function HunterPortrait({ hunter, tags, onClick }: { hunter: any; tags?: string[]; onClick: () => void }) {
  const rarityClass = hunter.rarity === 5 ? "ring-yellow-500" : hunter.rarity === 4 ? "ring-purple-500" : "ring-blue-500";
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 group w-16 sm:w-20">
      <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden ring-2 ${rarityClass} bg-secondary transition-transform group-hover:scale-110`}>
        {hunter.image_url ? (
          <img src={hunter.image_url} alt={hunter.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground">
            {hunter.name?.slice(0, 2)}
          </div>
        )}
      </div>
      <span className="text-[10px] sm:text-xs text-center leading-tight line-clamp-2 text-foreground/80 group-hover:text-foreground">
        {hunter.name}
      </span>
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap justify-center gap-0.5">
          {tags.map((t) => (
            <span key={t} className="text-[8px] sm:text-[9px] px-1 py-0 rounded bg-secondary text-muted-foreground">{t}</span>
          ))}
        </div>
      )}
    </button>
  );
}
