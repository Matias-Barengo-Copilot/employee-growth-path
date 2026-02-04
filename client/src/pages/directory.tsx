import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Users, Filter } from "lucide-react";
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
import { PageHeader } from "@/components/page-header";
import { EmployeeCard } from "@/components/employee-card";
import { EmptyState } from "@/components/empty-state";
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

  return (
    <div className="flex-1 overflow-auto pb-20 lg:pb-0">
      <PageHeader 
        title="Directory" 
        description={`${employees.length} team members`}
      />
      
      <div className="p-4 lg:p-6 space-y-6">
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
