import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, endOfMonth, endOfWeek, isAfter, isBefore, isSameDay, startOfMonth, startOfWeek, eachDayOfInterval } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarDays, Clock, AlertTriangle, CheckCircle, BookOpen, Bell } from "lucide-react";

type AgendaEvent = {
  id: string;
  title: string;
  date: string;
  type: "deadline" | "grading" | "status";
  subject?: string | null;
  color?: string | null;
  meta?: string;
};

const Agenda = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const isProfessor = profile?.role === "professor" || profile?.role === "admin";

  useEffect(() => {
    const fetchEvents = async () => {
      if (!profile) return;
      setLoading(true);

      try {
        if (isProfessor) {
          const { data: courses } = await supabase
            .from("courses")
            .select("id, title, deadline, subject:subjects(name, color)")
            .eq("professor_id", profile.id);

          const { data: professorStudents } = await supabase
            .from("professor_students")
            .select("student_id")
            .eq("professor_id", profile.id);

          const studentIds = professorStudents?.map((s) => s.student_id) || [];
          const { data: submissions } = studentIds.length
            ? await supabase
                .from("submissions")
                .select("id, status, created_at, course:courses(id, title, deadline, subject:subjects(name, color)), student:profiles(full_name)")
                .in("student_id", studentIds)
            : { data: [] };

          const courseEvents: AgendaEvent[] =
            courses
              ?.filter((c) => c.deadline)
              .map((c) => ({
                id: c.id,
                title: c.title,
                date: c.deadline as string,
                type: "deadline",
                subject: c.subject?.name,
                color: c.subject?.color,
                meta: "Deadline du cours",
              })) || [];

          const gradingEvents: AgendaEvent[] =
            submissions
              ?.filter((s) => s.status !== "graded")
              .map((s) => ({
                id: s.id,
                title: s.course?.title || "Soumission",
                date: s.created_at,
                type: "grading",
                subject: s.course?.subject?.name,
                color: s.course?.subject?.color,
                meta: `À noter (${s.status === "pending" ? "en attente" : "soumis"})`,
              })) || [];

          setEvents([...courseEvents, ...gradingEvents]);
        } else {
          const { data: assignment } = await supabase
            .from("professor_students")
            .select("professor_id")
            .eq("student_id", profile.id)
            .maybeSingle();

          const professorId = assignment?.professor_id;
          const { data: courses } = professorId
            ? await supabase
                .from("courses")
                .select("id, title, deadline, subject:subjects(name, color)")
                .eq("professor_id", professorId)
            : { data: [] };

          const { data: submissions } = await supabase
            .from("submissions")
            .select("id, status, created_at, course:courses(id, title, deadline, subject:subjects(name, color))")
            .eq("student_id", profile.id);

          const courseEvents: AgendaEvent[] =
            courses
              ?.filter((c) => c.deadline)
              .map((c) => ({
                id: c.id,
                title: c.title,
                date: c.deadline as string,
                type: "deadline",
                subject: c.subject?.name,
                color: c.subject?.color,
                meta: "Deadline du cours",
              })) || [];

          const submissionEvents: AgendaEvent[] =
            submissions?.map((s) => ({
              id: s.id,
              title: s.course?.title || "Soumission",
              date: s.course?.deadline || s.created_at,
              type: "status",
              subject: s.course?.subject?.name,
              color: s.course?.subject?.color,
              meta:
                s.status === "graded"
                  ? "Noté"
                  : s.status === "submitted"
                    ? "Soumis - en attente de note"
                    : "À rendre",
            })) || [];

          setEvents([...courseEvents, ...submissionEvents]);
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible de charger l'agenda.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [profile, isProfessor, toast]);

  // Upcoming events (next 30 days)
  const upcoming = useMemo(() => {
    const now = new Date();
    const limit = addDays(now, 30);
    return events
      .filter((ev) => {
        const date = new Date(ev.date);
        return isAfter(date, now) && isBefore(date, limit);
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 8);
  }, [events]);

  // Reminders for soon deadlines (within 48h)
  useEffect(() => {
    if (!profile) return;
    const now = new Date();
    const soon = addDays(now, 2);
    const alreadyNotified = new Set<string>(
      JSON.parse(localStorage.getItem(`agenda:reminders:${profile.id}`) || "[]")
    );

    const soonEvents = events.filter((ev) => {
      const d = new Date(ev.date);
      return isAfter(d, now) && isBefore(d, soon);
    });

    if (soonEvents.length === 0) return;

    const shown: string[] = [];
    soonEvents.forEach((ev) => {
      if (alreadyNotified.has(ev.id)) return;
      shown.push(ev.id);
      toast({
        title: "Rappel",
        description: `${ev.title} - ${format(new Date(ev.date), "dd MMM HH:mm", { locale: fr })}`,
      });
    });

    if (shown.length > 0) {
      const updated = Array.from(new Set([...alreadyNotified, ...shown]));
      localStorage.setItem(`agenda:reminders:${profile.id}`, JSON.stringify(updated));
    }
  }, [events, toast, profile]);

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(new Date()), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(new Date()), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, []);

  const dayEvents = (day: Date) => events.filter((ev) => isSameDay(new Date(ev.date), day));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="section-title">Agenda</p>
            <h1 className="text-3xl font-bold text-foreground">Calendrier & Échéancier</h1>
            <p className="text-muted-foreground">
              Deadlines des cours et tâches à traiter automatiquement regroupées.
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              {isProfessor ? "Professeur" : "Étudiant"}
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-primary" />
                  Calendrier du mois
                </CardTitle>
                <CardDescription>Visualisez les deadlines et actions à venir</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[420px] bg-muted/40 animate-pulse rounded-xl" />
              ) : (
                <div className="grid grid-cols-7 gap-2 text-center text-sm">
                  {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
                    <div key={d} className="text-muted-foreground font-medium py-2">
                      {d}
                    </div>
                  ))}
                  {monthDays.map((day) => {
                    const evs = dayEvents(day);
                    const hasEvents = evs.length > 0;
                    return (
                      <div
                        key={day.toISOString()}
                        className={`border rounded-xl p-2 min-h-[90px] text-left bg-card ${
                          isSameDay(day, new Date()) ? "border-primary/60" : "border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{format(day, "d", { locale: fr })}</span>
                          {isSameDay(day, new Date()) && (
                            <span className="text-primary font-semibold">Aujourd'hui</span>
                          )}
                        </div>
                        <div className="mt-2 space-y-1">
                          {hasEvents
                            ? evs.slice(0, 3).map((ev) => (
                                <div
                                  key={ev.id}
                                  className="px-2 py-1 rounded-lg text-xs flex items-center gap-2"
                                  style={{ backgroundColor: `${ev.color || "hsl(var(--muted))"}25` }}
                                >
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: ev.color || "hsl(var(--primary))" }}
                                  />
                                  <span className="truncate">{ev.title}</span>
                                </div>
                              ))
                            : (
                              <span className="text-[11px] text-muted-foreground">Aucun événement</span>
                            )}
                          {evs.length > 3 && (
                            <span className="text-[11px] text-muted-foreground">+ {evs.length - 3} autres</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-accent" />
                Échéancier (30 jours)
              </CardTitle>
              <CardDescription>Vos prochaines échéances et tâches</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 bg-muted/40 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : upcoming.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <CheckCircle className="w-10 h-10 mx-auto mb-2" />
                  Aucune échéance imminente
                </div>
              ) : (
                upcoming.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-card"
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold"
                      style={{ backgroundColor: `${ev.color || "hsl(var(--primary))"}20` }}
                    >
                      <span className="text-foreground">{format(new Date(ev.date), "dd", { locale: fr })}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{ev.title}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <CalendarDays className="w-3 h-3" />
                        {format(new Date(ev.date), "dd MMM HH:mm", { locale: fr })}
                        {ev.subject && <Badge variant="secondary" className="ml-1">{ev.subject}</Badge>}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{ev.meta}</p>
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {ev.type === "deadline" ? "Deadline" : ev.type === "grading" ? "À noter" : "Soumission"}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Rappels automatiques
            </CardTitle>
            <CardDescription>Déclenchés pour les échéances sous 48h (toasts in-app)</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Les rappels s'affichent automatiquement quand une deadline ou une tâche à traiter approche.
              Une fois affichés, ils ne seront pas répétés sur la même session.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Agenda;
