import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/middleware/auth";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { db } from "@/db/client";
import { employees, leaveRequests, leaveRequestDays } from "@/db/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";

interface CalendarEvent {
  date: string;
  type: "birthday" | "anniversary" | "time_off";
  employeeName: string;
  employeeId: string;
  detail?: string;
}

function toDateString(val: unknown): string {
  if (typeof val === "string") {
    return val.slice(0, 10);
  }
  if (val instanceof Date) {
    return val.toISOString().slice(0, 10);
  }
  return String(val).slice(0, 10);
}

function eachDayBetween(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(start + "T00:00:00");
  const endDate = new Date(end + "T00:00:00");
  while (current <= endDate) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1), 10);
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10);

    const companyId = user.companyId;

    const companyEmployees = await db
      .select({
        id: employees.id,
        name: employees.name,
        birthday: employees.birthday,
        joiningDate: employees.joiningDate,
      })
      .from(employees)
      .where(and(eq(employees.companyId, companyId), eq(employees.isActive, true)));

    const events: CalendarEvent[] = [];
    const daysInMonth = new Date(year, month, 0).getDate();

    for (const emp of companyEmployees) {
      if (emp.birthday) {
        const bdayStr = toDateString(emp.birthday);
        const bday = new Date(bdayStr + "T00:00:00");
        const bdayMonth = bday.getMonth() + 1;
        const bdayDay = bday.getDate();
        if (bdayMonth === month && bdayDay >= 1 && bdayDay <= daysInMonth) {
          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(bdayDay).padStart(2, "0")}`;
          events.push({
            date: dateStr,
            type: "birthday",
            employeeName: emp.name,
            employeeId: emp.id,
          });
        }
      }

      if (emp.joiningDate) {
        const jdateStr = toDateString(emp.joiningDate);
        const jdate = new Date(jdateStr + "T00:00:00");
        const jMonth = jdate.getMonth() + 1;
        const jDay = jdate.getDate();
        const jYear = jdate.getFullYear();
        if (jMonth === month && jDay >= 1 && jDay <= daysInMonth && jYear < year) {
          const yearsAgo = year - jYear;
          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(jDay).padStart(2, "0")}`;
          events.push({
            date: dateStr,
            type: "anniversary",
            employeeName: emp.name,
            employeeId: emp.id,
            detail: `${yearsAgo} ${yearsAgo === 1 ? "year" : "years"}`,
          });
        }
      }
    }

    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

    const employeeIds = companyEmployees.map((e: { id: string }) => e.id);
    if (employeeIds.length > 0) {
      const approvedRequests = await db
        .select({
          id: leaveRequests.id,
          employeeId: leaveRequests.employeeId,
          leaveType: leaveRequests.leaveType,
          fromDate: leaveRequests.fromDate,
          toDate: leaveRequests.toDate,
        })
        .from(leaveRequests)
        .where(
          and(
            inArray(leaveRequests.employeeId, employeeIds),
            eq(leaveRequests.overallStatus, "approved"),
            lte(leaveRequests.fromDate, monthEnd),
            gte(leaveRequests.toDate, monthStart)
          )
        );

      if (approvedRequests.length > 0) {
        const requestIdList = approvedRequests.map((r: { id: string }) => r.id);

        const days = await db
          .select({
            leaveRequestId: leaveRequestDays.leaveRequestId,
            date: leaveRequestDays.date,
            leaveType: leaveRequestDays.leaveType,
            isHalfDay: leaveRequestDays.isHalfDay,
            halfDayPeriod: leaveRequestDays.halfDayPeriod,
          })
          .from(leaveRequestDays)
          .where(
            and(
              inArray(leaveRequestDays.leaveRequestId, requestIdList),
              gte(leaveRequestDays.date, monthStart),
              lte(leaveRequestDays.date, monthEnd)
            )
          );

        const employeeNameMap = new Map(companyEmployees.map((e: { id: string; name: string }) => [e.id, e.name]));
        const requestsWithDays = new Set(days.map((d: { leaveRequestId: string }) => d.leaveRequestId));

        for (const day of days) {
          const req = approvedRequests.find((r: { id: string }) => r.id === day.leaveRequestId);
          if (!req) continue;
          const empName = employeeNameMap.get(req.employeeId) || "Unknown";

          const leaveLabel = day.leaveType === "vacation"
            ? "Vacation"
            : day.leaveType === "personal_sick"
            ? "Sick"
            : day.leaveType === "unpaid"
            ? "Unpaid"
            : "Other";

          let detail = leaveLabel;
          if (day.isHalfDay && day.halfDayPeriod) {
            detail += ` (${day.halfDayPeriod === "morning" ? "AM" : "PM"})`;
          }

          events.push({
            date: toDateString(day.date),
            type: "time_off",
            employeeName: empName,
            employeeId: req.employeeId,
            detail,
          });
        }

        for (const req of approvedRequests) {
          if (requestsWithDays.has(req.id)) continue;
          const empName = employeeNameMap.get(req.employeeId) || "Unknown";
          const fromStr = toDateString(req.fromDate);
          const toStr = toDateString(req.toDate);
          const leaveLabel = req.leaveType === "vacation"
            ? "Vacation"
            : req.leaveType === "personal_sick"
            ? "Sick"
            : req.leaveType === "unpaid"
            ? "Unpaid"
            : "Other";

          const allDays = eachDayBetween(fromStr, toStr);
          for (const d of allDays) {
            if (d >= monthStart && d <= monthEnd) {
              events.push({
                date: d,
                type: "time_off",
                employeeName: empName,
                employeeId: req.employeeId,
                detail: leaveLabel,
              });
            }
          }
        }
      }
    }

    return successResponse({ events });
  } catch (error) {
    return errorResponse(error);
  }
}
