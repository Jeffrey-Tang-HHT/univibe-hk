import { useMemo } from 'react';
import type { PlazaPlayer } from '@/lib/plaza';

interface MiniMapProps {
  players: PlazaPlayer[];
  myPosition: { x: number; z: number };
}

const MAP_SIZE = 140;
const SCALE = 100 / MAP_SIZE;

const ZONES = [
  { name: 'center', cx: 0, cz: 0, r: 6, color: '#4ECDC4' },
  { name: 'study', cx: -18, cz: -15, r: 7, color: '#45B7D1' },
  { name: 'social', cx: 18, cz: -15, r: 7, color: '#FF6B6B' },
  { name: 'dating', cx: -18, cz: 18, r: 7, color: '#C4B5FD' },
  { name: 'cafe', cx: 18, cz: 18, r: 7, color: '#FFA07A' },
];

export default function MiniMap({ players, myPosition }: MiniMapProps) {
  const toMap = (worldX: number, worldZ: number) => ({
    x: (worldX + MAP_SIZE / 2) * SCALE,
    y: (worldZ + MAP_SIZE / 2) * SCALE,
  });

  const myMapPos = toMap(myPosition.x, myPosition.z);

  return (
    <div className="absolute bottom-20 lg:bottom-4 left-4 z-40">
      <div className="w-36 h-36 bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl overflow-hidden shadow-lg">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Background */}
          <rect width="100" height="100" fill="hsl(var(--muted))" opacity="0.3" />

          {/* Zones */}
          {ZONES.map(zone => {
            const pos = toMap(zone.cx, zone.cz);
            return (
              <circle
                key={zone.name}
                cx={pos.x}
                cy={pos.y}
                r={zone.r * SCALE}
                fill={zone.color}
                opacity={0.2}
                stroke={zone.color}
                strokeWidth={0.5}
                strokeOpacity={0.5}
              />
            );
          })}

          {/* Pathways */}
          <line x1="50" y1="0" x2="50" y2="100" stroke="hsl(var(--border))" strokeWidth="1.5" opacity="0.3" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="hsl(var(--border))" strokeWidth="1.5" opacity="0.3" />

          {/* Other players */}
          {players.filter(p => !p.is_me).map(player => {
            const pos = toMap(player.x, player.z);
            return (
              <circle
                key={player.id}
                cx={pos.x}
                cy={pos.y}
                r={2}
                fill="#6C63FF"
                opacity={0.7}
              />
            );
          })}

          {/* Me */}
          <circle cx={myMapPos.x} cy={myMapPos.y} r={3} fill="#FF6B6B" />
          <circle cx={myMapPos.x} cy={myMapPos.y} r={5} fill="none" stroke="#FF6B6B" strokeWidth={0.8} opacity={0.5}>
            <animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.5;0.2;0.5" dur="2s" repeatCount="indefinite" />
          </circle>
        </svg>

        {/* Player count */}
        <div className="absolute bottom-1 right-1.5 text-[9px] text-muted-foreground bg-card/60 px-1 rounded">
          {players.length} online
        </div>
      </div>
    </div>
  );
}
