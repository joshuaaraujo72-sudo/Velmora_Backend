import prisma from "./prismaService.js";

export const listEvents = () =>
  prisma.event.findMany({
    include: {
      creator: true,
    },
    orderBy: {
      startsAt: "asc",
    },
  });
