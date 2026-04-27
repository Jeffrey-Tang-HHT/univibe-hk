import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import type { AvatarConfig } from '@/lib/plaza';

interface AvatarCustomizerProps {
  config: AvatarConfig;
  onChange: (config: AvatarConfig) => void;
  onSave: () => void;
  onClose: () => void;
}

const SKIN_COLORS = ['#FFD5B8', '#FFCC99', '#F4C28A', '#D4A76A', '#C68642', '#8D5524', '#5C3A1E'];
const HAIR_COLORS = ['#4A3728', '#1A1A1A', '#8B6E4E', '#D4A76A', '#FF6B6B', '#6C63FF', '#FFD700', '#E0E0E0'];
const SHIRT_COLORS = ['#6C63FF', '#FF6B6B', '#4ECDC4', '#FFD93D', '#FF8A65', '#AB47BC', '#26A69A', '#EF5350', '#42A5F5', '#FFFFFF', '#1A1A1A'];
const PANTS_COLORS = ['#2D2D2D', '#4A4A4A', '#1565C0', '#4E342E', '#37474F', '#BF360C', '#E8E8E8'];

const HAIR_STYLES = [
  { zh: '短髮', en: 'Short' },
  { zh: '長髮', en: 'Long' },
  { zh: '刺蝟頭', en: 'Spiky' },
  { zh: '丸子頭', en: 'Bun' },
  { zh: '爆炸頭', en: 'Curly' },
  { zh: '側分', en: 'Side Part' },
];

const ACCESSORIES = [
  { zh: '無', en: 'None' },
  { zh: '眼鏡', en: 'Glasses' },
  { zh: '帽子', en: 'Cap' },
  { zh: '耳機', en: 'Headphones' },
  { zh: '蝴蝶結', en: 'Bow' },
];

const EXPRESSIONS = [
  { zh: '微笑', en: 'Smile', emoji: '😊' },
  { zh: '開心', en: 'Happy', emoji: '😄' },
  { zh: '冷靜', en: 'Neutral', emoji: '😐' },
  { zh: '⋯', en: '...', emoji: '😶' },
];

export default function AvatarCustomizer({ config, onChange, onSave, onClose }: AvatarCustomizerProps) {
  const { lang } = useLanguage();
  const [tab, setTab] = useState<'skin' | 'hair' | 'outfit' | 'extras'>('skin');

  const update = (key: keyof AvatarConfig, value: string | number) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="absolute top-4 right-4 z-50 w-80 bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <h3 className="text-sm font-bold text-foreground">
          {lang === 'zh' ? '自訂角色' : 'Customize Avatar'}
        </h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none">&times;</button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/50">
        {(['skin', 'hair', 'outfit', 'extras'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              tab === t
                ? 'text-neon-coral border-b-2 border-neon-coral'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'skin' ? (lang === 'zh' ? '膚色' : 'Skin') :
             t === 'hair' ? (lang === 'zh' ? '髮型' : 'Hair') :
             t === 'outfit' ? (lang === 'zh' ? '服裝' : 'Outfit') :
             (lang === 'zh' ? '配件' : 'Extras')}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
        {tab === 'skin' && (
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">
              {lang === 'zh' ? '膚色' : 'Skin Color'}
            </label>
            <div className="flex flex-wrap gap-2">
              {SKIN_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => update('skinColor', color)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    config.skinColor === color ? 'border-neon-coral scale-110' : 'border-transparent hover:border-border'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            <label className="text-xs text-muted-foreground mb-2 mt-4 block">
              {lang === 'zh' ? '表情' : 'Expression'}
            </label>
            <div className="flex gap-2">
              {EXPRESSIONS.map((exp, i) => (
                <button
                  key={i}
                  onClick={() => update('expression', i)}
                  className={`flex-1 py-2 rounded-lg text-center text-sm border transition-all ${
                    config.expression === i
                      ? 'border-neon-coral bg-neon-coral/10'
                      : 'border-border hover:border-foreground/30'
                  }`}
                >
                  <span className="text-lg">{exp.emoji}</span>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {lang === 'zh' ? exp.zh : exp.en}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'hair' && (
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">
              {lang === 'zh' ? '髮型' : 'Hair Style'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {HAIR_STYLES.map((style, i) => (
                <button
                  key={i}
                  onClick={() => update('hairStyle', i)}
                  className={`py-2 px-3 rounded-lg text-xs border transition-all ${
                    config.hairStyle === i
                      ? 'border-neon-coral bg-neon-coral/10 text-foreground'
                      : 'border-border text-muted-foreground hover:border-foreground/30'
                  }`}
                >
                  {lang === 'zh' ? style.zh : style.en}
                </button>
              ))}
            </div>

            <label className="text-xs text-muted-foreground mb-2 mt-4 block">
              {lang === 'zh' ? '髮色' : 'Hair Color'}
            </label>
            <div className="flex flex-wrap gap-2">
              {HAIR_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => update('hairColor', color)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    config.hairColor === color ? 'border-neon-coral scale-110' : 'border-transparent hover:border-border'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        )}

        {tab === 'outfit' && (
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">
              {lang === 'zh' ? '上衣顏色' : 'Shirt Color'}
            </label>
            <div className="flex flex-wrap gap-2">
              {SHIRT_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => update('shirtColor', color)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    config.shirtColor === color ? 'border-neon-coral scale-110' : 'border-transparent hover:border-border'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            <label className="text-xs text-muted-foreground mb-2 mt-4 block">
              {lang === 'zh' ? '褲子顏色' : 'Pants Color'}
            </label>
            <div className="flex flex-wrap gap-2">
              {PANTS_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => update('pantsColor', color)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    config.pantsColor === color ? 'border-neon-coral scale-110' : 'border-transparent hover:border-border'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        )}

        {tab === 'extras' && (
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">
              {lang === 'zh' ? '配飾' : 'Accessory'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ACCESSORIES.map((acc, i) => (
                <button
                  key={i}
                  onClick={() => update('accessory', i)}
                  className={`py-2 px-3 rounded-lg text-xs border transition-all ${
                    config.accessory === i
                      ? 'border-neon-coral bg-neon-coral/10 text-foreground'
                      : 'border-border text-muted-foreground hover:border-foreground/30'
                  }`}
                >
                  {lang === 'zh' ? acc.zh : acc.en}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="p-4 border-t border-border/50">
        <Button
          onClick={onSave}
          className="w-full bg-neon-coral hover:bg-neon-coral/90 text-white"
          size="sm"
        >
          {lang === 'zh' ? '儲存角色' : 'Save Avatar'}
        </Button>
      </div>
    </div>
  );
}
