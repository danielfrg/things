#!/usr/bin/env node

import { eq } from "drizzle-orm"
import { db, schema } from "../src/db"
import { ensureTaskOrderings } from "../src/services/ordering"

const { accounts, areas, checklistItems, headings, projects, tags, tasks, taskTags, taskOrderings, users } = schema

// Import ID generation utility
import { createId } from "../src/lib/id"

// Hash password using scrypt (same as better-auth)
async function hashPassword(password: string): Promise<string> {
  const { scryptAsync } = await import("@noble/hashes/scrypt.js")
  const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
  const key = await scryptAsync(password.normalize("NFKC"), salt, {
    N: 16384,
    r: 16,
    p: 1,
    dkLen: 64,
    maxmem: 128 * 16384 * 16 * 2,
  })
  const keyHex = Array.from(key)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
  return `${salt}:${keyHex}`
}

const SEED_EMAIL = "seed@example.com"
const SEED_PASSWORD = "password123"

async function seed() {
  console.log("Seeding database...")

  // Check if seed user already exists
  const existingUser = await db.select().from(users).where(eq(users.email, SEED_EMAIL)).get()

  let userId: string

  if (existingUser) {
    console.log("Seed user already exists, clearing existing data...")
    userId = existingUser.id

    // Clear existing data for this user (in reverse order of dependencies)
    await db.delete(taskTags).where(eq(taskTags.userId, userId))
    await db.delete(checklistItems).where(eq(checklistItems.userId, userId))
    await db.delete(taskOrderings).where(eq(taskOrderings.userId, userId))
    await db.delete(tasks).where(eq(tasks.userId, userId))
    await db.delete(headings).where(eq(headings.userId, userId))
    await db.delete(projects).where(eq(projects.userId, userId))
    await db.delete(areas).where(eq(areas.userId, userId))
    await db.delete(tags).where(eq(tags.userId, userId))

    // Ensure credential account exists with correct password
    const hashedPassword = await hashPassword(SEED_PASSWORD)
    const existingAccount = await db.select().from(accounts).where(eq(accounts.userId, userId)).get()

    if (existingAccount) {
      await db.update(accounts).set({ password: hashedPassword }).where(eq(accounts.userId, userId))
    } else {
      await db.insert(accounts).values({
        id: crypto.randomUUID(),
        userId,
        accountId: userId,
        providerId: "credential",
        password: hashedPassword,
      })
    }

    console.log("Existing data cleared")
  } else {
    // Create a seed user
    console.log("Creating seed user...")
    userId = crypto.randomUUID()
    await db.insert(users).values({
      id: userId,
      name: "Seed User",
      email: SEED_EMAIL,
      emailVerified: true,
    })

    // Create credential account with hashed password
    const hashedPassword = await hashPassword(SEED_PASSWORD)
    await db.insert(accounts).values({
      id: crypto.randomUUID(),
      userId,
      accountId: userId,
      providerId: "credential",
      password: hashedPassword,
    })

    console.log("Seed user created")
  }

  console.log(`\n   Email: ${SEED_EMAIL}`)
  console.log(`   Password: ${SEED_PASSWORD}`)

  // Create areas
  console.log("\nCreating areas...")
  const workAreaId = createId("area")
  const personalAreaId = createId("area")
  const learningAreaId = createId("area")

  await db.insert(areas).values([
    { id: workAreaId, userId, title: "Work", position: 1 },
    { id: personalAreaId, userId, title: "Personal", position: 2 },
    { id: learningAreaId, userId, title: "Learning", position: 3 },
  ])
  console.log("Areas created")

  // Create projects
  console.log("\nCreating projects...")
  const webAppProjectId = createId("project")
  const mobileAppProjectId = createId("project")
  const fitnessProjectId = createId("project")
  const homeProjectId = createId("project")
  const shoppingProjectId = createId("project")
  const programmingCourseId = createId("project")
  const freelanceProjectId = createId("project")
  const bookWritingProjectId = createId("project")

  await db.insert(projects).values([
    {
      id: webAppProjectId,
      userId,
      title: "Website Redesign",
      notes: "Redesign company website with modern UI",
      areaId: workAreaId,
      position: 1,
    },
    {
      id: mobileAppProjectId,
      userId,
      title: "Mobile App Launch",
      notes: "Launch new mobile app for iOS and Android",
      areaId: workAreaId,
      position: 2,
    },
    {
      id: fitnessProjectId,
      userId,
      title: "Fitness Goals",
      notes: "Track workouts and nutrition",
      areaId: personalAreaId,
      position: 3,
    },
    {
      id: homeProjectId,
      userId,
      title: "Home Improvement",
      notes: "Kitchen renovation and garden work",
      areaId: personalAreaId,
      position: 4,
    },
    {
      id: shoppingProjectId,
      userId,
      title: "Shopping List",
      areaId: personalAreaId,
      position: 5,
    },
    {
      id: programmingCourseId,
      userId,
      title: "Advanced TypeScript Course",
      notes: "Complete online TypeScript course",
      areaId: learningAreaId,
      position: 6,
    },
    {
      id: freelanceProjectId,
      userId,
      title: "Freelance Client Work",
      notes: "Various client projects and consulting",
      position: 7,
    },
    {
      id: bookWritingProjectId,
      userId,
      title: "Write Technical Book",
      notes: "Book about modern web development",
      position: 8,
    },
  ])
  console.log("Projects created")

  // Create regular headings for some projects
  console.log("\nCreating regular headings...")
  const webDesignHeadingId = createId("heading")
  const webDevHeadingId = createId("heading")
  const webTestingHeadingId = createId("heading")
  const mobileIosHeadingId = createId("heading")
  const mobileAndroidHeadingId = createId("heading")
  const fitnessCardioHeadingId = createId("heading")
  const fitnessStrengthHeadingId = createId("heading")
  const bookResearchHeadingId = createId("heading")
  const bookWritingHeadingId = createId("heading")

  await db.insert(headings).values([
    {
      id: webDesignHeadingId,
      userId,
      projectId: webAppProjectId,
      title: "Design",
      position: 1,
    },
    {
      id: webDevHeadingId,
      userId,
      projectId: webAppProjectId,
      title: "Development",
      position: 2,
    },
    {
      id: webTestingHeadingId,
      userId,
      projectId: webAppProjectId,
      title: "Testing",
      position: 3,
    },
    {
      id: mobileIosHeadingId,
      userId,
      projectId: mobileAppProjectId,
      title: "iOS",
      position: 1,
    },
    {
      id: mobileAndroidHeadingId,
      userId,
      projectId: mobileAppProjectId,
      title: "Android",
      position: 2,
    },
    {
      id: fitnessCardioHeadingId,
      userId,
      projectId: fitnessProjectId,
      title: "Cardio",
      position: 1,
    },
    {
      id: fitnessStrengthHeadingId,
      userId,
      projectId: fitnessProjectId,
      title: "Strength",
      position: 2,
    },
    {
      id: bookResearchHeadingId,
      userId,
      projectId: bookWritingProjectId,
      title: "Research",
      position: 1,
    },
    {
      id: bookWritingHeadingId,
      userId,
      projectId: bookWritingProjectId,
      title: "Writing",
      position: 2,
    },
  ])
  console.log("Regular headings created")

  // Create tags
  console.log("\nCreating tags...")
  const urgentTagId = createId("tag")
  const homeTagId = createId("tag")
  const meetingTagId = createId("tag")
  const planningTagId = createId("tag")
  const researchTagId = createId("tag")

  await db.insert(tags).values([
    { id: urgentTagId, userId, title: "Urgent", position: 1 },
    { id: homeTagId, userId, title: "Home", position: 2 },
    {
      id: meetingTagId,
      userId,
      title: "Meeting",
      position: 3,
    },
    {
      id: planningTagId,
      userId,
      title: "Planning",
      position: 4,
    },
    {
      id: researchTagId,
      userId,
      title: "Research",
      position: 5,
    },
  ])
  console.log("Tags created")

  // Helper to get date strings
  const today = new Date()
  const getDateStr = (daysOffset: number) => {
    const date = new Date(today)
    date.setDate(date.getDate() + daysOffset)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const todayStr = getDateStr(0)
  const tomorrowStr = getDateStr(1)
  const in2DaysStr = getDateStr(2)
  const in3DaysStr = getDateStr(3)
  const in5DaysStr = getDateStr(5)
  const in7DaysStr = getDateStr(7)
  const in10DaysStr = getDateStr(10)

  // Create template IDs
  const dailyJournalTemplateId = createId("task")
  const weeklyReviewTemplateId = createId("task")
  const payRentTemplateId = createId("task")

  // Create repeating templates (as tasks with isTemplate=true)
  console.log("\nCreating repeating templates...")
  await db.insert(tasks).values([
    {
      id: dailyJournalTemplateId,
      userId,
      title: "Daily journal",
      notes: "5 minutes - write down highlights and plan tomorrow.",
      status: "active",
      isTemplate: true,
      rrule: "FREQ=DAILY",
      nextOccurrence: todayStr,
      listId: personalAreaId,
      isSomeday: false,
      isEvening: false,
    },
    {
      id: weeklyReviewTemplateId,
      userId,
      title: "Weekly review",
      notes: "Review goals, clean inbox, plan next week.",
      status: "active",
      isTemplate: true,
      rrule: "FREQ=WEEKLY;BYDAY=FR",
      nextOccurrence: todayStr,
      listId: workAreaId,
      isSomeday: false,
      isEvening: false,
    },
    {
      id: payRentTemplateId,
      userId,
      title: "Pay rent",
      notes: "Transfer rent and file receipt.",
      status: "active",
      isTemplate: true,
      rrule: "FREQ=MONTHLY;BYMONTHDAY=1",
      nextOccurrence: in7DaysStr,
      listId: personalAreaId,
      isSomeday: false,
      isEvening: false,
    },
  ])

  // Add checklist items to templates
  await db.insert(checklistItems).values([
    {
      id: createId("checklistItem"),
      userId,
      taskId: dailyJournalTemplateId,
      title: "1 win",
      completed: false,
      position: 1,
    },
    {
      id: createId("checklistItem"),
      userId,
      taskId: dailyJournalTemplateId,
      title: "1 lesson",
      completed: false,
      position: 2,
    },
    {
      id: createId("checklistItem"),
      userId,
      taskId: dailyJournalTemplateId,
      title: "Top 3 for tomorrow",
      completed: false,
      position: 3,
    },
    {
      id: createId("checklistItem"),
      userId,
      taskId: weeklyReviewTemplateId,
      title: "Clear inbox",
      completed: false,
      position: 1,
    },
    {
      id: createId("checklistItem"),
      userId,
      taskId: weeklyReviewTemplateId,
      title: "Review active projects",
      completed: false,
      position: 2,
    },
    {
      id: createId("checklistItem"),
      userId,
      taskId: weeklyReviewTemplateId,
      title: "Plan next week",
      completed: false,
      position: 3,
    },
    {
      id: createId("checklistItem"),
      userId,
      taskId: payRentTemplateId,
      title: "Make transfer",
      completed: false,
      position: 1,
    },
  ])

  // Add tags to templates
  await db.insert(taskTags).values([
    {
      id: createId("taskTag"),
      userId,
      taskId: dailyJournalTemplateId,
      tagId: planningTagId,
    },
    {
      id: createId("taskTag"),
      userId,
      taskId: weeklyReviewTemplateId,
      tagId: planningTagId,
    },
    {
      id: createId("taskTag"),
      userId,
      taskId: weeklyReviewTemplateId,
      tagId: researchTagId,
    },
    {
      id: createId("taskTag"),
      userId,
      taskId: payRentTemplateId,
      tagId: urgentTagId,
    },
  ])
  console.log("Repeating templates created")

  console.log(`\nCreating tasks for today (${todayStr})...`)

  let taskPosition = 0

  // Helper to create task
  // status: null = inbox, "active" = processed, "completed"/"cancelled"/"trashed" = lifecycle
  // Now uses listId + headingId for the List hierarchy:
  // - listId: which List (project or area) does this task belong to?
  // - headingId: which heading within the List (if any)?
  const createTask = async (data: {
    title: string
    status?: "active" | "completed" | "cancelled" | "trashed" | null
    isSomeday?: boolean
    isEvening?: boolean
    scheduledDate?: string
    projectId?: string
    areaId?: string
    headingId?: string
    notes?: string
    completedAt?: Date
  }) => {
    const id = createId("task")

    // Determine listId from projectId or areaId
    // projectId takes priority over areaId
    const listId = data.projectId ?? data.areaId ?? null

    // completedAt is set for both completed and cancelled statuses
    const completed =
      data.completedAt ?? (data.status === "completed" || data.status === "cancelled" ? new Date() : null)

    const [task] = await db
      .insert(tasks)
      .values({
        id,
        userId,
        title: data.title,
        status: data.status === undefined ? null : data.status,
        isSomeday: data.isSomeday ?? false,
        isEvening: data.isEvening ?? false,
        scheduledDate: data.scheduledDate ?? null,
        completedAt: completed,
        listId,
        headingId: data.headingId ?? null,
        notes: data.notes ?? null,
      })
      .returning()

    if (task) {
      // Create orderings for the task based on its context
      await ensureTaskOrderings(userId, task)
    }

    taskPosition++
    return id
  }

  // Helper to add checklist item
  let checklistPosition = 0
  const addChecklistItem = async (taskId: string, title: string) => {
    await db.insert(checklistItems).values({
      id: createId("checklistItem"),
      userId,
      taskId,
      title,
      position: checklistPosition++,
    })
  }

  // Helper to add tag to task
  const addTagToTask = async (taskId: string, tagId: string) => {
    await db.insert(taskTags).values({
      id: createId("taskTag"),
      userId,
      taskId,
      tagId,
    })
  }

  // Inbox tasks (status = null means inbox)
  await createTask({ title: "Review project proposals" })
  await createTask({
    title: "Follow up with client feedback",
  })
  const urgentInboxTask = await createTask({
    title: "Respond to urgent email",
  })
  await addTagToTask(urgentInboxTask, urgentTagId)
  await createTask({ title: "Book travel for conference" })
  await createTask({ title: "Research new tools for team" })
  await createTask({ title: "Update LinkedIn profile" })
  await createTask({ title: "Review quarterly goals" })

  // TODAY - Website Redesign project
  const todayStandupTask = await createTask({
    title: "Team standup meeting",
    status: "active",
    scheduledDate: todayStr,
    projectId: webAppProjectId,
  })
  await addTagToTask(todayStandupTask, meetingTagId)

  const todayReviewTask = await createTask({
    title: "Review design mockups",
    status: "active",
    scheduledDate: todayStr,
    projectId: webAppProjectId,
  })
  await addChecklistItem(todayReviewTask, "Homepage design")
  await addChecklistItem(todayReviewTask, "Navigation structure")
  await addChecklistItem(todayReviewTask, "Color scheme")

  await createTask({
    title: "Update project timeline",
    status: "active",
    scheduledDate: todayStr,
    projectId: webAppProjectId,
  })

  // TODAY - Mobile App project
  await createTask({
    title: "Test app on iOS devices",
    status: "active",
    scheduledDate: todayStr,
    projectId: mobileAppProjectId,
  })
  const todayBugFixTask = await createTask({
    title: "Fix login screen bug",
    status: "active",
    scheduledDate: todayStr,
    projectId: mobileAppProjectId,
  })
  await addTagToTask(todayBugFixTask, urgentTagId)

  // TODAY - Fitness project
  await createTask({
    title: "Morning workout",
    status: "active",
    scheduledDate: todayStr,
    projectId: fitnessProjectId,
  })
  await createTask({
    title: "Meal prep for the week",
    status: "active",
    scheduledDate: todayStr,
    projectId: fitnessProjectId,
  })

  // TODAY - Home project
  const todayHomeTask = await createTask({
    title: "Get quotes from contractors",
    status: "active",
    scheduledDate: todayStr,
    projectId: homeProjectId,
  })
  await addTagToTask(todayHomeTask, homeTagId)

  // TODAY - Freelance project (no area)
  await createTask({
    title: "Client call at 2pm",
    status: "active",
    scheduledDate: todayStr,
    projectId: freelanceProjectId,
  })
  await createTask({
    title: "Send project proposal",
    status: "active",
    scheduledDate: todayStr,
    projectId: freelanceProjectId,
  })

  // TODAY - Book writing project (no area)
  await createTask({
    title: "Write chapter 3 draft",
    status: "active",
    scheduledDate: todayStr,
    projectId: bookWritingProjectId,
  })

  // TODAY - Tasks without any project
  const todayCallTask = await createTask({
    title: "Call dentist to schedule appointment",
    status: "active",
    scheduledDate: todayStr,
  })
  await addTagToTask(todayCallTask, urgentTagId)

  await createTask({
    title: "Reply to important emails",
    status: "active",
    scheduledDate: todayStr,
  })
  await createTask({
    title: "Review monthly budget",
    status: "active",
    scheduledDate: todayStr,
  })
  await createTask({
    title: "Water the plants",
    status: "active",
    scheduledDate: todayStr,
  })

  // EVENING tasks (scheduled for today, isEvening: true)
  await createTask({
    title: "Read before bed",
    status: "active",
    scheduledDate: todayStr,
    isEvening: true,
  })
  await createTask({
    title: "Review pull requests",
    status: "active",
    scheduledDate: todayStr,
    isEvening: true,
    projectId: webAppProjectId,
  })
  await createTask({
    title: "Plan tomorrow's meals",
    status: "active",
    scheduledDate: todayStr,
    isEvening: true,
    projectId: homeProjectId,
  })
  await createTask({
    title: "Stretch and wind down",
    status: "active",
    scheduledDate: todayStr,
    isEvening: true,
  })

  // TOMORROW tasks
  const tomorrowClientMeeting = await createTask({
    title: "Client presentation meeting",
    status: "active",
    scheduledDate: tomorrowStr,
    projectId: webAppProjectId,
  })
  await addTagToTask(tomorrowClientMeeting, meetingTagId)
  await addTagToTask(tomorrowClientMeeting, urgentTagId)
  await addChecklistItem(tomorrowClientMeeting, "Prepare presentation slides")
  await addChecklistItem(tomorrowClientMeeting, "Print handouts")
  await addChecklistItem(tomorrowClientMeeting, "Test projector setup")

  await createTask({
    title: "Implement responsive navigation",
    status: "active",
    scheduledDate: tomorrowStr,
    projectId: webAppProjectId,
  })
  await createTask({
    title: "Write CSS for mobile breakpoints",
    status: "active",
    scheduledDate: tomorrowStr,
    projectId: webAppProjectId,
  })
  await createTask({
    title: "Code review with team",
    status: "active",
    scheduledDate: tomorrowStr,
    projectId: mobileAppProjectId,
  })
  await createTask({
    title: "Update app store screenshots",
    status: "active",
    scheduledDate: tomorrowStr,
    projectId: mobileAppProjectId,
  })
  await createTask({
    title: "Yoga class at 6 PM",
    status: "active",
    scheduledDate: tomorrowStr,
    projectId: fitnessProjectId,
  })
  await createTask({
    title: "Watch TypeScript generics tutorial",
    status: "active",
    scheduledDate: tomorrowStr,
    projectId: programmingCourseId,
  })
  await createTask({
    title: "Shop for kitchen tiles",
    status: "active",
    scheduledDate: tomorrowStr,
    projectId: homeProjectId,
  })

  // Day +2 tasks
  const researchTask = await createTask({
    title: "Research accessibility standards",
    status: "active",
    scheduledDate: in2DaysStr,
    projectId: webAppProjectId,
  })
  await addTagToTask(researchTask, researchTagId)
  await createTask({
    title: "Optimize image assets",
    status: "active",
    scheduledDate: in2DaysStr,
    projectId: webAppProjectId,
  })
  await createTask({
    title: "Submit beta build to TestFlight",
    status: "active",
    scheduledDate: in2DaysStr,
    projectId: mobileAppProjectId,
  })

  // Day +3 tasks
  const sprintPlanning = await createTask({
    title: "Sprint planning meeting",
    status: "active",
    scheduledDate: in3DaysStr,
    projectId: webAppProjectId,
  })
  await addTagToTask(sprintPlanning, meetingTagId)
  await addTagToTask(sprintPlanning, planningTagId)
  await createTask({
    title: "Set up staging environment",
    status: "active",
    scheduledDate: in3DaysStr,
    projectId: webAppProjectId,
  })
  await createTask({
    title: "Implement push notifications",
    status: "active",
    scheduledDate: in3DaysStr,
    projectId: mobileAppProjectId,
  })

  // Day +5 tasks
  await createTask({
    title: "Website launch preparation",
    status: "active",
    scheduledDate: in5DaysStr,
    projectId: webAppProjectId,
  })
  await createTask({
    title: "Review app analytics setup",
    status: "active",
    scheduledDate: in5DaysStr,
    projectId: mobileAppProjectId,
  })
  await createTask({
    title: "Track weekly fitness progress",
    status: "active",
    scheduledDate: in5DaysStr,
    projectId: fitnessProjectId,
  })
  await createTask({
    title: "Invoice client for completed work",
    status: "active",
    scheduledDate: in5DaysStr,
    projectId: freelanceProjectId,
  })

  // Day +7 tasks
  await createTask({
    title: "Weekly team retrospective",
    status: "active",
    scheduledDate: in7DaysStr,
    projectId: webAppProjectId,
  })
  await createTask({
    title: "Plan next sprint goals",
    status: "active",
    scheduledDate: in7DaysStr,
    projectId: mobileAppProjectId,
  })

  // Day +10 tasks
  await createTask({
    title: "Complete TypeScript course final project",
    status: "active",
    scheduledDate: in10DaysStr,
    projectId: programmingCourseId,
  })
  await createTask({
    title: "Schedule kitchen renovation start date",
    status: "active",
    scheduledDate: in10DaysStr,
    projectId: homeProjectId,
  })

  // Anytime tasks
  const wireframesTask = await createTask({
    title: "Create wireframes for contact page",
    status: "active",
    projectId: webAppProjectId,
    headingId: webDesignHeadingId,
  })
  await addChecklistItem(wireframesTask, "Sketch initial layout")
  await addChecklistItem(wireframesTask, "Add form fields")
  await addChecklistItem(wireframesTask, "Design success message")

  await createTask({
    title: "Write copy for hero section",
    status: "active",
    projectId: webAppProjectId,
    headingId: webDesignHeadingId,
  })
  await createTask({
    title: "Choose web fonts",
    status: "active",
    projectId: webAppProjectId,
    headingId: webDesignHeadingId,
  })
  await createTask({
    title: "Implement responsive grid",
    status: "active",
    projectId: webAppProjectId,
    headingId: webDevHeadingId,
  })
  await createTask({
    title: "Set up component library",
    status: "active",
    projectId: webAppProjectId,
    headingId: webDevHeadingId,
  })
  await createTask({
    title: "Write unit tests for forms",
    status: "active",
    projectId: webAppProjectId,
    headingId: webTestingHeadingId,
  })
  await createTask({
    title: "Design app icon variations",
    status: "active",
    projectId: mobileAppProjectId,
    headingId: mobileIosHeadingId,
  })
  await createTask({
    title: "Write app store description",
    status: "active",
    projectId: mobileAppProjectId,
    headingId: mobileIosHeadingId,
  })
  await createTask({
    title: "Configure Play Store listing",
    status: "active",
    projectId: mobileAppProjectId,
    headingId: mobileAndroidHeadingId,
  })
  await createTask({
    title: "Run 5K training",
    status: "active",
    projectId: fitnessProjectId,
    headingId: fitnessCardioHeadingId,
  })
  await createTask({
    title: "Swimming session",
    status: "active",
    projectId: fitnessProjectId,
    headingId: fitnessCardioHeadingId,
  })
  await createTask({
    title: "Upper body workout",
    status: "active",
    projectId: fitnessProjectId,
    headingId: fitnessStrengthHeadingId,
  })
  await createTask({
    title: "Leg day routine",
    status: "active",
    projectId: fitnessProjectId,
    headingId: fitnessStrengthHeadingId,
  })

  const shoppingTask1 = await createTask({
    title: "Buy groceries",
    status: "active",
    projectId: shoppingProjectId,
  })
  await addTagToTask(shoppingTask1, homeTagId)
  await addChecklistItem(shoppingTask1, "Fruits and vegetables")
  await addChecklistItem(shoppingTask1, "Dairy products")
  await addChecklistItem(shoppingTask1, "Bread and pasta")

  await createTask({
    title: "Pick up dry cleaning",
    status: "active",
    projectId: shoppingProjectId,
  })
  await createTask({
    title: "Return library books",
    status: "active",
    projectId: shoppingProjectId,
  })
  await createTask({
    title: "Read course materials on async/await",
    status: "active",
    projectId: programmingCourseId,
  })
  await createTask({
    title: "Practice coding exercises",
    status: "active",
    projectId: programmingCourseId,
  })
  await createTask({
    title: "Update portfolio website",
    status: "active",
    projectId: freelanceProjectId,
  })
  await createTask({
    title: "Research new potential clients",
    status: "active",
    projectId: freelanceProjectId,
  })
  await createTask({
    title: "Read industry publications",
    status: "active",
    projectId: bookWritingProjectId,
    headingId: bookResearchHeadingId,
  })
  await createTask({
    title: "Interview domain experts",
    status: "active",
    projectId: bookWritingProjectId,
    headingId: bookResearchHeadingId,
  })
  await createTask({
    title: "Outline chapter 4",
    status: "active",
    projectId: bookWritingProjectId,
    headingId: bookWritingHeadingId,
  })
  await createTask({
    title: "Review editor feedback",
    status: "active",
    projectId: bookWritingProjectId,
    headingId: bookWritingHeadingId,
  })
  await createTask({ title: "Organize digital photos", status: "active" })
  await createTask({ title: "Clean out garage", status: "active" })

  // Someday tasks (status: "active" + isSomeday: true)
  await createTask({
    title: 'Read "Deep Work" by Cal Newport',
    status: "active",
    isSomeday: true,
  })
  await createTask({
    title: "Learn Rust programming language",
    status: "active",
    isSomeday: true,
  })
  await createTask({
    title: "Plan summer vacation",
    status: "active",
    isSomeday: true,
  })
  await createTask({
    title: "Research investment strategies",
    status: "active",
    isSomeday: true,
  })
  await createTask({
    title: "Start a personal blog",
    status: "active",
    isSomeday: true,
  })
  await createTask({
    title: "Learn to play guitar",
    status: "active",
    isSomeday: true,
  })

  // Area-only tasks (assigned to area but not to any project)
  await createTask({
    title: "Review team performance",
    status: "active",
    areaId: workAreaId,
  })
  await createTask({
    title: "Update company documentation",
    status: "active",
    areaId: workAreaId,
  })
  await createTask({
    title: "Schedule annual checkup",
    status: "active",
    areaId: personalAreaId,
  })
  await createTask({
    title: "Renew gym membership",
    status: "active",
    areaId: personalAreaId,
  })
  await createTask({
    title: "Organize bookshelf",
    status: "active",
    areaId: personalAreaId,
  })
  await createTask({
    title: "Find new podcast recommendations",
    status: "active",
    areaId: learningAreaId,
  })
  await createTask({
    title: "Set up RSS reader",
    status: "active",
    areaId: learningAreaId,
  })

  // Area-only someday tasks (status: "active" + isSomeday: true)
  await createTask({
    title: "Explore new career opportunities",
    status: "active",
    isSomeday: true,
    areaId: workAreaId,
  })
  await createTask({
    title: "Research industry certifications",
    status: "active",
    isSomeday: true,
    areaId: workAreaId,
  })
  await createTask({
    title: "Plan team offsite retreat",
    status: "active",
    isSomeday: true,
    areaId: workAreaId,
  })
  await createTask({
    title: "Plan retirement savings strategy",
    status: "active",
    isSomeday: true,
    areaId: personalAreaId,
  })
  await createTask({
    title: "Learn a new language",
    status: "active",
    isSomeday: true,
    areaId: learningAreaId,
  })

  // Project-level someday tasks (status: "active" + isSomeday: true)
  await createTask({
    title: "Explore headless CMS options",
    status: "active",
    isSomeday: true,
    projectId: webAppProjectId,
  })
  await createTask({
    title: "Research A/B testing tools",
    status: "active",
    isSomeday: true,
    projectId: webAppProjectId,
  })
  await createTask({
    title: "Add dark mode support",
    status: "active",
    isSomeday: true,
    projectId: mobileAppProjectId,
  })
  await createTask({
    title: "Implement widget for home screen",
    status: "active",
    isSomeday: true,
    projectId: mobileAppProjectId,
  })
  await createTask({
    title: "Try rock climbing",
    status: "active",
    isSomeday: true,
    projectId: fitnessProjectId,
  })
  await createTask({
    title: "Sign up for marathon training",
    status: "active",
    isSomeday: true,
    projectId: fitnessProjectId,
  })
  await createTask({
    title: "Build a home office",
    status: "active",
    isSomeday: true,
    projectId: homeProjectId,
  })
  await createTask({
    title: "Install smart home system",
    status: "active",
    isSomeday: true,
    projectId: homeProjectId,
  })
  await createTask({
    title: "Take machine learning course",
    status: "active",
    isSomeday: true,
    projectId: programmingCourseId,
  })
  await createTask({
    title: "Learn GraphQL in depth",
    status: "active",
    isSomeday: true,
    projectId: programmingCourseId,
  })
  await createTask({
    title: "Create online course on web dev",
    status: "active",
    isSomeday: true,
    projectId: freelanceProjectId,
  })
  await createTask({
    title: "Start YouTube channel",
    status: "active",
    isSomeday: true,
    projectId: freelanceProjectId,
  })
  await createTask({
    title: "Write second book on DevOps",
    status: "active",
    isSomeday: true,
    projectId: bookWritingProjectId,
  })
  await createTask({
    title: "Pitch book to publishers",
    status: "active",
    isSomeday: true,
    projectId: bookWritingProjectId,
  })

  // =========================================================================
  // Cancelled tasks (for testing cancelled state visibility)
  // =========================================================================
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  // Cancelled today — visible in project active sections before logging
  await createTask({
    title: "Old homepage design approach",
    status: "cancelled",
    projectId: webAppProjectId,
    headingId: webDesignHeadingId,
  })
  await createTask({
    title: "Use jQuery for frontend",
    status: "cancelled",
    projectId: webAppProjectId,
    headingId: webDevHeadingId,
  })
  await createTask({
    title: "Manual regression testing",
    status: "cancelled",
    projectId: mobileAppProjectId,
    headingId: mobileIosHeadingId,
  })

  // Cancelled yesterday — would be in limbo without the log-all fix
  await createTask({
    title: "Try waterfall methodology",
    status: "cancelled",
    completedAt: yesterday,
    projectId: webAppProjectId,
    headingId: webDevHeadingId,
  })

  // =========================================================================
  // Logged tasks in projects (completed & cancelled, already logged)
  // These appear in the project's collapsible "Logged" section
  // =========================================================================
  const loggedProjectTasks = [
    {
      title: "Initial wireframe review",
      status: "completed" as const,
      pid: webAppProjectId,
      age: 3,
    },
    {
      title: "Setup CI/CD pipeline",
      status: "completed" as const,
      pid: webAppProjectId,
      age: 5,
    },
    {
      title: "Flash animation prototype",
      status: "cancelled" as const,
      pid: webAppProjectId,
      age: 7,
    },
    {
      title: "Design system v1 approval",
      status: "completed" as const,
      pid: webAppProjectId,
      age: 10,
    },
    {
      title: "Use PHP backend",
      status: "cancelled" as const,
      pid: webAppProjectId,
      age: 12,
    },
    {
      title: "Beta TestFlight build",
      status: "completed" as const,
      pid: mobileAppProjectId,
      age: 2,
    },
    {
      title: "Windows Phone support",
      status: "cancelled" as const,
      pid: mobileAppProjectId,
      age: 4,
    },
    {
      title: "Push notification setup",
      status: "completed" as const,
      pid: mobileAppProjectId,
      age: 8,
    },
    {
      title: "5K race registration",
      status: "completed" as const,
      pid: fitnessProjectId,
      age: 6,
    },
    {
      title: "Buy treadmill for home",
      status: "cancelled" as const,
      pid: fitnessProjectId,
      age: 9,
    },
    {
      title: "Fix kitchen faucet",
      status: "completed" as const,
      pid: homeProjectId,
      age: 3,
    },
    {
      title: "Paint garage door",
      status: "cancelled" as const,
      pid: homeProjectId,
      age: 11,
    },
  ]
  const loggedValues = loggedProjectTasks.map((t) => {
    const completed = new Date(today)
    completed.setDate(completed.getDate() - t.age)
    return {
      id: createId("task"),
      userId,
      title: t.title,
      status: t.status,
      isSomeday: false,
      isLogged: true,
      completedAt: completed,
      listId: t.pid,
    }
  })
  await db.insert(tasks).values(loggedValues)

  console.log("Tasks created (including cancelled & logged)")

  // =========================================================================
  // Bulk logbook tasks (1000 completed & logged)
  // =========================================================================
  console.log("\nCreating 1000 logbook tasks...")
  const completedPrefixes = [
    "Review",
    "Update",
    "Fix",
    "Write",
    "Send",
    "Prepare",
    "Schedule",
    "Research",
    "Organize",
    "Clean",
    "Draft",
    "Submit",
    "Complete",
    "Check",
    "Plan",
    "Design",
    "Test",
    "Refactor",
    "Deploy",
    "Document",
  ]
  const completedSuffixes = [
    "report",
    "meeting notes",
    "presentation",
    "email",
    "invoice",
    "documentation",
    "PR feedback",
    "test suite",
    "config",
    "spreadsheet",
    "proposal",
    "wireframes",
    "budget",
    "checklist",
    "agenda",
    "dashboard",
    "analytics",
    "backup",
    "release notes",
    "API endpoint",
  ]
  const projectIds = [
    webAppProjectId,
    mobileAppProjectId,
    fitnessProjectId,
    homeProjectId,
    shoppingProjectId,
    programmingCourseId,
    freelanceProjectId,
    bookWritingProjectId,
    null,
    null,
    null,
  ]

  const logbookValues = Array.from({ length: 1000 }, (_, i) => {
    const age = Math.floor(Math.random() * 90)
    const completed = new Date(today)
    completed.setDate(completed.getDate() - age)
    const prefix = completedPrefixes[i % completedPrefixes.length]!
    const suffix = completedSuffixes[i % completedSuffixes.length]!
    const pid = projectIds[i % projectIds.length] ?? null

    return {
      id: createId("task"),
      userId,
      title: `${prefix} ${suffix} #${i + 1}`,
      status: "completed" as const,
      isSomeday: false,
      isLogged: true,
      completedAt: completed,
      listId: pid,
    }
  })

  // Insert in batches of 200 to avoid SQLite limits
  for (let i = 0; i < logbookValues.length; i += 200) {
    await db.insert(tasks).values(logbookValues.slice(i, i + 200))
  }
  console.log("Logbook tasks created")

  // =========================================================================
  // Bulk trash tasks (1000 trashed)
  // =========================================================================
  console.log("\nCreating 1000 trash tasks...")
  const trashedPrefixes = [
    "Old",
    "Cancelled",
    "Abandoned",
    "Deprecated",
    "Outdated",
    "Archived",
    "Superseded",
    "Removed",
    "Discarded",
    "Dropped",
  ]
  const trashedSuffixes = [
    "feature request",
    "bug report",
    "migration",
    "prototype",
    "experiment",
    "spike",
    "investigation",
    "integration",
    "setup",
    "task",
    "idea",
    "concept",
    "plan",
    "draft",
    "sketch",
    "benchmark",
    "audit",
    "review",
    "cleanup",
    "refactor",
  ]

  const trashValues = Array.from({ length: 1000 }, (_, i) => {
    const age = Math.floor(Math.random() * 60)
    const trashed = new Date(today)
    trashed.setDate(trashed.getDate() - age)
    const prefix = trashedPrefixes[i % trashedPrefixes.length]!
    const suffix = trashedSuffixes[i % trashedSuffixes.length]!
    const pid = projectIds[i % projectIds.length] ?? null

    return {
      id: createId("task"),
      userId,
      title: `${prefix} ${suffix} #${i + 1}`,
      status: "trashed" as const,
      isSomeday: false,
      trashedAt: trashed,
      listId: pid,
    }
  })

  for (let i = 0; i < trashValues.length; i += 200) {
    await db.insert(tasks).values(trashValues.slice(i, i + 200))
  }
  console.log("Trash tasks created")

  console.log("\n========================================")
  console.log("Seed completed successfully!")
  console.log("========================================")
  console.log("\nLogin credentials:")
  console.log(`   Email:    ${SEED_EMAIL}`)
  console.log(`   Password: ${SEED_PASSWORD}`)
  console.log("\nSummary:")
  console.log("   - 1 seed user")
  console.log("   - 3 areas (Work, Personal, Learning)")
  console.log("   - 8 projects (6 in areas, 2 without areas)")
  console.log("   - 5 tags")
  console.log("   - 90+ active tasks across multiple dates")
  console.log("   - 1000 completed tasks in logbook")
  console.log("   - 1000 trashed tasks")
  console.log("   - Tasks assigned to areas without projects")
  console.log("\nYou can now start the dev server with: vp run dev")
}

// Run seed
seed()
  .then(() => {
    console.log("\nDone!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\nError seeding database:", error)
    process.exit(1)
  })
