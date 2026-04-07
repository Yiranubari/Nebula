import { PrismaClient, Role, TaskStatus, Priority } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

async function main() {
  const passwordHash = await bcrypt.hash("password123", SALT_ROUNDS);

  const admin = await prisma.user.upsert({
    where: { email: "admin@nebula.dev" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@nebula.dev",
      passwordHash,
      role: Role.ADMIN,
      avatar: "https://api.dicebear.com/9.x/initials/svg?seed=AU",
    },
  });

  const members = await Promise.all(
    [
      { name: "Alice Chen", email: "alice@nebula.dev" },
      { name: "Bob Martinez", email: "bob@nebula.dev" },
      { name: "Carol Davis", email: "carol@nebula.dev" },
      { name: "Dan Kim", email: "dan@nebula.dev" },
    ].map((u) =>
      prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: {
          name: u.name,
          email: u.email,
          passwordHash,
          role: Role.MEMBER,
          avatar: `https://api.dicebear.com/9.x/initials/svg?seed=${u.name.split(" ").map((n) => n[0]).join("")}`,
        },
      })
    )
  );

  const allUsers = [admin, ...members];

  const generalTrack = await prisma.track.upsert({
    where: { id: "track-general" },
    update: {},
    create: {
      id: "track-general",
      name: "General",
    },
  });

  const devTrack = await prisma.track.upsert({
    where: { id: "track-dev" },
    update: {},
    create: {
      id: "track-dev",
      name: "Development",
    },
  });

  for (const user of allUsers) {
    for (const track of [generalTrack, devTrack]) {
      await prisma.trackMember.upsert({
        where: {
          trackId_userId: { trackId: track.id, userId: user.id },
        },
        update: {},
        create: {
          trackId: track.id,
          userId: user.id,
        },
      });
    }
  }

  const taskData = [
    { title: "Set up CI/CD pipeline", status: TaskStatus.DONE, priority: Priority.HIGH, assigneeIdx: 1, hours: 8 },
    { title: "Design database schema", status: TaskStatus.DONE, priority: Priority.CRITICAL, assigneeIdx: 0, hours: 4 },
    { title: "Implement user authentication", status: TaskStatus.IN_PROGRESS, priority: Priority.CRITICAL, assigneeIdx: 1, hours: 12 },
    { title: "Build dashboard page", status: TaskStatus.IN_PROGRESS, priority: Priority.HIGH, assigneeIdx: 2, hours: 16 },
    { title: "Create notification system", status: TaskStatus.TODO, priority: Priority.MEDIUM, assigneeIdx: 3, hours: 10 },
    { title: "Write API documentation", status: TaskStatus.TODO, priority: Priority.LOW, assigneeIdx: 4, hours: 6 },
    { title: "Set up error monitoring", status: TaskStatus.TODO, priority: Priority.MEDIUM, assigneeIdx: 1, hours: 4 },
    { title: "Implement file upload service", status: TaskStatus.REVIEW, priority: Priority.HIGH, assigneeIdx: 2, hours: 8 },
    { title: "Add dark mode support", status: TaskStatus.DONE, priority: Priority.LOW, assigneeIdx: 3, hours: 6 },
    { title: "Optimize database queries", status: TaskStatus.TODO, priority: Priority.HIGH, assigneeIdx: 4, hours: 12 },
  ];

  for (const t of taskData) {
    await prisma.task.create({
      data: {
        title: t.title,
        status: t.status,
        priority: t.priority,
        assigneeId: allUsers[t.assigneeIdx].id,
        estimatedHours: t.hours,
        labels: [],
      },
    });
  }

  console.log(`Seeded ${allUsers.length} users, 2 tracks, ${taskData.length} tasks`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
