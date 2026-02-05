import { db } from "./db";
import { companies, teams, employees, goals, snaps, feedbackRequests, feedback, activities } from "@shared/schema";
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
      profileImageUrl: "/images/profiles/profile-sarah.jpg",
      location: "San Francisco, CA",
      timezone: "PST",
      slackHandle: "sarah",
      whatIDo: "I lead our company vision and strategy, focusing on building tools that help teams work better together.",
      strengths: ["Strategic Thinking", "Leadership", "Communication"],
      funFacts: ["Former competitive chess player", "Loves hiking in Yosemite"],
      workingPreferences: "I prefer morning meetings and async communication for complex topics.",
      isProfileComplete: true,
    },
    {
      companyId: company.id,
      teamId: teamMap.get("Engineering")!,
      role: "manager" as const,
      title: "VP of Engineering",
      email: "marcus@copilot.io",
      firstName: "Marcus",
      lastName: "Johnson",
      profileImageUrl: "/images/profiles/profile-marcus.jpg",
      location: "Austin, TX",
      timezone: "CST",
      slackHandle: "marcus",
      whatIDo: "I lead our engineering team, focusing on technical excellence and team growth.",
      strengths: ["Technical Skills", "Leadership", "Problem Solving"],
      funFacts: ["Plays jazz piano", "Makes amazing BBQ"],
      workingPreferences: "Deep work in the morning, meetings in the afternoon.",
      isProfileComplete: true,
    },
    {
      companyId: company.id,
      teamId: teamMap.get("Engineering")!,
      role: "member" as const,
      title: "Senior Software Engineer",
      email: "alex@copilot.io",
      firstName: "Alex",
      lastName: "Rivera",
      profileImageUrl: "/images/profiles/profile-alex.jpg",
      location: "Remote - Denver, CO",
      timezone: "MST",
      slackHandle: "alex",
      whatIDo: "Full-stack development with focus on frontend architecture and design systems.",
      strengths: ["Technical Skills", "Creativity", "Attention to Detail"],
      funFacts: ["Rock climbing enthusiast", "Amateur photographer"],
      workingPreferences: "I work best with clear requirements and creative freedom.",
      isProfileComplete: true,
    },
    {
      companyId: company.id,
      teamId: teamMap.get("Product")!,
      role: "manager" as const,
      title: "Head of Product",
      email: "priya@copilot.io",
      firstName: "Priya",
      lastName: "Patel",
      profileImageUrl: "/images/profiles/profile-priya.jpg",
      location: "New York, NY",
      timezone: "EST",
      slackHandle: "priya",
      whatIDo: "I lead product strategy and work closely with engineering and design to ship great products.",
      strengths: ["Strategic Thinking", "Customer Focus", "Data Analysis"],
      funFacts: ["Trained as a classical dancer", "Loves exploring NYC restaurants"],
      workingPreferences: "I'm most productive in the afternoon and prefer Zoom over Slack for complex discussions.",
      isProfileComplete: true,
    },
    {
      companyId: company.id,
      teamId: teamMap.get("Design")!,
      role: "manager" as const,
      title: "Design Lead",
      email: "jordan@copilot.io",
      firstName: "Jordan",
      lastName: "Kim",
      profileImageUrl: "/images/profiles/profile-jordan.jpg",
      location: "Seattle, WA",
      timezone: "PST",
      slackHandle: "jordan",
      whatIDo: "I lead our design team, creating intuitive and beautiful product experiences.",
      strengths: ["Creativity", "Design Thinking", "Empathy"],
      funFacts: ["Illustrates children's books on the side", "Tea enthusiast"],
      workingPreferences: "I need quiet time for design work - please check my calendar before scheduling.",
      isProfileComplete: true,
    },
    {
      companyId: company.id,
      teamId: teamMap.get("People & Culture")!,
      role: "manager" as const,
      title: "Head of People",
      email: "maya@copilot.io",
      firstName: "Maya",
      lastName: "Thompson",
      profileImageUrl: "/images/profiles/profile-maya.jpg",
      location: "Los Angeles, CA",
      timezone: "PST",
      slackHandle: "maya",
      whatIDo: "I lead all things people - hiring, culture, and employee experience.",
      strengths: ["Empathy", "Communication", "Leadership"],
      funFacts: ["Certified yoga instructor", "Rescue dog mom"],
      workingPreferences: "Always happy to chat! Drop by anytime or schedule a 1:1.",
      isProfileComplete: true,
    },
    {
      companyId: company.id,
      teamId: teamMap.get("Engineering")!,
      role: "member" as const,
      title: "Software Engineer",
      email: "david@copilot.io",
      firstName: "David",
      lastName: "Lee",
      profileImageUrl: "/images/profiles/profile-david.jpg",
      location: "Remote - Portland, OR",
      timezone: "PST",
      slackHandle: "david",
      whatIDo: "Backend development and infrastructure, making sure our systems are fast and reliable.",
      strengths: ["Technical Skills", "Problem Solving", "Adaptability"],
      funFacts: ["Homebrewer", "Board game collector"],
      workingPreferences: "Async first! I check Slack in batches to stay focused.",
      isProfileComplete: true,
    },
    {
      companyId: company.id,
      teamId: teamMap.get("Sales")!,
      role: "manager" as const,
      title: "Sales Director",
      email: "rachel@copilot.io",
      firstName: "Rachel",
      lastName: "Garcia",
      profileImageUrl: "/images/profiles/profile-rachel.jpg",
      location: "Chicago, IL",
      timezone: "CST",
      slackHandle: "rachel",
      whatIDo: "I lead our sales team and help customers discover how Copilot can transform their workplace.",
      strengths: ["Communication", "Customer Focus", "Collaboration"],
      funFacts: ["Former college soccer player", "Bakes amazing cookies"],
      workingPreferences: "Best reached by phone or quick Slack message. Always happy to jump on a call!",
      isProfileComplete: true,
    },
  ];

  const createdEmployees = await db.insert(employees).values(sampleEmployees).returning();
  console.log("Created", createdEmployees.length, "employees");

  const empMap = new Map(createdEmployees.map((e) => [e.email, e.id]));

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

  const sarah = empMap.get("sarah@copilot.io")!;
  const marcus = empMap.get("marcus@copilot.io")!;
  const alex = empMap.get("alex@copilot.io")!;
  const priya = empMap.get("priya@copilot.io")!;
  const jordan = empMap.get("jordan@copilot.io")!;
  const maya = empMap.get("maya@copilot.io")!;
  const david = empMap.get("david@copilot.io")!;
  const rachel = empMap.get("rachel@copilot.io")!;
  const cid = company.id;

  await db.insert(goals).values([
    { employeeId: sarah, companyId: cid, title: "Launch Series A fundraising strategy", description: "Develop investor pitch deck and identify top 20 target VCs for Series A round", category: "delivery", status: "on_track", visibility: "team", progress: 65, quarter: "Q1 2026" },
    { employeeId: sarah, companyId: cid, title: "Complete executive coaching program", description: "Finish 12-week executive leadership coaching with Marshall Group", category: "leadership", status: "on_track", visibility: "private", progress: 75, quarter: "Q1 2026" },
    { employeeId: sarah, companyId: cid, title: "Establish quarterly all-hands format", description: "Design and run new quarterly all-hands meeting format focusing on transparency", category: "leadership", status: "completed", visibility: "team", progress: 100, quarter: "Q1 2026" },
    { employeeId: marcus, companyId: cid, title: "Reduce deploy time to under 10 minutes", description: "Optimize CI/CD pipeline to cut average deploy time from 25min to under 10min", category: "delivery", status: "on_track", visibility: "team", progress: 40, quarter: "Q1 2026" },
    { employeeId: marcus, companyId: cid, title: "Hire 2 senior engineers", description: "Source and close 2 senior full-stack engineers by end of quarter", category: "growth", status: "at_risk", visibility: "manager", progress: 25, quarter: "Q1 2026" },
    { employeeId: marcus, companyId: cid, title: "Launch engineering mentorship program", description: "Create structured mentorship pairing for junior/mid-level engineers", category: "leadership", status: "on_track", visibility: "team", progress: 55, quarter: "Q1 2026" },
    { employeeId: alex, companyId: cid, title: "Ship new design system v2", description: "Migrate all components to the new design system with accessibility improvements", category: "delivery", status: "on_track", visibility: "team", progress: 70, quarter: "Q1 2026" },
    { employeeId: alex, companyId: cid, title: "Learn Rust for backend services", description: "Complete Rust fundamentals course and build one microservice prototype", category: "learning", status: "not_started", visibility: "private", progress: 10, quarter: "Q1 2026" },
    { employeeId: alex, companyId: cid, title: "Present at internal tech talk", description: "Prepare and deliver a tech talk on frontend performance optimization", category: "growth", status: "completed", visibility: "team", progress: 100, quarter: "Q1 2026" },
    { employeeId: priya, companyId: cid, title: "Define product roadmap for H2 2026", description: "Collaborate with stakeholders to prioritize and publish H2 product roadmap", category: "delivery", status: "on_track", visibility: "team", progress: 50, quarter: "Q1 2026" },
    { employeeId: priya, companyId: cid, title: "Improve NPS score by 10 points", description: "Implement customer feedback loop and address top 5 pain points", category: "delivery", status: "at_risk", visibility: "team", progress: 30, quarter: "Q1 2026" },
    { employeeId: jordan, companyId: cid, title: "Complete brand refresh", description: "Lead full brand identity refresh including logo, colors, typography, and guidelines", category: "delivery", status: "on_track", visibility: "team", progress: 80, quarter: "Q1 2026" },
    { employeeId: jordan, companyId: cid, title: "Get certified in design leadership", description: "Complete Nielsen Norman Group UX Management certification", category: "learning", status: "on_track", visibility: "private", progress: 45, quarter: "Q1 2026" },
    { employeeId: maya, companyId: cid, title: "Roll out new performance review cycle", description: "Design and implement quarterly lightweight performance reviews replacing annual reviews", category: "delivery", status: "on_track", visibility: "team", progress: 60, quarter: "Q1 2026" },
    { employeeId: maya, companyId: cid, title: "Launch DEI initiative", description: "Establish diversity, equity & inclusion committee and publish first action plan", category: "leadership", status: "on_track", visibility: "team", progress: 35, quarter: "Q1 2026" },
  ]);
  console.log("Created sample goals");

  const now = new Date();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000);

  await db.insert(snaps).values([
    { senderId: marcus, recipientId: alex, companyId: cid, message: "Alex absolutely crushed the design system migration this sprint. The new components are clean, accessible, and the team is already shipping faster because of them. Truly outstanding work!", tags: ["innovation", "excellence"], createdAt: hoursAgo(2) },
    { senderId: priya, recipientId: sarah, companyId: cid, message: "Sarah, your transparency in the all-hands about our Q1 challenges was exactly what the team needed. It takes real courage to be that open, and it built so much trust across the company.", tags: ["leadership", "teamwork"], createdAt: hoursAgo(24) },
    { senderId: jordan, recipientId: maya, companyId: cid, message: "Maya organized an incredible team offsite last week. Every detail was thoughtful, and the team bonding activities actually brought us closer together. We are lucky to have you!", tags: ["teamwork", "above-and-beyond"], createdAt: hoursAgo(48) },
    { senderId: alex, recipientId: jordan, companyId: cid, message: "Jordan's new brand guidelines are phenomenal. The attention to detail in the color system and typography choices shows real mastery. Our product looks so much more polished now.", tags: ["innovation", "excellence"], createdAt: hoursAgo(72) },
    { senderId: maya, recipientId: marcus, companyId: cid, message: "Marcus stayed late three nights this week to help David debug a critical production issue. That level of dedication and mentorship is what makes our engineering culture special.", tags: ["teamwork", "above-and-beyond"], createdAt: hoursAgo(96) },
    { senderId: rachel, recipientId: priya, companyId: cid, message: "Priya put together an amazing product demo for our biggest prospect. Her ability to connect our features to customer pain points directly led to closing the deal. Incredible partnership!", tags: ["excellence", "teamwork"], createdAt: hoursAgo(120) },
    { senderId: david, recipientId: rachel, companyId: cid, message: "Rachel has been amazing at gathering customer feedback and bringing it back to the engineering team in a structured way. This kind of cross-team collaboration makes our product better.", tags: ["teamwork", "innovation"], createdAt: hoursAgo(144) },
    { senderId: sarah, recipientId: david, companyId: cid, message: "David's work on our infrastructure migration was flawless. Zero downtime, thorough documentation, and he even trained the team on the new setup. A true engineering craftsperson.", tags: ["excellence", "above-and-beyond"], createdAt: hoursAgo(168) },
    { senderId: marcus, recipientId: priya, companyId: cid, message: "Priya ran the most efficient sprint planning session I have ever seen. Clear priorities, realistic timelines, and everyone left knowing exactly what to focus on. Thank you!", tags: ["leadership", "excellence"], createdAt: hoursAgo(192) },
    { senderId: jordan, recipientId: alex, companyId: cid, message: "Alex went above and beyond to make sure our design tokens were perfectly implemented in code. The collaboration between design and engineering has never been smoother. Great partner!", tags: ["teamwork", "above-and-beyond"], createdAt: hoursAgo(216) },
  ]);
  console.log("Created sample snaps");

  const daysFromNow = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

  const [fbReq1] = await db.insert(feedbackRequests).values({ requesterId: alex, responderId: marcus, companyId: cid, prompt: "How am I doing with cross-team communication? Any areas where I could improve my collaboration with the design team?", status: "completed", deadline: daysFromNow(7), createdAt: hoursAgo(240) }).returning();
  const [fbReq2] = await db.insert(feedbackRequests).values({ requesterId: priya, responderId: sarah, companyId: cid, prompt: "I would love your perspective on my product strategy presentations. Are they hitting the right level of detail for leadership?", status: "completed", deadline: daysFromNow(7), createdAt: hoursAgo(192) }).returning();
  await db.insert(feedbackRequests).values([
    { requesterId: jordan, responderId: alex, companyId: cid, prompt: "How well am I bridging the gap between design and engineering? What could I do better in our handoff process?", status: "pending", deadline: daysFromNow(14), createdAt: hoursAgo(72) },
    { requesterId: maya, responderId: rachel, companyId: cid, prompt: "I am redesigning our onboarding process. Could you share your experience as a recent hire - what worked well and what could improve?", status: "pending", deadline: daysFromNow(10), createdAt: hoursAgo(48) },
    { requesterId: david, responderId: marcus, companyId: cid, prompt: "I would appreciate feedback on my code review quality. Am I providing enough context in my reviews?", status: "pending", deadline: daysFromNow(7), createdAt: hoursAgo(24) },
    { requesterId: sarah, responderId: marcus, companyId: cid, prompt: "How effective has my communication been about company priorities this quarter? Where can I be clearer?", status: "pending", deadline: daysFromNow(14), createdAt: hoursAgo(24) },
  ]);

  await db.insert(feedback).values([
    { senderId: marcus, recipientId: alex, companyId: cid, requestId: fbReq1.id, keepDoing: "Your cross-team communication has improved tremendously. The weekly design-eng sync you initiated has been really valuable, and your PRs always include great context for reviewers. Keep documenting your architectural decisions - they help the whole team learn.", considerImproving: "Consider sharing technical context earlier in the design process. Sometimes the design team proposes solutions without knowing about technical constraints. A quick 15-min sync before they finalize mockups could save everyone time.", tags: ["communication", "collaboration"], isAnonymous: false, isRead: true, createdAt: hoursAgo(192) },
    { senderId: sarah, recipientId: priya, companyId: cid, requestId: fbReq2.id, keepDoing: "Your product strategy presentations are extremely well-structured. The way you lead with customer insights and then connect to business metrics is exactly right. Your storytelling has gotten noticeably stronger this quarter.", considerImproving: "For leadership presentations, try to include a clearer 'ask' at the end. Sometimes I am not sure if you are seeking approval, alignment, or just sharing an update. A simple framing like 'I am here to get your input on X' would help.", tags: ["presentation", "strategic-thinking"], isAnonymous: false, isRead: true, createdAt: hoursAgo(144) },
    { senderId: jordan, recipientId: david, companyId: cid, requestId: null, keepDoing: "David, your backend APIs are always well-documented and consistent. As a designer, I really appreciate that I can trust the data models you build. Your infrastructure work has also made our staging environment so much more reliable for design reviews.", considerImproving: "It would be great to see you participate more in product discussions. Your technical perspective is really valuable and could help us avoid design decisions that are hard to implement. Don't be shy about pushing back on designs that are technically complex!", tags: ["technical-skills", "collaboration"], isAnonymous: false, isRead: false, createdAt: hoursAgo(120) },
    { senderId: maya, recipientId: sarah, companyId: cid, requestId: null, keepDoing: "Your openness about company challenges at the all-hands was genuinely inspiring. It made everyone feel like we are truly in this together. Your door-is-always-open policy really works - people feel safe bringing concerns to you.", considerImproving: "Sometimes decisions feel like they move quickly without enough input from the wider team. Even a brief heads-up in Slack before big announcements would help people feel more included in the process.", tags: ["leadership", "communication"], isAnonymous: true, isRead: false, createdAt: hoursAgo(72) },
    { senderId: rachel, recipientId: maya, companyId: cid, requestId: null, keepDoing: "Maya, the new benefits package you put together is incredible. Everyone on the sales team has been raving about it. Your responsiveness to employee concerns is remarkable - you always follow up within a day.", considerImproving: "The onboarding documentation could use some updates for remote employees. A few of the links in the welcome packet are outdated, and it would help to have a clearer first-week schedule for remote starters.", tags: ["responsiveness", "employee-experience"], isAnonymous: false, isRead: true, createdAt: hoursAgo(96) },
  ]);
  console.log("Created sample feedback requests and feedback");

  await db.insert(activities).values([
    { companyId: cid, actorId: alex, type: "snap_sent" as const, targetId: david, metadata: JSON.stringify({ recipientName: "David Park", tags: ["innovation", "technical-skills"] }), createdAt: hoursAgo(12) },
    { companyId: cid, actorId: sarah, type: "goal_created" as const, metadata: JSON.stringify({ goalTitle: "Launch Series A fundraising strategy", category: "delivery" }), createdAt: hoursAgo(24) },
    { companyId: cid, actorId: marcus, type: "snap_sent" as const, targetId: alex, metadata: JSON.stringify({ recipientName: "Alex Rivera", tags: ["collaboration"] }), createdAt: hoursAgo(36) },
    { companyId: cid, actorId: priya, type: "goal_completed" as const, metadata: JSON.stringify({ goalTitle: "Finalize Q1 product roadmap", category: "delivery" }), createdAt: hoursAgo(48) },
    { companyId: cid, actorId: jordan, type: "feedback_given" as const, targetId: david, metadata: JSON.stringify({ recipientName: "David Park", isAnonymous: false }), createdAt: hoursAgo(72) },
    { companyId: cid, actorId: maya, type: "feedback_requested" as const, targetId: rachel, metadata: JSON.stringify({ responderName: "Rachel Torres" }), createdAt: hoursAgo(48) },
    { companyId: cid, actorId: sarah, type: "snap_sent" as const, targetId: marcus, metadata: JSON.stringify({ recipientName: "Marcus Johnson", tags: ["leadership", "above-and-beyond"] }), createdAt: hoursAgo(96) },
    { companyId: cid, actorId: david, type: "profile_updated" as const, metadata: JSON.stringify({ employeeName: "David Park" }), createdAt: hoursAgo(120) },
    { companyId: cid, actorId: rachel, type: "snap_sent" as const, targetId: maya, metadata: JSON.stringify({ recipientName: "Maya Patel", tags: ["responsiveness", "employee-experience"] }), createdAt: hoursAgo(96) },
    { companyId: cid, actorId: marcus, type: "goal_created" as const, metadata: JSON.stringify({ goalTitle: "Scale engineering team to 15 engineers", category: "leadership" }), createdAt: hoursAgo(168) },
  ]);
  console.log("Created sample activities");

  console.log("Database seeded successfully!");
}
