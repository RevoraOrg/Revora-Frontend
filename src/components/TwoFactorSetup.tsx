/**
 * Public re-export shim.
 *
 * The implementation has been moved to `./TwoFactorSetup/` (see index.tsx).
 * This file keeps the original import path working for all existing consumers:
 *
 *   import { TwoFactorSetup } from './TwoFactorSetup'          ✓
 *   import { buildTotpUri }   from './TwoFactorSetup'          ✓
 */
export { TwoFactorSetup, buildTotpUri } from './TwoFactorSetup/index';
