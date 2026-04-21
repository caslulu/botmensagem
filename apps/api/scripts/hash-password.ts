import { PasswordService } from '../src/auth/password.service';

async function main() {
  const password = process.env.ADMIN_PASSWORD || process.argv[2] || '';

  if (password.length < 8) {
    console.error('Informe uma senha com pelo menos 8 caracteres via ADMIN_PASSWORD ou argumento.');
    process.exit(1);
  }

  const hash = await new PasswordService().hash(password);
  console.log(hash);
}

void main();
