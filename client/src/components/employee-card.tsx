import { Link } from "wouter";
import { MapPin, Mail, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Employee, Team } from "@shared/schema";

interface EmployeeCardProps {
  employee: Employee;
  team?: Team | null;
}

export function EmployeeCard({ employee, team }: EmployeeCardProps) {
  const initials = `${employee.firstName?.[0] || ""}${employee.lastName?.[0] || ""}`.toUpperCase();

  return (
    <Link href={`/directory/${employee.id}`}>
      <Card className="hover-elevate active-elevate-2 cursor-pointer transition-all duration-200 h-full">
        <CardContent className="p-5">
          <div className="flex flex-col items-center text-center">
            <Avatar className="h-20 w-20 mb-4 ring-2 ring-background shadow-sm">
              <AvatarImage src={employee.profileImageUrl || undefined} alt={`${employee.firstName} ${employee.lastName}`} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            
            <h3 className="font-semibold text-base mb-0.5" data-testid={`text-employee-name-${employee.id}`}>
              {employee.firstName} {employee.lastName}
            </h3>
            
            <p className="text-sm text-muted-foreground mb-3">
              {employee.title || "Team Member"}
            </p>
            
            {team && (
              <Badge variant="secondary" className="mb-3 text-xs">
                {team.name}
              </Badge>
            )}
            
            {employee.whatIDo && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                {employee.whatIDo}
              </p>
            )}
            
            <div className="flex items-center gap-3 text-muted-foreground">
              {employee.location && (
                <div className="flex items-center gap-1 text-xs">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate max-w-[80px]">{employee.location}</span>
                </div>
              )}
              {employee.email && (
                <Mail className="h-3.5 w-3.5" />
              )}
              {employee.slackHandle && (
                <MessageSquare className="h-3.5 w-3.5" />
              )}
            </div>
            
            {employee.strengths && employee.strengths.length > 0 && (
              <div className="flex flex-wrap gap-1 justify-center mt-3">
                {employee.strengths.slice(0, 3).map((strength) => (
                  <Badge 
                    key={strength} 
                    variant="outline" 
                    className="text-[10px] px-1.5 py-0 h-5"
                  >
                    {strength}
                  </Badge>
                ))}
                {employee.strengths.length > 3 && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                    +{employee.strengths.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
