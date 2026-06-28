/**
 * useDensity — Issue #174
 *
 * Returns the current global density mode and a setter.
 * Must be used inside <DensityProvider>.
 */

import { useContext } from 'react';
import { DensityContext } from '../components/DensityProvider/DensityProvider';

export { type DensityMode } from '../components/DensityProvider/DensityProvider';

export function useDensity() {
  const ctx = useContext(DensityContext);
  if (!ctx) {
    throw new Error('useDensity must be used inside <DensityProvider>');
  }
  return ctx;
}
