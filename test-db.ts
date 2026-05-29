import prisma from './src/lib/db'; prisma.user.findMany().then(console.log).catch(console.error).finally(()=>prisma.$disconnect());
