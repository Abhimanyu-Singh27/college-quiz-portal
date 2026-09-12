import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.sessionConfig.upsert({
    where: { id: "default-session-config" },
    update: {},
    create: {
      id: "default-session-config",
      maxConcurrentAdmins: 1,
      maxConcurrentControllers: 2,
      maxConcurrentStudents: 999,
    },
  });

  console.log("Session configuration initialized.");
  console.log("Create the first administrator from the portal login page.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
