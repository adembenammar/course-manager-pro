import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  BookOpen, 
  FileText, 
  Award,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, addDays, isAfter, isBefore, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AnalyticsData {
  totalStudents: number;
  totalProfessors: number;
  totalCourses: number;
  totalSubmissions: number;
  averageGrade: number;
  submissionsByStatus: { name: string; value: number; color: string }[];
  coursesBySubject: { name: string; count: number; color: string }[];
  submissionsOverTime: { date: string; count: number }[];
  gradeDistribution: { range: string; count: number }[];
  progressBySubject: { name: string; submissions: number; graded: number; average: number; color: string }[];
  lateHeatmap: { date: string; count: number }[];
  riskCourses: { id: string; title: string; deadline?: string | null; subject?: string | null; color?: string | null; submissions: number }[];
  riskSignals: { label: string; value: number; tone: 'warning' | 'destructive' | 'accent' }[];
  topProgress: { name: string; average: number; submissions: number; graded: number; color: string }[];
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const Analytics = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      // Fetch all data in parallel
      const [
        studentsRes,
        professorsRes,
        coursesRes,
        submissionsDetailedRes,
        gradesRes,
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'professor'),
        supabase.from('courses').select('id, title, deadline, subject:subjects(name, color)'),
        supabase
          .from('submissions')
          .select('id, status, grade, created_at, submitted_at, course:courses(id, title, deadline, subject:subjects(name, color))'),
        supabase.from('submissions').select('grade').not('grade', 'is', null),
      ]);

      // Process submissions by status
      const submissions = submissionsDetailedRes.data || [];
      const statusCounts = {
        pending: 0,
        submitted: 0,
        graded: 0,
      };
      submissions.forEach((s: any) => {
        if (s.status in statusCounts) {
          statusCounts[s.status as keyof typeof statusCounts]++;
        }
      });

      // Process courses by subject + progression
      const courses = coursesRes.data || [];
      const subjectCounts: Record<string, { count: number; color: string }> = {};
      const subjectProgress: Record<string, { submissions: number; graded: number; totalGrade: number; color: string }> = {};
      courses.forEach((c: any) => {
        const subjectName = c.subject?.name || c.subjects?.name || 'Sans matire';
        const color = c.subject?.color || c.subjects?.color || '#6B7280';
        if (!subjectCounts[subjectName]) {
          subjectCounts[subjectName] = { count: 0, color };
        }
        if (!subjectProgress[subjectName]) {
          subjectProgress[subjectName] = { submissions: 0, graded: 0, totalGrade: 0, color };
        }
        subjectCounts[subjectName].count++;
      });
      submissions.forEach((s: any) => {
        const subjectName = s.course?.subject?.name || 'Sans matire';
        const color = s.course?.subject?.color || '#6B7280';
        if (!subjectProgress[subjectName]) {
          subjectProgress[subjectName] = { submissions: 0, graded: 0, totalGrade: 0, color };
        }
        subjectProgress[subjectName].submissions++;
        if (s.status === 'graded' && s.grade !== null) {
          subjectProgress[subjectName].graded++;
          subjectProgress[subjectName].totalGrade += Number(s.grade);
        }
      });

      // Process submissions over time (last 7 days)
      const submissionsOverTime = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateStr = format(date, 'yyyy-MM-dd');
        const count = submissions.filter(
          (s: any) => s.created_at && s.created_at.startsWith(dateStr)
        ).length;
        submissionsOverTime.push({
          date: format(date, 'EEE', { locale: fr }),
          count,
        });
      }

      // Late submissions heatmap (last 30 days)
      const lateHeatmap = [];
      for (let i = 29; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateStr = format(date, 'yyyy-MM-dd');
        const count = submissions.filter((s: any) => {
          const deadline = s.course?.deadline ? new Date(s.course.deadline) : null;
          const submittedAt = s.submitted_at ? new Date(s.submitted_at) : new Date(s.created_at);
          return deadline && submittedAt > deadline && format(submittedAt, 'yyyy-MM-dd') === dateStr;
        }).length;
        lateHeatmap.push({ date: format(date, 'dd MMM', { locale: fr }), count });
      }

      // Process grade distribution
      const grades = gradesRes.data || [];
      const gradeRanges = {
        '0-5': 0,
        '6-10': 0,
        '11-15': 0,
        '16-20': 0,
      };
      grades.forEach((g: any) => {
        const grade = Number(g.grade);
        if (grade <= 5) gradeRanges['0-5']++;
        else if (grade <= 10) gradeRanges['6-10']++;
        else if (grade <= 15) gradeRanges['11-15']++;
        else gradeRanges['16-20']++;
      });

      // Calculate average grade
      const avgGrade =
        grades.length > 0
          ? grades.reduce((sum: number, g: any) => sum + Number(g.grade), 0) / grades.length
          : 0;

      // Progression par matiere
      const progressBySubject = Object.entries(subjectProgress).map(([name, value]) => ({
        name,
        submissions: value.submissions,
        graded: value.graded,
        average: value.graded ? Math.round((value.totalGrade / value.graded) * 10) / 10 : 0,
        color: value.color,
      }));

      // Detection des devoirs a risque : deadline < 3 jours et peu de soumissions
      const now = new Date();
      const soon = addDays(now, 3);
      const submissionByCourse: Record<string, number> = {};
      submissions.forEach((s: any) => {
        const courseId = s.course?.id;
        if (!courseId) return;
        submissionByCourse[courseId] = (submissionByCourse[courseId] || 0) + 1;
      });
      const riskCourses =
        courses
          ?.filter((c: any) => c.deadline && isAfter(new Date(c.deadline), now) && isBefore(new Date(c.deadline), soon))
          .map((c: any) => ({
            id: c.id,
            title: c.title,
            deadline: c.deadline,
            subject: c.subject?.name,
            color: c.subject?.color,
            submissions: submissionByCourse[c.id] || 0,
          })) || [];
      const lateSubmissions = submissions.filter((s: any) => {
        const deadline = s.course?.deadline ? new Date(s.course.deadline) : null;
        const submittedAt = s.submitted_at ? new Date(s.submitted_at) : s.created_at ? new Date(s.created_at) : null;
        return deadline && submittedAt && submittedAt > deadline && s.status !== 'graded';
      }).length;
      const dueSoon = submissions.filter((s: any) => {
        const deadline = s.course?.deadline ? new Date(s.course.deadline) : null;
        return deadline && isAfter(deadline, now) && isBefore(deadline, addDays(now, 7)) && s.status !== 'graded';
      }).length;
      const notSubmitted = submissions.filter((s: any) => s.status === 'pending').length;
      const topProgress = [...progressBySubject]
        .sort((a, b) => b.average - a.average)
        .slice(0, 3);

      setData({
        totalStudents: studentsRes.count || 0,
        totalProfessors: professorsRes.count || 0,
        totalCourses: courses.length,
        totalSubmissions: submissions.length,
        averageGrade: Math.round(avgGrade * 10) / 10,
        submissionsByStatus: [
          { name: 'En attente', value: statusCounts.pending, color: '#F59E0B' },
          { name: 'Soumis', value: statusCounts.submitted, color: '#3B82F6' },
          { name: 'Notees', value: statusCounts.graded, color: '#10B981' },
        ],
        coursesBySubject: Object.entries(subjectCounts).map(([name, { count, color }]) => ({
          name,
          count,
          color,
        })),
        submissionsOverTime,
        gradeDistribution: Object.entries(gradeRanges).map(([range, count]) => ({
          range,
          count,
        })),
        progressBySubject,
        lateHeatmap,
        riskCourses,
        riskSignals: [
          { label: 'En retard', value: lateSubmissions, tone: 'destructive' },
          { label: '< 7 jours', value: dueSoon, tone: 'warning' },
          { label: 'Non rendus', value: notSubmitted, tone: 'accent' },
        ],
        topProgress,
      });

      setLoading(false);
    };

    fetchAnalytics();
  }, []);

  const statCards = data
    ? [
        {
          title: 'tudiants',
          value: data.totalStudents,
          icon: Users,
          color: 'text-primary',
          bgColor: 'bg-primary/10',
        },
        {
          title: 'Professeurs',
          value: data.totalProfessors,
          icon: Award,
          color: 'text-accent',
          bgColor: 'bg-accent/10',
        },
        {
          title: 'Cours',
          value: data.totalCourses,
          icon: BookOpen,
          color: 'text-success',
          bgColor: 'bg-success/10',
        },
        {
          title: 'Moyenne gnrale',
          value: `${data.averageGrade}/20`,
          icon: TrendingUp,
          color: 'text-warning',
          bgColor: 'bg-warning/10',
        },
      ]
    : [];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="border-0 shadow-md">
                <CardContent className="p-6">
                  <div className="h-20 bg-muted animate-pulse rounded-lg" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytiques</h1>
          <p className="text-muted-foreground">Vue d'ensemble des statistiques de la plateforme</p>
        </div>

        {/* Focus prof + actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="surface card-hover p-4">
            <CardHeader className="p-0 mb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="w-5 h-5 text-primary" />
                Focus professeur
              </CardTitle>
              <CardDescription>
                Vue rapide : corrections en attente et moyenne
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-border/60 bg-card/70">
                <p className="text-xs text-muted-foreground">En attente</p>
                <p className="text-xl font-bold text-foreground">
                  {data?.submissionsByStatus.find((s) => s.name === 'En attente')?.value ?? 0}
                </p>
              </div>
              <div className="p-3 rounded-xl border border-border/60 bg-card/70">
                <p className="text-xs text-muted-foreground">Moyenne globale</p>
                <p className="text-xl font-bold text-foreground">{data?.averageGrade ?? 0}/20</p>
              </div>
            </CardContent>
          </Card>

          <Card className="surface card-hover p-4">
            <CardHeader className="p-0 mb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="w-5 h-5 text-accent" />
                Actions suggres
              </CardTitle>
              <CardDescription>
                Raccourcis pour les lments sensibles
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 space-y-2">
              {data?.riskCourses && data.riskCourses.length > 0 ? (
                data.riskCourses.slice(0, 3).map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-card/70">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-8 rounded-full" style={{ backgroundColor: c.color || 'hsl(var(--primary))' }} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{c.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          Deadline {c.deadline ? format(new Date(c.deadline), 'dd MMM', { locale: fr }) : 'N/A'}  {c.submissions} soum.
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="rounded-full">Voir</Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Aucune action critique dtecte.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Stats cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.title} className="border-0 shadow-md hover:shadow-lg transition-all hover:-translate-y-1">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Risk & progress highlights */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Risque de decrochage
              </CardTitle>
              <CardDescription>Base sur les retards et devoirs proches</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data?.riskSignals?.map((r) => (
                <div key={r.label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className="font-semibold text-foreground">{r.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full"
                      style={{
                        width: `${Math.min(r.value, 10) * 10}%`,
                        backgroundColor:
                          r.tone === 'destructive'
                            ? 'hsl(var(--destructive))'
                            : r.tone === 'warning'
                              ? 'hsl(var(--warning))'
                              : 'hsl(var(--accent))',
                      }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Top progres (matieres)
              </CardTitle>
              <CardDescription>Variation des moyennes par matiere</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data?.topProgress?.map((p) => (
                <div key={p.name} className="p-3 rounded-lg border border-border/60 bg-card">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-8 rounded-full" style={{ backgroundColor: p.color }} />
                      <div>
                        <p className="font-semibold text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.submissions} soum. / {p.graded} notees
                        </p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-success">{p.average}/20</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Alerts + risk */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Devoirs a risque (deadline {'<'} 3 jours)
              </CardTitle>
              <CardDescription>Cours proches avec peu de soumissions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data?.riskCourses?.length ? (
                data.riskCourses.map((c) => (
                  <div key={c.id} className="p-3 rounded-lg border border-border/60 bg-card flex items-start gap-3">
                    <div
                      className="w-2 h-10 rounded-full"
                      style={{ backgroundColor: c.color || 'hsl(var(--primary))' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{c.title}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {c.deadline ? format(new Date(c.deadline), 'dd MMM HH:mm', { locale: fr }) : 'Sans deadline'}
                        {c.subject && <span className="ml-1 text-xs text-foreground"> {c.subject}</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">Soumissions recues : {c.submissions}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Aucun cours a risque detecte.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-accent" />
                Progression par matiere
              </CardTitle>
              <CardDescription>Soumissions, corrections et moyenne</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data?.progressBySubject.map((s) => (
                  <div key={s.name} className="p-3 rounded-lg border border-border/60 bg-card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-8 rounded-full" style={{ backgroundColor: s.color }} />
                        <div>
                          <p className="font-semibold text-foreground">{s.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {s.submissions} soum. / {s.graded} notees / Moy. {s.average}/20
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts row 1 */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Submissions over time */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Soumissions cette semaine
              </CardTitle>
              <CardDescription>Evolution des soumissions sur les 7 derniers jours</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={data?.submissionsOverTime}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    fill="url(#colorCount)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Submissions by status */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Etat des soumissions
              </CardTitle>
              <CardDescription>Rpartition par statut</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={data?.submissionsByStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {data?.submissionsByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-4">
                {data?.submissionsByStatus.map((status) => (
                  <div key={status.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: status.color }}
                    />
                    <span className="text-sm text-muted-foreground">
                      {status.name}: {status.value}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts row 2 */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Courses by subject */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Cours par matire
              </CardTitle>
              <CardDescription>Distribution des cours</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data?.coursesBySubject} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="name" type="category" width={100} className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {data?.coursesBySubject.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Grade distribution */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                Distribution des notes
              </CardTitle>
              <CardDescription>Rpartition par tranche</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data?.gradeDistribution}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="range" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Heatmap / retard */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-destructive" />
                Retards (30 derniers jours)
              </CardTitle>
              <CardDescription>Soumissions apres deadline</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data?.lateHeatmap}>
                  <defs>
                    <linearGradient id="lateColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--destructive))"
                    fill="url(#lateColor)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;











