import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Users, Filter, Cake } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageHeader } from "@/components/page-header";
import { EmployeeCard } from "@/components/employee-card";
import { EmptyState } from "@/components/empty-state";
import { parseISO, isValid, format, differenceInCalendarDays, setYear } from "date-fns";
import { Link } from "wouter";
import type { Employee, Team } from "@shared/schema";

interface DirectoryData {
  employees: Employee[];
  teams: Team[];
}

export default function Directory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");

  const { data, isLoading } = useQuery<DirectoryData>({
    queryKey: ["/api/directory"],
  });

  const employees = data?.employees || [];
  const teams = data?.teams || [];

  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch = searchQuery === "" || 
      `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.strengths?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesTeam = selectedTeam === "all" || employee.teamId === selectedTeam;
    
    return matchesSearch && matchesTeam;
  });

  const getTeamForEmployee = (employee: Employee) => {
    return teams.find(t => t.id === employee.teamId);
  };

  const upcomingBirthdays = employees
    .filter((e) => {
      if (!e.dateOfBirth) return false;
      const parsed = parseISO(e.dateOfBirth);
      return isValid(parsed);
    })
    .map((e) => {
      const dob = parseISO(e.dateOfBirth!);
      const today = new Date();
      let nextBirthday = setYear(dob, today.getFullYear());
      if (differenceInCalendarDays(nextBirthday, today) < 0) {
        nextBirthday = setYear(dob, today.getFullYear() + 1);
      }
      const daysUntil = differenceInCalendarDays(nextBirthday, today);
      return { employee: e, dob, nextBirthday, daysUntil };
    })
    .filter((b) => b.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  return (
    <div className="flex-1 overflow-auto pb-20 lg:pb-0">
      <PageHeader 
        title="Directory" 
        description={`${employees.length} team members`}
      />
      
      <div className="p-4 lg:p-6 space-y-6">
        {!isLoading && upcomingBirthdays.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-3">
              <Cake className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Upcoming Birthdays</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 overflow-x-auto pb-1">
                {upcomingBirthdays.map(({ employee: emp, dob, daysUntil }) => {
                  const initials = `${emp.firstName?.[0] || ""}${emp.lastName?.[0] || ""}`.toUpperCase();
                  return (
                    <Link key={emp.id} href={`/directory/${emp.id}`}>
                      <div className="flex flex-col items-center gap-1.5 min-w-[72px] hover-elevate rounded-md p-2 cursor-pointer" data-testid={`birthday-card-${emp.id}`}>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={emp.profileImageUrl || undefined} alt={`${emp.firstName} ${emp.lastName}`} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium text-center truncate max-w-[72px]">{emp.firstName}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {daysUntil === 0 ? "Today!" : daysUntil === 1 ? "Tomorrow" : `${format(dob, "MMM d")}`}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, role, or skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-directory-search"
            />
          </div>
          <Select value={selectedTeam} onValueChange={setSelectedTeam}>
            <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-team-filter">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Teams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        ) : filteredEmployees.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No teammates found"
            description={searchQuery || selectedTeam !== "all" 
              ? "Try adjusting your search or filter"
              : "Your team directory is empty"
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredEmployees.map((employee) => (
              <EmployeeCard
                key={employee.id}
                employee={employee}
                team={getTeamForEmployee(employee)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
