import type { PlazaPlayer } from '@/lib/plaza';

interface MiniMapProps {
  players: PlazaPlayer[];
  myPosition: { x: number; z: number };
  /** Journey entries — shows numbered waypoints (most recent 4 by default). */
  waypoints?: Array<{ zone: string; sequenceNumber: number }>;
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

const ZONE_POSITIONS: Record<string, { x: number; z: number; color: string }> = {
  center: { x: 0, z: 0, color: '#4ECDC4' },
  study: { x: -18, z: -15, color: '#45B7D1' },
  social: { x: 18, z: -15, color: '#FF6B6B' },
  dating: { x: -18, z: 18, color: '#C4B5FD' },
  cafe: { x: 18, z: 18, color: '#FFA07A' },
};

export default function MiniMap({ players, myPosition, waypoints = [] }: MiniMapProps) {
  const toMap = (worldX: number, worldZ: number) => ({
    x: (worldX + MAP_SIZE / 2) * SCALE,
    y: (worldZ + MAP_SIZE / 2) * SCALE,
  });

  const myMapPos = toMap(myPosition.x, myPosition.z);
  const centerPos = toMap(0, 0);

  // Last 4 waypoints, deduplicated by zone (keep newest for repeated visits)
  const recentWaypoints = (() => {
    const seen = new Map<string, { zone: string; sequenceNumber: number }>();
    for (const wp of waypoints) {
      seen.set(wp.zone, wp); // Newer entries override older
    }
    // Take last 4 entries in insertion order, then sort by sequenceNumber asc
    return Array.from(seen.values())
      .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
      .slice(-4);
  })();

  // Compute path between waypoints (for the journey trail)
  const pathSegments: Array<{ from: { x: number; y: number }; to: { x: number; y: number } }> = [];
  for (let i = 0; i < recentWaypoints.length - 1; i++) {
    const a = ZONE_POSITIONS[recentWaypoints[i].zone];
    const b = ZONE_POSITIONS[recentWaypoints[i + 1].zone];
    if (!a || !b) continue;
    pathSegments.push({ from: toMap(a.x, a.z), to: toMap(b.x, b.z) });
  }

  return (
    <div
      className="relative w-40 h-40 rounded-2xl overflow-hidden shadow-2xl border border-white/30"
      style={{
        boxShadow:
          '0 10px 30px -10px rgba(0,0,0,0.3), 0 4px 12px -4px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.4)',
      }}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full block">
        <defs>
          <radialGradient id="mapBg" cx="50%" cy="50%" r="75%">
            <stop offset="0%" stopColor="#DCEDC8" />
            <stop offset="60%" stopColor="#AED581" />
            <stop offset="100%" stopColor="#8BC34A" />
          </radialGradient>
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4ECDC4" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#4ECDC4" stopOpacity="0" />
          </radialGradient>
          <filter id="blur1"><feGaussianBlur stdDeviation="0.4" /></filter>
        </defs>

        <rect width="100" height="100" fill="url(#mapBg)" />

        {/* Pathways — curved spokes radiating from centre */}
        <g stroke="#D7BF95" strokeWidth="3" strokeLinecap="round" opacity="0.85" fill="none">
          {ZONES.filter(z => z.name !== 'center').map(zone => {
            const p = toMap(zone.cx, zone.cz);
            const midX = (centerPos.x + p.x) / 2 + (p.x > centerPos.x ? 3 : -3);
            const midY = (centerPos.y + p.y) / 2 + (p.y > centerPos.y ? 3 : -3);
            return (
              <path
                key={`path-${zone.name}`}
                d={`M ${centerPos.x} ${centerPos.y} Q ${midX} ${midY} ${p.x} ${p.y}`}
              />
            );
          })}
          <line x1={centerPos.x} y1={centerPos.y} x2={centerPos.x} y2="6" />
          <line x1={centerPos.x} y1={centerPos.y} x2={centerPos.x} y2="94" />
          <line x1={centerPos.x} y1={centerPos.y} x2="6" y2={centerPos.y} />
          <line x1={centerPos.x} y1={centerPos.y} x2="94" y2={centerPos.y} />
        </g>

        {/* Path border outlines (lighter) */}
        <g stroke="#F0E4C7" strokeWidth="1" strokeLinecap="round" opacity="0.6" fill="none">
          {ZONES.filter(z => z.name !== 'center').map(zone => {
            const p = toMap(zone.cx, zone.cz);
            const midX = (centerPos.x + p.x) / 2 + (p.x > centerPos.x ? 3 : -3);
            const midY = (centerPos.y + p.y) / 2 + (p.y > centerPos.y ? 3 : -3);
            return (
              <path
                key={`path2-${zone.name}`}
                d={`M ${centerPos.x} ${centerPos.y} Q ${midX} ${midY} ${p.x} ${p.y}`}
              />
            );
          })}
        </g>

        {/* Central glow */}
        <circle cx={centerPos.x} cy={centerPos.y} r="16" fill="url(#centerGlow)" />

        {/* Zone discs */}
        {ZONES.map(zone => {
          const pos = toMap(zone.cx, zone.cz);
          return (
            <g key={zone.name}>
              <circle cx={pos.x} cy={pos.y} r={zone.r * SCALE + 1.5} fill={zone.color} opacity="0.25" filter="url(#blur1)" />
              <circle cx={pos.x} cy={pos.y} r={zone.r * SCALE} fill={zone.color} opacity="0.45" stroke={zone.color} strokeWidth="0.7" strokeOpacity="0.95" />
            </g>
          );
        })}

        {/* Central fountain */}
        <g>
          <circle cx={centerPos.x} cy={centerPos.y} r="3.2" fill="#E8E8E8" stroke="#9AA5B5" strokeWidth="0.4" />
          <circle cx={centerPos.x} cy={centerPos.y} r="1.6" fill="#6AC7C0" />
          <circle cx={centerPos.x} cy={centerPos.y} r="0.7" fill="#FFFFFF" opacity="0.7" />
        </g>

        {/* Landmark mini-icons */}
        {(() => {
          const p = toMap(-18, -15);
          return (
            <g transform={`translate(${p.x - 3} ${p.y - 2})`}>
              <rect width="6" height="4" rx="0.6" fill="#A67B4E" />
              <line x1="1.5" y1="0" x2="1.5" y2="4" stroke="#6B4E2A" strokeWidth="0.4" />
              <line x1="3" y1="0" x2="3" y2="4" stroke="#6B4E2A" strokeWidth="0.4" />
              <line x1="4.5" y1="0" x2="4.5" y2="4" stroke="#6B4E2A" strokeWidth="0.4" />
            </g>
          );
        })()}
        {(() => {
          const p = toMap(18, -15);
          return (
            <g transform={`translate(${p.x - 3} ${p.y - 2})`}>
              <ellipse cx="3" cy="2" rx="3" ry="1.8" fill="#E91E63" />
              <rect x="2.5" y="0.5" width="1" height="2" fill="#7B1FA2" rx="0.15" />
            </g>
          );
        })()}
        {(() => {
          const p = toMap(-18, 18);
          return (
            <g transform={`translate(${p.x} ${p.y})`}>
              <path d="M 0,-2 C -1.2,-3.2 -3,-2.5 -3,-1 C -3,0.5 -1.5,1.5 0,2.5 C 1.5,1.5 3,0.5 3,-1 C 3,-2.5 1.2,-3.2 0,-2 Z" fill="#F06292" stroke="#C2185B" strokeWidth="0.3" />
            </g>
          );
        })()}
        {(() => {
          const p = toMap(18, 18);
          return (
            <g transform={`translate(${p.x - 2.5} ${p.y - 2.5})`}>
              <path d="M 0,2.5 A 2.5,2.5 0 0 1 5,2.5 Z" fill="#D32F2F" />
              <path d="M 1.25,2.5 A 1.25,1.25 0 0 1 3.75,2.5 Z" fill="#FFFFFF" />
              <rect x="2.35" y="2.5" width="0.3" height="2.2" fill="#5D4037" />
            </g>
          );
        })()}

        {/* Scattered decorative trees */}
        <g opacity="0.75">
          {[
            [15, 25], [85, 25], [12, 52], [88, 52],
            [30, 10], [70, 10], [30, 90], [70, 90],
            [50, 15], [50, 85], [60, 45], [40, 55],
          ].map(([cx, cy], i) => (
            <g key={`tree-${i}`}>
              <circle cx={cx} cy={cy} r="1.8" fill="#388E3C" />
              <circle cx={cx - 0.3} cy={cy - 0.3} r="1.3" fill="#4CAF50" />
            </g>
          ))}
        </g>

        {/* Journey path — dashed line connecting waypoints */}
        {pathSegments.length > 0 && (
          <g stroke="#1E293B" strokeWidth="0.7" strokeDasharray="1.8 1.2" fill="none" opacity="0.55">
            {pathSegments.map((seg, i) => (
              <line
                key={`seg-${i}`}
                x1={seg.from.x}
                y1={seg.from.y}
                x2={seg.to.x}
                y2={seg.to.y}
              />
            ))}
          </g>
        )}

        {/* Other players */}
        {players.filter(p => !p.is_me).map(player => {
          const pos = toMap(player.x, player.z);
          return (
            <g key={player.id}>
              <circle cx={pos.x} cy={pos.y} r={2.2} fill="#6C63FF" opacity="0.4" />
              <circle cx={pos.x} cy={pos.y} r={1.4} fill="#6C63FF" stroke="white" strokeWidth="0.3" />
            </g>
          );
        })}

        {/* Numbered waypoints — concept-art 1/2/3/4 markers */}
        {recentWaypoints.map((wp, i) => {
          const zpos = ZONE_POSITIONS[wp.zone];
          if (!zpos) return null;
          const p = toMap(zpos.x, zpos.z);
          const isLatest = i === recentWaypoints.length - 1;
          // Display label 1-based index within the recent set
          const displayNum = i + 1;
          return (
            <g key={`wp-${wp.sequenceNumber}`}>
              <circle
                cx={p.x}
                cy={p.y}
                r="3.8"
                fill="white"
                stroke={zpos.color}
                strokeWidth="1"
                opacity={isLatest ? 1 : 0.9}
              />
              {isLatest && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="5.5"
                  fill="none"
                  stroke={zpos.color}
                  strokeWidth="0.6"
                  opacity="0.6"
                >
                  <animate attributeName="r" values="4;7;4" dur="1.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.6;0;0.6" dur="1.8s" repeatCount="indefinite" />
                </circle>
              )}
              <text
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="4.5"
                fontWeight="700"
                fill={zpos.color}
                fontFamily="system-ui, sans-serif"
              >
                {displayNum}
              </text>
            </g>
          );
        })}

        {/* Me — pulsing accent */}
        <g>
          <circle cx={myMapPos.x} cy={myMapPos.y} r="4" fill="#FF6B6B" opacity="0.3">
            <animate attributeName="r" values="3.5;6.5;3.5" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4;0.05;0.4" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx={myMapPos.x} cy={myMapPos.y} r="2.3" fill="#FF6B6B" stroke="white" strokeWidth="0.7" />
          <circle cx={myMapPos.x} cy={myMapPos.y} r="0.9" fill="white" />
        </g>
      </svg>

      <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 bg-black/50 backdrop-blur-md px-1.5 py-0.5 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_4px_rgba(74,222,128,0.8)]" />
        <span className="text-[9px] text-white font-semibold tracking-wide">
          {players.length} online
        </span>
      </div>

      <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
        <span className="text-[8px] font-bold text-white leading-none">N</span>
      </div>

      <div className="absolute top-1.5 right-1.5 bg-white/60 backdrop-blur-sm px-1.5 py-0.5 rounded-md">
        <span className="text-[8px] font-bold text-slate-700 tracking-wider uppercase">Map</span>
      </div>
    </div>
  );
}
