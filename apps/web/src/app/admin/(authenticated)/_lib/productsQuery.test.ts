import { describe, it, expect } from 'vitest';
import { buildImportBatchFilter } from './productsQuery';

describe('buildImportBatchFilter', () => {
  it('returns null when the importBatch argument is missing', () => {
    expect(buildImportBatchFilter()).toBeNull();
    expect(buildImportBatchFilter(null)).toBeNull();
    expect(buildImportBatchFilter(undefined)).toBeNull();
  });

  it('returns null for empty / whitespace-only values', () => {
    expect(buildImportBatchFilter('')).toBeNull();
  });

  it('returns null for an empty array (Next.js repeated keys)', () => {
    expect(buildImportBatchFilter([])).toBeNull();
  });

  it('picks the first value when an array is given', () => {
    expect(buildImportBatchFilter(['batch-1', 'batch-2'])).toEqual({
      key: 'filters[importBatch][documentId][$eq]',
      value: 'batch-1',
    });
  });

  it('returns the filter pair for a single documentId', () => {
    expect(buildImportBatchFilter('abc-123')).toEqual({
      key: 'filters[importBatch][documentId][$eq]',
      value: 'abc-123',
    });
  });
});
