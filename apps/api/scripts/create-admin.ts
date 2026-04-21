import { PrismaClient } from '@prisma/client';
import { PasswordService } from '../src/auth/password.service';

async function main() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  const name = (process.env.ADMIN_NAME || email.split('@')[0] || 'Admin').trim();

  if (!email || !email.includes('@')) {
    console.error('Informe ADMIN_EMAIL com um email valido.');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Informe ADMIN_PASSWORD com pelo menos 8 caracteres.');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const passwordHash = await new PasswordService().hash(password);

  try {
    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        name,
        passwordHash,
        role: 'admin',
        isActive: true
      },
      update: {
        name,
        passwordHash,
        role: 'admin',
        isActive: true
      },
      select: {
        email: true,
        name: true,
        role: true
      }
    });

    console.log(`Admin pronto: ${user.name} <${user.email}> (${user.role})`);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
