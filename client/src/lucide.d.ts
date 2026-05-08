/**
 * Type declarations for the per-icon import path enabled in vite.config.ts.
 *
 * The Vite alias rewrites `lucide-react/icons/foo` to lucide-react's
 * internal ESM icon files. Those files don't ship .d.ts entries, so we
 * declare a generic module shape: each icon is a default-exported FC
 * accepting standard Lucide props.
 *
 * Usage:
 *   import Camera from 'lucide-react/icons/camera';   // ✅ small
 *   import { Camera } from 'lucide-react';            // ⚠ pulls barrel
 */
declare module 'lucide-react/icons/*' {
  import type { LucideProps } from 'lucide-react';
  import type { FC } from 'react';
  const Icon: FC<LucideProps>;
  export default Icon;
}
