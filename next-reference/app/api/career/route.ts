import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/middleware/auth";
import { db } from "@/db/client";
import { careerPaths, milestones, milestoneSteps } from "@/db/schema";
import { successResponse, errorResponse } from "@/lib/utils/response";

const DEFAULT_MILESTONES: Record<string, { title: string; steps: string[] }[]> = {
  foundation: [
    { title: "Complete onboarding", steps: ["Review company handbook", "Set up development environment", "Meet your team members"] },
    { title: "First team collaboration", steps: ["Join a team project", "Complete your first code review"] },
    { title: "Set initial goals", steps: ["Define quarterly objectives", "Discuss goals with manager"] },
  ],
  growing: [
    { title: "Lead a project milestone", steps: ["Take ownership of a feature", "Deliver on schedule", "Present results to stakeholders"] },
    { title: "Mentor a colleague", steps: ["Pair program with a junior developer", "Share knowledge in a team session"] },
    { title: "Present to the team", steps: ["Prepare a tech talk", "Lead a retrospective"] },
  ],
  leading: [
    { title: "Drive a cross-team initiative", steps: ["Identify collaboration opportunity", "Coordinate with other teams", "Deliver cross-team results"] },
    { title: "Develop team strategy", steps: ["Analyze team strengths", "Create a growth roadmap"] },
    { title: "Coach team members", steps: ["Conduct one-on-ones", "Provide actionable feedback"] },
  ],
  mastering: [
    { title: "Shape company direction", steps: ["Contribute to company strategy", "Propose a new initiative"] },
    { title: "Build organizational capability", steps: ["Design a training program", "Establish best practices", "Measure impact"] },
    { title: "Industry contribution", steps: ["Publish an article or talk", "Contribute to open source"] },
  ],
};

async function createDefaultCareerPath(employeeId: string, companyId: string) {
  const [careerPath] = await db
    .insert(careerPaths)
    .values({
      employeeId,
      companyId,
      currentPhase: "foundation",
      xp: 0,
      seasonXp: 0,
      lifetimeXp: 0,
    })
    .returning();

  const phases = ["foundation", "growing", "leading", "mastering"] as const;

  for (const phase of phases) {
    const phaseMilestones = DEFAULT_MILESTONES[phase];
    for (let i = 0; i < phaseMilestones.length; i++) {
      const m = phaseMilestones[i];
      const status = phase === "foundation" && i === 0 ? "active" : "locked";

      const [milestone] = await db
        .insert(milestones)
        .values({
          careerPathId: careerPath.id,
          phase,
          title: m.title,
          status,
          position: i,
          xpReward: 50,
        })
        .returning();

      for (const stepTitle of m.steps) {
        await db.insert(milestoneSteps).values({
          milestoneId: milestone.id,
          title: stepTitle,
        });
      }
    }
  }

  return careerPath;
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser();

    let careerPath = await db.query.careerPaths.findFirst({
      where: and(
        eq(careerPaths.employeeId, user.employeeId),
        eq(careerPaths.companyId, user.companyId)
      ),
      with: {
        milestones: {
          with: {
            steps: true,
          },
          orderBy: (milestones, { asc }) => [asc(milestones.position)],
        },
      },
    });

    if (!careerPath) {
      await createDefaultCareerPath(user.employeeId, user.companyId);

      careerPath = await db.query.careerPaths.findFirst({
        where: and(
          eq(careerPaths.employeeId, user.employeeId),
          eq(careerPaths.companyId, user.companyId)
        ),
        with: {
          milestones: {
            with: {
              steps: true,
            },
            orderBy: (milestones, { asc }) => [asc(milestones.position)],
          },
        },
      });
    }

    return successResponse(careerPath);
  } catch (error) {
    return errorResponse(error);
  }
}
