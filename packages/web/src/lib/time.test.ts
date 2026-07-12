import { describe, expect, it } from 'vitest';
import { calculateTotalHours } from './time';

describe('calculateTotalHours', () => {
  it('calculates normal workday and excludes noon break', () => {
    expect(calculateTotalHours('08:00', '17:00')).toBe(8);
  });

  it('handles midnight range', () => {
    expect(calculateTotalHours('00:00', '01:00')).toBe(1);
  });

  it('fully excludes noon break window', () => {
    expect(calculateTotalHours('12:00', '13:00')).toBe(0);
  });

  it('partially overlaps noon break', () => {
    expect(calculateTotalHours('11:30', '13:30')).toBe(1);
  });

  it('handles overnight shift', () => {
    expect(calculateTotalHours('23:00', '01:00')).toBe(2);
  });

  it('supports 12-hour format with AM/PM', () => {
    expect(calculateTotalHours('12:00 AM', '1:00 PM')).toBe(12);
  });

  it('returns 0 for invalid time input', () => {
    expect(calculateTotalHours('invalid', '13:00')).toBe(0);
  });
});
