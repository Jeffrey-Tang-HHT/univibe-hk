import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import type { DayNightMode } from './DayNightCycle';

/**
 * DayNightSettings — full settings dialog replacing the v6 "cycler" icon.
 *
 * The v6 icon button cycled real-hk → accelerated → fixed-noon by tap.
 * That made it impossible to:
 *   - pick a non-noon fixed hour (e.g. golden-hour screenshots)
 *   - tune the accelerated cycle length (8 min was hardcoded)
 *   - turn off stars at night without writing code
 *
 * This dialog mirrors the AvatarCustomizer's compact card layout so the
 * two HUD-level dialogs feel like siblings rather than divergent UIs.
 *
 * State is owned by the parent (Plaza.tsx) and persisted to localStorage
 * the same way the v6 mode was — see `usePersistedDayNightSettings` in
 * Plaza.tsx. We just render the controls.
 */

export interface DayNightSettings {
  mode: DayNightMode;
  /** Used only when mode='accelerated'. Minutes per full 24h cycle. */
  cycleMinutes: number;
  /** Used only when mode='fixed'. Hour 0..24 (decimals allowed). */
  fixedHour: number;
  /** Master toggle for the starfield. Useful for "no stars by request". */
  starsEnabled: boolean;
}

export const DEFAULT_DAY_NIGHT_SETTINGS: DayNightSettings = {
  mode: 'real-hk',
  cycleMinutes: 8,
  fixedHour: 13,
  starsEnabled: true,
};

interface Props {
  settings: DayNightSettings;
  onChange: (settings: DayNightSettings) => void;
  onClose: () => void;
}

export default function DayNightSettings({ settings, onChange, onClose }: Props) {
  const { lang } = useLanguage();
  const update = <K extends keyof DayNightSettings>(key: K, value: DayNightSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  // Format a fractional hour as HH:MM. Slider passes 0..24 in 0.25 steps.
  const fmtHour = (h: number) => {
    const hh = Math.floor(h) % 24;
    const mm = Math.round((h - Math.floor(h)) * 60);
    // 24:00 doesn't exist — clamp display to 23:59 if we land there.
    if (hh === 23 && mm === 60) return '23:59';
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  };

  const modeLabel = (m: DayNightMode) => {
    if (lang === 'zh') {
      return m === 'real-hk' ? '即時香港' : m === 'accelerated' ? '加速循環' : '固定時間';
    }
    return m === 'real-hk' ? 'Live HK' : m === 'accelerated' ? 'Accelerated' : 'Fixed';
  };

  const modeHint = (m: DayNightMode) => {
    if (lang === 'zh') {
      return m === 'real-hk'
        ? '太陽跟住真實香港時間'
        : m === 'accelerated'
          ? '24 小時壓縮到幾分鐘'
          : '永遠停留在指定時間';
    }
    return m === 'real-hk'
      ? "Sun follows Hong Kong's real clock"
      : m === 'accelerated'
        ? 'Compress 24h into a few minutes'
        : 'Pin to a specific hour';
  };

  return (
    <div className="absolute top-4 right-4 z-50 w-80 bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <h3 className="text-sm font-bold text-foreground">
          {lang === 'zh' ? '日夜設定' : 'Day / Night'}
        </h3>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground text-lg leading-none"
          aria-label={lang === 'zh' ? '關閉' : 'Close'}
        >
          &times;
        </button>
      </div>

      <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Mode (radio group) */}
        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
            {lang === 'zh' ? '模式' : 'Mode'}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {(['real-hk', 'accelerated', 'fixed'] as DayNightMode[]).map((m) => (
              <button
                key={m}
                onClick={() => update('mode', m)}
                className={`px-2 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  settings.mode === m
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background/50 text-foreground/80 border-border hover:bg-background'
                }`}
              >
                {modeLabel(m)}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground leading-snug">
            {modeHint(settings.mode)}
          </p>
        </div>

        {/* Conditional control: cycleMinutes for accelerated mode */}
        {settings.mode === 'accelerated' && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {lang === 'zh' ? '循環長度' : 'Cycle length'}
              </span>
              <span className="text-xs font-mono text-foreground">
                {settings.cycleMinutes.toFixed(0)} {lang === 'zh' ? '分鐘' : 'min'}
              </span>
            </div>
            <input
              type="range"
              min={2}
              max={30}
              step={1}
              value={settings.cycleMinutes}
              onChange={(e) => update('cycleMinutes', Number(e.target.value))}
              className="w-full accent-primary"
              aria-label={lang === 'zh' ? '循環長度' : 'Cycle length minutes'}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground/70 mt-0.5">
              <span>2</span>
              <span>30</span>
            </div>
          </div>
        )}

        {/* Conditional control: fixedHour for fixed mode */}
        {settings.mode === 'fixed' && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {lang === 'zh' ? '固定時間' : 'Fixed hour'}
              </span>
              <span className="text-xs font-mono text-foreground">
                {fmtHour(settings.fixedHour)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={23.75}
              step={0.25}
              value={settings.fixedHour}
              onChange={(e) => update('fixedHour', Number(e.target.value))}
              className="w-full accent-primary"
              aria-label={lang === 'zh' ? '固定小時' : 'Fixed hour'}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground/70 mt-0.5">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>23:45</span>
            </div>
            {/* Quick presets — easier than dragging to specific golden-hour values. */}
            <div className="mt-2 grid grid-cols-4 gap-1">
              {[
                { h: 6.5, zh: '日出', en: 'Sunrise' },
                { h: 12, zh: '正午', en: 'Noon' },
                { h: 18.5, zh: '日落', en: 'Sunset' },
                { h: 0, zh: '午夜', en: 'Midnight' },
              ].map((p) => (
                <button
                  key={p.h}
                  onClick={() => update('fixedHour', p.h)}
                  className="px-1 py-1 rounded-md text-[10px] bg-background/60 hover:bg-background border border-border/70 text-foreground/80"
                >
                  {lang === 'zh' ? p.zh : p.en}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stars toggle — applies in all modes but only visible at night. */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div>
            <div className="text-xs font-semibold text-foreground">
              {lang === 'zh' ? '星空' : 'Stars'}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {lang === 'zh' ? '夜晚顯示星星' : 'Show stars at night'}
            </div>
          </div>
          <button
            role="switch"
            aria-checked={settings.starsEnabled}
            onClick={() => update('starsEnabled', !settings.starsEnabled)}
            className={`relative w-10 h-6 rounded-full transition-colors ${
              settings.starsEnabled ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                settings.starsEnabled ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border/50 bg-background/30 flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => onChange(DEFAULT_DAY_NIGHT_SETTINGS)}
        >
          {lang === 'zh' ? '重設' : 'Reset'}
        </Button>
        <Button size="sm" className="text-xs" onClick={onClose}>
          {lang === 'zh' ? '完成' : 'Done'}
        </Button>
      </div>
    </div>
  );
}
