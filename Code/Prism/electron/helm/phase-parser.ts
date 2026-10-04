import type { HelmPhase } from '../../src/types/helm';

/**
 * Detects [[PRISM_PHASE: {phase}]] markers in IDE output.
 * Returns the last matched phase, or null if none found.
 */
export function parsePhaseMarkers(output: string): HelmPhase | null {
  const regex = /\[\[PRISM_PHASE:\s*(\w+)\s*\]\]/g;
  let lastMatch: HelmPhase | null = null;
  let match;

  while ((match = regex.exec(output)) !== null) {
    const phase = match[1];
    const validPhases: HelmPhase[] = [
      'init', 'explore', 'recon', 'grill', 'design', 'slice', 'code', 'test', 'debug', 'deploy'
    ];
    if (validPhases.includes(phase as HelmPhase)) {
      lastMatch = phase as HelmPhase;
    }
  }

  return lastMatch;
}
