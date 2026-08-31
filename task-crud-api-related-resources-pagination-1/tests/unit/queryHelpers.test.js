/**
 * Unit tests for utils/queryHelpers.js.
 *
 * These are pure functions with no side effects — no database, no HTTP,
 * no mocking required. They run in milliseconds and are the fastest,
 * cheapest tests in the suite to keep green.
 */

const { parsePagination, parseSort } = require('../../utils/queryHelpers');

describe('parsePagination', () => {
  test('defaults to page 1 and limit 10 when nothing is provided', () => {
    expect(parsePagination({})).toEqual({ page: 1, limit: 10, skip: 0 });
  });

  test('parses valid page/limit strings and computes skip correctly', () => {
    expect(parsePagination({ page: '3', limit: '5' })).toEqual({
      page: 3,
      limit: 5,
      skip: 10,
    });
  });

  test('falls back to defaults for non-numeric or invalid values', () => {
    expect(parsePagination({ page: 'abc', limit: 'xyz' })).toEqual({
      page: 1,
      limit: 10,
      skip: 0,
    });
  });

  test('falls back to defaults for page/limit below 1', () => {
    expect(parsePagination({ page: '0', limit: '-5' })).toEqual({
      page: 1,
      limit: 10,
      skip: 0,
    });
  });

  test('clamps limit to a maximum of 100, even if a larger value is requested', () => {
    expect(parsePagination({ page: '1', limit: '9999' })).toEqual({
      page: 1,
      limit: 100,
      skip: 0,
    });
  });
});

describe('parseSort', () => {
  const ALLOWED_FIELDS = ['createdAt', 'title'];
  const DEFAULT_SORT = { createdAt: -1 };

  test('returns the default sort when sortBy is not provided', () => {
    expect(parseSort(undefined, ALLOWED_FIELDS, DEFAULT_SORT)).toEqual(DEFAULT_SORT);
  });

  test('returns ascending sort for an allowed field', () => {
    expect(parseSort('title', ALLOWED_FIELDS, DEFAULT_SORT)).toEqual({ title: 1 });
  });

  test('returns descending sort when the field is prefixed with "-"', () => {
    expect(parseSort('-title', ALLOWED_FIELDS, DEFAULT_SORT)).toEqual({ title: -1 });
  });

  test('falls back to the default sort for a field not in the allow-list', () => {
    // "password" is not in ALLOWED_FIELDS, so clients can't sort by
    // arbitrary/internal fields even if they guess a field name.
    expect(parseSort('password', ALLOWED_FIELDS, DEFAULT_SORT)).toEqual(DEFAULT_SORT);
  });
});
