import { db } from "./db";
import { companies, teams, employees } from "@shared/schema";
import { sql } from "drizzle-orm";

export async function seedDatabase() {
  console.log("Checking if seed data exists...");

  const existingCompanies = await db.select().from(companies);
  if (existingCompanies.length > 0) {
    console.log("Seed data already exists, skipping.");
    return;
  }

  console.log("Seeding database with Copilot Innovations data...");

  const [company] = await db
    .insert(companies)
    .values({
      name: "Copilot Innovations",
      slug: "copilot-innovations",
      logoUrl: null,
    })
    .returning();

  console.log("Created company:", company.name);

  const teamData = [
    { name: "Engineering", description: "Building the future of work" },
    { name: "Product", description: "Shaping the product vision" },
    { name: "Design", description: "Crafting beautiful experiences" },
    { name: "People & Culture", description: "Building our team and culture" },
    { name: "Sales", description: "Growing our customer base" },
  ];

  const createdTeams = await db
    .insert(teams)
    .values(teamData.map((t) => ({ ...t, companyId: company.id })))
    .returning();

  console.log("Created", createdTeams.length, "teams");

  const teamMap = new Map(createdTeams.map((t) => [t.name, t.id]));

  const sampleEmployees = [
    {
      companyId: company.id,
      teamId: teamMap.get("Engineering")!,
      role: "admin" as const,
      title: "CEO & Co-Founder",
      email: "sarah@copilot.io",
      firstName: "Sarah",
      lastName: "Chen",
      location: "San Francisco, CA",
      timezone: "PST",
      slackHandle: "sarah",
      whatIDo: "I lead our company vision and strategy, focusing on building tools that help teams work better together.",
      strengths: ["Strategic Thinking", "Leadership", "Communication"],
      funFacts: ["Former competitive chess player", "Loves hiking in Yosemite"],
      workingPreferences: "I prefer morning meetings and async communication for complex topics.",
    },
    {
      companyId: company.id,
      teamId: teamMap.get("Engineering")!,
      role: "manager" as const,
      title: "VP of Engineering",
      email: "marcus@copilot.io",
      firstName: "Marcus",
      lastName: "Johnson",
      location: "Austin, TX",
      timezone: "CST",
      slackHandle: "marcus",
      whatIDo: "I lead our engineering team, focusing on technical excellence and team growth.",
      strengths: ["Technical Skills", "Leadership", "Problem Solving"],
      funFacts: ["Plays jazz piano", "Makes amazing BBQ"],
      workingPreferences: "Deep work in the morning, meetings in the afternoon.",
    },
    {
      companyId: company.id,
      teamId: teamMap.get("Engineering")!,
      role: "member" as const,
      title: "Senior Software Engineer",
      email: "alex@copilot.io",
      firstName: "Alex",
      lastName: "Rivera",
      location: "Remote - Denver, CO",
      timezone: "MST",
      slackHandle: "alex",
      whatIDo: "Full-stack development with focus on frontend architecture and design systems.",
      strengths: ["Technical Skills", "Creativity", "Attention to Detail"],
      funFacts: ["Rock climbing enthusiast", "Amateur photographer"],
      workingPreferences: "I work best with clear requirements and creative freedom.",
    },
    {
      companyId: company.id,
      teamId: teamMap.get("Product")!,
      role: "manager" as const,
      title: "Head of Product",
      email: "priya@copilot.io",
      firstName: "Priya",
      lastName: "Patel",
      location: "New York, NY",
      timezone: "EST",
      slackHandle: "priya",
      whatIDo: "I lead product strategy and work closely with engineering and design to ship great products.",
      strengths: ["Strategic Thinking", "Customer Focus", "Data Analysis"],
      funFacts: ["Trained as a classical dancer", "Loves exploring NYC restaurants"],
      workingPreferences: "I'm most productive in the afternoon and prefer Zoom over Slack for complex discussions.",
    },
    {
      companyId: company.id,
      teamId: teamMap.get("Design")!,
      role: "manager" as const,
      title: "Design Lead",
      email: "jordan@copilot.io",
      firstName: "Jordan",
      lastName: "Kim",
      location: "Seattle, WA",
      timezone: "PST",
      slackHandle: "jordan",
      whatIDo: "I lead our design team, creating intuitive and beautiful product experiences.",
      strengths: ["Creativity", "Design Thinking", "Empathy"],
      funFacts: ["Illustrates children's books on the side", "Tea enthusiast"],
      workingPreferences: "I need quiet time for design work - please check my calendar before scheduling.",
    },
    {
      companyId: company.id,
      teamId: teamMap.get("People & Culture")!,
      role: "manager" as const,
      title: "Head of People",
      email: "maya@copilot.io",
      firstName: "Maya",
      lastName: "Thompson",
      location: "Los Angeles, CA",
      timezone: "PST",
      slackHandle: "maya",
      whatIDo: "I lead all things people - hiring, culture, and employee experience.",
      strengths: ["Empathy", "Communication", "Leadership"],
      funFacts: ["Certified yoga instructor", "Rescue dog mom"],
      workingPreferences: "Always happy to chat! Drop by anytime or schedule a 1:1.",
    },
    {
      companyId: company.id,
      teamId: teamMap.get("Engineering")!,
      role: "member" as const,
      title: "Software Engineer",
      email: "david@copilot.io",
      firstName: "David",
      lastName: "Lee",
      location: "Remote - Portland, OR",
      timezone: "PST",
      slackHandle: "david",
      whatIDo: "Backend development and infrastructure, making sure our systems are fast and reliable.",
      strengths: ["Technical Skills", "Problem Solving", "Adaptability"],
      funFacts: ["Homebrewer", "Board game collector"],
      workingPreferences: "Async first! I check Slack in batches to stay focused.",
    },
    {
      companyId: company.id,
      teamId: teamMap.get("Sales")!,
      role: "manager" as const,
      title: "Sales Director",
      email: "rachel@copilot.io",
      firstName: "Rachel",
      lastName: "Garcia",
      location: "Chicago, IL",
      timezone: "CST",
      slackHandle: "rachel",
      whatIDo: "I lead our sales team and help customers discover how Copilot can transform their workplace.",
      strengths: ["Communication", "Customer Focus", "Collaboration"],
      funFacts: ["Former college soccer player", "Bakes amazing cookies"],
      workingPreferences: "Best reached by phone or quick Slack message. Always happy to jump on a call!",
    },
  ];

  const managerEmployee = sampleEmployees[1];
  const createdEmployees = await db.insert(employees).values(sampleEmployees).returning();

  console.log("Created", createdEmployees.length, "employees");

  const managerRecord = createdEmployees.find((e) => e.email === "marcus@copilot.io");
  if (managerRecord) {
    const engineeringMembers = createdEmployees.filter(
      (e) => e.teamId === teamMap.get("Engineering") && e.role === "member"
    );
    for (const member of engineeringMembers) {
      await db
        .update(employees)
        .set({ managerId: managerRecord.id })
        .where(sql`${employees.id} = ${member.id}`);
    }
    console.log("Set manager relationships for engineering team");
  }

  console.log("Database seeded successfully!");
}
