import { UnauthorizedException } from '@nestjs/common';
import { PasswordService } from '../src/auth/password.service';
import { TokenService } from '../src/auth/token.service';

describe('auth primitives', () => {
  it('hashes and verifies passwords with scrypt', async () => {
    const passwords = new PasswordService();
    const hash = await passwords.hash('senha-segura-123');

    expect(hash).toMatch(/^scrypt\$/);
    await expect(passwords.verify('senha-segura-123', hash)).resolves.toBe(true);
    await expect(passwords.verify('senha-errada-123', hash)).resolves.toBe(false);
  });

  it('signs and verifies auth tokens', () => {
    process.env.AUTH_SECRET = 'auth-test-secret-with-more-than-32-characters';
    const tokens = new TokenService();

    const signed = tokens.sign({
      id: 'user-1',
      email: 'admin@botmensagem.local',
      name: 'Admin',
      role: 'admin'
    });

    expect(tokens.verify(signed.token)).toMatchObject({
      sub: 'user-1',
      email: 'admin@botmensagem.local',
      role: 'admin'
    });
    expect(() => tokens.verify(`${signed.token}x`)).toThrow(UnauthorizedException);
  });
});
