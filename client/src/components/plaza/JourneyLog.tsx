import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Clock } from 'lucide-react';

/**
 * Journey log panel — shows the player's sequence of zone visits as numbered
 * cards, matching the "HUD Detailed Perspectives" concept art.
 *
 * Each entry records: zone, timestamp, and a bilingual action caption.
 * Session-only — cleared on page refresh.
 */

export interface JourneyEntry {
  id: string; // Unique per entry (timestamp-based)
  zone: string; // 'center' | 'study' | 'social' | 'dating' | 'cafe'
  timestamp: number; // Date.now() when entered
  sequenceNumber: number; // 1, 2, 3, 4...
}

// Bilingual captions per zone — matches the concept art tone
// "Heading towards central plaza / 前往中央廣場"
const ZONE_CAPTIONS: Record<
  string,
  { en: string; zh: string; title: { en: string; zh: string } }
> = {
  center: {
    title: { en: 'Central Plaza', zh: '中央廣場' },
    en: 'Crossing the active fountain area',
    zh: '穿越活躍的噴泉區域',
  },
  study: {
    title: { en: 'Study Zone', zh: '自習區' },
    en: 'Heading towards the study area',
    zh: '前往自習區',
  },
  social: {
    title: { en: 'Social Zone', zh: '社交區' },
    en: 'Approaching the social stage',
    zh: '靠近社交舞台',
  },
  dating: {
    title: { en: 'Dating Corner', zh: '交友角' },
    en: 'Considering a stop at the dating zone',
    zh: '考慮在交友區停頓',
  },
  cafe: {
    title: { en: 'Café Kiosk', zh: '咖啡廳' },
    en: 'Arriving at the café',
    zh: '抵達咖啡館',
  },
};

const ZONE_COLORS: Record<string, string> = {
  center: '#4ECDC4',
  study: '#45B7D1',
  social: '#FF6B6B',
  dating: '#C4B5FD',
  cafe: '#FFA07A',
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

interface JourneyLogProps {
  entries: JourneyEntry[];
  lang: string;
  isOpen: boolean;
  onClose: () => void;
  onClear?: () => void;
}

export default function JourneyLog({
  entries,
  lang,
  isOpen,
  onClose,
  onClear,
}: JourneyLogProps) {
  const isZh = lang === 'zh';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 z-[60] bg-black/40 backdrop-blur-[2px]"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: -40, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -40, scale: 0.96 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-4 top-[5.75rem] z-[70] w-[22rem] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-10rem)]"
          >
            <div
              className="rounded-2xl p-[1.5px] shadow-2xl"
              style={{
                background:
                  'linear-gradient(135deg, #4ECDC4, #A78BFA, #EC4899)',
              }}
            >
              <div className="bg-slate-900/95 backdrop-blur-xl rounded-[14px] overflow-hidden flex flex-col"
                style={{ maxHeight: 'calc(100vh - 10rem)' }}
              >
                {/* Header */}
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-white/5 to-transparent">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-coral to-pink-500 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white leading-tight">
                        {isZh ? '角色移動日誌' : 'Character Movement Log'}
                      </h3>
                      <p className="text-[10px] text-white/60 leading-tight mt-0.5">
                        {isZh ? 'HUD 詳細視角' : 'HUD Detailed Perspectives'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-white/60 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
                    aria-label="Close journey log"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Entries list (scrollable) */}
                <div className="overflow-y-auto flex-1 p-3 space-y-2.5 scrollbar-hide">
                  {entries.length === 0 ? (
                    <div className="py-10 text-center">
                      <Clock className="w-8 h-8 text-white/30 mx-auto mb-3" />
                      <p className="text-xs text-white/60">
                        {isZh
                          ? '還沒有移動記錄，開始探索廣場吧！'
                          : 'No movement yet — start exploring the plaza!'}
                      </p>
                    </div>
                  ) : (
                    entries.map((entry, i) => {
                      const caption = ZONE_CAPTIONS[entry.zone];
                      const color = ZONE_COLORS[entry.zone] || '#4ECDC4';
                      if (!caption) return null;
                      return (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, delay: i * 0.04 }}
                          className="relative rounded-xl overflow-hidden border border-white/10"
                          style={{
                            background:
                              'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                          }}
                        >
                          {/* Left color bar */}
                          <div
                            className="absolute left-0 top-0 bottom-0 w-1"
                            style={{ backgroundColor: color }}
                          />
                          <div className="pl-4 pr-3 py-2.5">
                            <div className="flex items-start gap-2.5">
                              {/* Sequence number badge */}
                              <div
                                className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shadow-md"
                                style={{
                                  background: `linear-gradient(135deg, ${color}, ${color}CC)`,
                                }}
                              >
                                {entry.sequenceNumber}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline justify-between gap-2">
                                  <h4
                                    className="text-[11px] font-bold uppercase tracking-wider leading-none"
                                    style={{ color }}
                                  >
                                    {isZh ? '序列' : 'Sequence'}{' '}
                                    {entry.sequenceNumber}
                                  </h4>
                                  <span className="text-[9px] text-white/50 font-mono shrink-0">
                                    {formatTime(entry.timestamp)}
                                  </span>
                                </div>
                                <p className="text-sm font-semibold text-white mt-1 leading-tight">
                                  {isZh ? caption.title.zh : caption.title.en}
                                </p>
                                <p className="text-[11px] text-white/70 mt-1 leading-snug">
                                  {isZh ? caption.en : caption.zh}
                                </p>
                                <p className="text-[11px] text-white/90 font-medium mt-0.5 leading-snug">
                                  {isZh ? caption.zh : caption.en}
                                </p>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                {entries.length > 0 && onClear && (
                  <div className="px-3 py-2 border-t border-white/10 flex items-center justify-between bg-black/20">
                    <span className="text-[10px] text-white/50">
                      {entries.length}{' '}
                      {isZh ? '個序列' : entries.length === 1 ? 'sequence' : 'sequences'}
                    </span>
                    <button
                      onClick={onClear}
                      className="text-[10px] text-white/60 hover:text-neon-coral transition-colors font-medium"
                    >
                      {isZh ? '清除日誌' : 'Clear log'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Export caption lookup for use elsewhere (e.g., the entry toast)
export { ZONE_CAPTIONS, ZONE_COLORS };
