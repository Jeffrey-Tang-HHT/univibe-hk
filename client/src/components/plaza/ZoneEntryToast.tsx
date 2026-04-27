import { motion, AnimatePresence } from 'framer-motion';
import { ZONE_CAPTIONS, ZONE_COLORS } from './JourneyLog';

/**
 * Brief card that appears on zone entry, styled like the "Sequence N" panels
 * in the concept art. Auto-dismisses after ~3.5s.
 */

interface ZoneEntryToastProps {
  zone: string | null; // null = hidden
  sequenceNumber: number;
  lang: string;
}

export default function ZoneEntryToast({
  zone,
  sequenceNumber,
  lang,
}: ZoneEntryToastProps) {
  const caption = zone ? ZONE_CAPTIONS[zone] : null;
  const color = zone ? ZONE_COLORS[zone] || '#4ECDC4' : '#4ECDC4';
  const isZh = lang === 'zh';

  return (
    <AnimatePresence>
      {zone && caption && (
        <motion.div
          key={`${zone}-${sequenceNumber}`}
          initial={{ opacity: 0, y: -20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="absolute top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none w-[92%] max-w-sm"
        >
          <div
            className="rounded-2xl p-[1.5px] shadow-2xl"
            style={{
              background: `linear-gradient(135deg, ${color}, #EC4899)`,
              boxShadow: `0 20px 50px -15px ${color}66, 0 8px 24px rgba(0,0,0,0.35)`,
            }}
          >
            <div
              className="relative rounded-[14px] overflow-hidden"
              style={{
                background:
                  'linear-gradient(180deg, rgba(20,22,30,0.95) 0%, rgba(15,17,25,0.98) 100%)',
              }}
            >
              {/* Top colored strip with sequence badge */}
              <div
                className="px-4 py-2 flex items-center gap-3"
                style={{
                  background: `linear-gradient(135deg, ${color}25, ${color}08)`,
                  borderBottom: `1px solid ${color}30`,
                }}
              >
                <div
                  className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-md"
                  style={{
                    background: `linear-gradient(135deg, ${color}, ${color}CC)`,
                  }}
                >
                  {sequenceNumber}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[10px] uppercase tracking-[0.15em] font-bold leading-none"
                    style={{ color }}
                  >
                    {isZh ? '序列' : 'Sequence'} {sequenceNumber}
                  </p>
                  <p className="text-sm font-bold text-white mt-1 leading-tight truncate">
                    {isZh ? caption.title.zh : caption.title.en}
                  </p>
                </div>
                {/* Pulsing indicator */}
                <div className="relative w-2 h-2 shrink-0">
                  <div
                    className="absolute inset-0 rounded-full animate-ping"
                    style={{ backgroundColor: color, opacity: 0.6 }}
                  />
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                </div>
              </div>

              {/* Body — bilingual captions */}
              <div className="px-4 py-3 space-y-0.5">
                <p className="text-[11px] text-white/70 leading-snug">
                  {isZh ? caption.en : caption.zh}
                </p>
                <p className="text-xs text-white font-medium leading-snug">
                  {isZh ? caption.zh : caption.en}
                </p>
              </div>

              {/* Progress bar (auto-dismiss timer) */}
              <div className="h-0.5 bg-white/5 overflow-hidden">
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 3.5, ease: 'linear' }}
                  className="h-full"
                  style={{ backgroundColor: color, opacity: 0.7 }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
