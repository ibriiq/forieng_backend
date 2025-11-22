import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma ?? new PrismaClient(
  ({
  // log: ['query'],
  // log: ['query', 'info', 'warn', 'error'],
  // errorFormat: 'pretty',
})
);

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}



// Listen for query events to see actual values
// prisma.$on('query', (e) => {
//   console.log('Query: ' + e.query);
//   console.log('Params: ' + e.params); // This shows the actual parameter values
//   console.log('Duration: ' + e.duration + 'ms');
// });


export default prisma;

