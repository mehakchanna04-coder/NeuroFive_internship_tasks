/**
 * Unit tests for the JWT signing logic in controllers/authController.js.
 *
 * JWT_SECRET must be set BEFORE authController is required, since it's
 * read into a module-level constant at load time. No database or HTTP
 * server is involved — this only exercises the token-signing function.
 */

process.env.JWT_SECRET = 'unit_test_secret_do_not_use_in_prod';
process.env.JWT_EXPIRES_IN = '1h';

const jwt = require('jsonwebtoken');
const { signToken } = require('../../controllers/authController');

describe('signToken', () => {
  const fakeUser = {
    _id: { toString: () => '64f1a2b3c4d5e6f7a8b9c0d1' },
    email: 'unit-test-user@example.com',
  };

  test('returns a JWT whose payload contains the user id (as "sub") and email', () => {
    const token = signToken(fakeUser);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    expect(decoded.sub).toBe('64f1a2b3c4d5e6f7a8b9c0d1');
    expect(decoded.email).toBe('unit-test-user@example.com');
  });

  test('sets an expiry claim later than the issued-at claim', () => {
    const token = signToken(fakeUser);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    expect(decoded.exp).toBeGreaterThan(decoded.iat);
  });

  test('produces a token that fails verification against the wrong secret', () => {
    const token = signToken(fakeUser);
    expect(() => jwt.verify(token, 'a_completely_different_secret')).toThrow();
  });

  test('produces a different token for a different user', () => {
    const otherUser = {
      _id: { toString: () => '64f1a2b3c4d5e6f7a8b9c0d2' },
      email: 'someone-else@example.com',
    };
    const tokenA = signToken(fakeUser);
    const tokenB = signToken(otherUser);
    expect(tokenA).not.toBe(tokenB);
  });
});
