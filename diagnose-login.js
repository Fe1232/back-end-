// Run once, temporarily, to diagnose the bcrypt mismatch.
// node diagnose-login.js <email>
import prisma from './lib/prisma.js';
import bcrypt from 'bcrypt';

const email = process.argv[2];

if (!email) {
    console.log('Uso: node diagnose-login.js seuemail@teste.com');
    process.exit(1);
}

const user = await prisma.user.findUnique({ where: { email } });

if (!user) {
    console.log('Nenhum usuário encontrado com esse email.');
    process.exit(0);
}

console.log('Hash salvo no banco:', user.key);
console.log('Formato válido de hash bcrypt?', user.key.startsWith('$2'));

// Testa alguns candidatos comuns — ajuste a lista com o que você lembra de ter digitado
const candidates = ['123', '1234', '12345', '123456'];

for (const candidate of candidates) {
    const matches = await bcrypt.compare(candidate, user.key);
    console.log(`Testando "${candidate}":`, matches ? '✅ BATE' : '❌ não bate');
}

await prisma.$disconnect();