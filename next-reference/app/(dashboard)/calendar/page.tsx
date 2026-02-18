'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Cake, Briefcase, Palmtree, Loader2 } from 'lucide-react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  format,
  isSameMonth,
  isToday,
  isSameDay,
} from 'date-fns';
import { enUS } from 'date-fns/locale';

interface CalendarEvent {
  date: string;
  type: 'birthday' | 'anniversary' | 'time_off';
  employeeName: string;
  employeeId: string;
  detail?: string;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EVENT_STYLES = {
  birthday: {
    bg: 'bg-pink-100 dark:bg-pink-900/30',
    text: 'text-pink-700 dark:text-pink-300',
    dot: 'bg-pink-500',
    label: 'Birthday',
  },
  anniversary: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    dot: 'bg-blue-500',
    label: 'Anniversary',
  },
  time_off: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500',
    label: 'Time Off',
  },
};

function EventIcon({ type }: { type: CalendarEvent['type'] }) {
  const className = 'h-3 w-3 shrink-0';
  if (type === 'birthday') return <Cake className={className} />;
  if (type === 'anniversary') return <Briefcase className={className} />;
  return <Palmtree className={className} />;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      try {
        const res = await fetch(`/api/calendar-events?month=${month}&year=${year}`);
        const json = await res.json();
        if (json.success) {
          setEvents(json.data.events);
        }
      } catch {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, [month, year]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentDate]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = event.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(event);
    }
    return map;
  }, [events]);

  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, 'yyyy-MM-dd');
    return eventsByDate.get(key) || [];
  }, [selectedDate, eventsByDate]);

  const handlePrevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
    setSelectedDate(null);
  };
  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
    setSelectedDate(null);
  };
  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-calendar-title">Calendar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Birthdays, work anniversaries, and time off at a glance
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={handlePrevMonth} data-testid="button-prev-month">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleNextMonth} data-testid="button-next-month">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <h2 className="text-lg font-semibold" data-testid="text-current-month">
                  {format(currentDate, 'MMMM yyyy', { locale: enUS })}
                </h2>
                <Button variant="outline" size="sm" onClick={handleToday} data-testid="button-today">
                  Today
                </Button>
              </div>

              {loading && (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}

              {!loading && (
                <>
                  <div className="grid grid-cols-7 mb-2">
                    {WEEKDAYS.map((day) => (
                      <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7">
                    {calendarDays.map((day) => {
                      const dateKey = format(day, 'yyyy-MM-dd');
                      const dayEvents = eventsByDate.get(dateKey) || [];
                      const inMonth = isSameMonth(day, currentDate);
                      const today = isToday(day);
                      const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                      const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                      return (
                        <button
                          key={dateKey}
                          onClick={() => setSelectedDate(day)}
                          className={`
                            relative min-h-[80px] md:min-h-[100px] p-1 border border-border/40 text-left
                            transition-colors cursor-pointer
                            ${!inMonth ? 'opacity-30' : ''}
                            ${isSelected ? 'bg-accent/50 ring-1 ring-primary/30' : ''}
                            ${today && !isSelected ? 'bg-accent/20' : ''}
                            ${isWeekend && inMonth && !isSelected ? 'bg-muted/30' : ''}
                          `}
                          data-testid={`calendar-day-${dateKey}`}
                        >
                          <span className={`
                            text-xs font-medium inline-flex items-center justify-center
                            ${today ? 'bg-primary text-primary-foreground rounded-full w-6 h-6' : ''}
                          `}>
                            {format(day, 'd')}
                          </span>
                          <div className="mt-0.5 space-y-0.5 overflow-hidden">
                            {dayEvents.slice(0, 3).map((event, i) => {
                              const style = EVENT_STYLES[event.type];
                              return (
                                <div
                                  key={`${event.employeeId}-${event.type}-${i}`}
                                  className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate ${style.bg} ${style.text}`}
                                >
                                  <span className="hidden md:inline">
                                    {event.employeeName.split(' ')[0]}
                                  </span>
                                  <span className="md:hidden">
                                    {event.employeeName.split(' ')[0]?.charAt(0)}
                                  </span>
                                </div>
                              );
                            })}
                            {dayEvents.length > 3 && (
                              <div className="text-[10px] text-muted-foreground px-1">
                                +{dayEvents.length - 3} more
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-3">Legend</h3>
              <div className="space-y-2">
                {Object.entries(EVENT_STYLES).map(([type, style]) => (
                  <div key={type} className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${style.dot} shrink-0`} />
                    <span className="text-sm">{style.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-3" data-testid="text-detail-title">
                {selectedDate ? format(selectedDate, 'EEEE, MMMM d', { locale: enUS }) : 'Select a date'}
              </h3>
              {!selectedDate && (
                <p className="text-sm text-muted-foreground">
                  Click on a day to see its events
                </p>
              )}
              {selectedDate && selectedDateEvents.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No events on this day
                </p>
              )}
              {selectedDateEvents.length > 0 && (
                <div className="space-y-2">
                  {selectedDateEvents.map((event, i) => {
                    const style = EVENT_STYLES[event.type];
                    return (
                      <div
                        key={`${event.employeeId}-${event.type}-${i}`}
                        className={`flex items-start gap-2 p-2 rounded-md ${style.bg}`}
                        data-testid={`event-${event.type}-${event.employeeId}`}
                      >
                        <EventIcon type={event.type} />
                        <div className="min-w-0">
                          <p className={`text-sm font-medium ${style.text}`}>
                            {event.employeeName}
                          </p>
                          <p className={`text-xs ${style.text} opacity-80`}>
                            {event.type === 'birthday' && 'Birthday'}
                            {event.type === 'anniversary' && `Work Anniversary - ${event.detail}`}
                            {event.type === 'time_off' && (event.detail || 'Time Off')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-3">This Month</h3>
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : events.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events this month</p>
              ) : (
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                  {events
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((event, i) => {
                      const style = EVENT_STYLES[event.type];
                      const eventDate = new Date(event.date + 'T00:00:00');
                      return (
                        <button
                          key={`${event.date}-${event.employeeId}-${event.type}-${i}`}
                          onClick={() => {
                            setSelectedDate(eventDate);
                          }}
                          className="flex items-center gap-2 text-left w-full p-1.5 rounded-md hover-elevate"
                          data-testid={`summary-event-${i}`}
                        >
                          <span className={`w-2 h-2 rounded-full ${style.dot} shrink-0`} />
                          <span className="text-xs text-muted-foreground w-10 shrink-0">
                            {format(eventDate, 'MMM d')}
                          </span>
                          <span className="text-xs truncate flex-1">
                            {event.employeeName}
                          </span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                            {event.type === 'birthday' ? 'Bday' : event.type === 'anniversary' ? 'Anniv' : 'Off'}
                          </Badge>
                        </button>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
