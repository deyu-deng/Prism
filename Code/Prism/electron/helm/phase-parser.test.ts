import { describe, it, expect } from 'vitest';
import { parsePhaseMarkers } from './phase-parser';

describe('parsePhaseMarkers', () => {
  it('detects [[PRISM_PHASE: design]] and returns design', () => {
    const result = parsePhaseMarkers('Some output\n[[PRISM_PHASE: design]]\nMore output');
    expect(result).toBe('design');
  });

  it('returns null when no phase marker is present', () => {
    const result = parsePhaseMarkers('Just some normal text without markers');
    expect(result).toBeNull();
  });

  it('detects explore phase', () => {
    expect(parsePhaseMarkers('[[PRISM_PHASE: explore]]')).toBe('explore');
  });

  it('detects slice phase', () => {
    expect(parsePhaseMarkers('[[PRISM_PHASE: slice]]')).toBe('slice');
  });

  it('returns the last phase marker if multiple are present', () => {
    const result = parsePhaseMarkers('[[PRISM_PHASE: explore]] then [[PRISM_PHASE: code]]');
    expect(result).toBe('code');
  });
});
