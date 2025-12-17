import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import {
  BookOpen,
  FolderOpen,
  FileText,
  TrendingUp,
  Clock,
  ArrowRight,
  Calendar,
  BarChart3,
  Users,
  CheckCircle,
  Award,
  Target,
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { useTranslation } from '@/hooks/useTranslation';

interface Stats {
  subjects: number;
  courses: number;
  submissions: number;
  pendingSubmissions: number;
  gradedSubmissions: number;
  students: number;
  averageGrade: number;
}

interface RecentCourse {
  id: string;
  title: string;
  deadline?: string;
  subject: { name: string; color: string } | null;
}

interface SubmissionsByDay {
  date: string;
  count: number;
}

interface StatusData {
  name: string;
  value: number;
  color: string;
}

interface SubjectStats {
  name: string;
  submissions: number;
  color: string;
}

const Dashboard = () => {
  const { profile } = useAuth();
  const { t, language } = useTranslation();
  const dateLocale = language === 'en' ? enUS : fr;
  const [stats, setStats] = useState<Stats>({
    subjects: 0,
    courses: 0,
    submissions: 0,
    pendingSubmissions: 0,
    gradedSubmissions: 0,
    students: 0,
    averageGrade: 0,
  });
  const [recentCourses, setRecentCourses] = useState<RecentCourse[]>([]);
  const [submissionsByDay, setSubmissionsByDay] = useState<SubmissionsByDay[]>([]);
  const [statusData, setStatusData] = useState<StatusData[]>([]);
  const [subjectStats, setSubjectStats] = useState<SubjectStats[]>([]);
  const [loading, setLoading] = useState(true);

  const isProfessor = profile?.role === 'professor' || profile?.role === 'admin';

  useEffect(() => {
    const statusLabels = {
      pending: t('En attente', 'Pending'),
      graded: t('Notees', 'Graded'),
      submitted: t('Soumises', 'Submitted'),
    };

    const fetchStats = async () => {
      if (!profile) return;

      if (isProfessor) {
        const [subjectsRes, coursesRes, studentsRes, recentCoursesRes] = await Promise.all([
          supabase.from('subjects').select('id', { count: 'exact', head: true }).eq('professor_id', profile.id),
          supabase.from('courses').select('id', { count: 'exact', head: true }).eq('professor_id', profile.id),
          supabase.from('professor_students').select('student_id', { count: 'exact', head: true }).eq('professor_id', profile.id),
          supabase.from('courses').select('id, title, deadline, subject:subjects(name, color)').eq('professor_id', profile.id).order('created_at', { ascending: false }).limit(5),
        ]);

        const { data: professorStudents } = await supabase
          .from('professor_students')
          .select('student_id')
          .eq('professor_id', profile.id);

        let submissionsCount = 0;
        let pendingCount = 0;
        let gradedCount = 0;
        let averageGrade = 0;
        let submissionsData: any[] = [];
        let subjectStatsData: SubjectStats[] = [];

        if (professorStudents && professorStudents.length > 0) {
          const studentIds = professorStudents.map((ps) => ps.student_id);

          const [submissionsRes, pendingRes, gradedRes, submissionsDataRes, subjectsWithSubmissions] = await Promise.all([
            supabase.from('submissions').select('id', { count: 'exact', head: true }).in('student_id', studentIds),
            supabase.from('submissions').select('id', { count: 'exact', head: true }).in('student_id', studentIds).eq('status', 'pending'),
            supabase.from('submissions').select('id, grade', { count: 'exact' }).in('student_id', studentIds).eq('status', 'graded'),
            supabase.from('submissions').select('created_at, status').in('student_id', studentIds).gte('created_at', subDays(new Date(), 7).toISOString()),
            supabase.from('submissions').select('course:courses(subject:subjects(name, color))').in('student_id', studentIds),
          ]);

          submissionsCount = submissionsRes.count || 0;
          pendingCount = pendingRes.count || 0;
          gradedCount = gradedRes.count || 0;
          submissionsData = submissionsDataRes.data || [];

          if (gradedRes.data && gradedRes.data.length > 0) {
            const grades = gradedRes.data.filter((s) => s.grade !== null).map((s) => s.grade as number);
            averageGrade = grades.length > 0 ? grades.reduce((a, b) => a + b, 0) / grades.length : 0;
          }

          if (subjectsWithSubmissions.data) {
            const subjectMap: Record<string, { count: number; color: string }> = {};
            subjectsWithSubmissions.data.forEach((s: any) => {
              const name = s.course?.subject?.name;
              const color = s.course?.subject?.color;
              if (name) {
                if (!subjectMap[name]) {
                  subjectMap[name] = { count: 0, color: color || '#3B82F6' };
                }
                subjectMap[name].count++;
              }
            });
            subjectStatsData = Object.entries(subjectMap).map(([name, data]) => ({
              name,
              submissions: data.count,
              color: data.color,
            }));
          }
        }

        setStats({
          subjects: subjectsRes.count || 0,
          courses: coursesRes.count || 0,
          submissions: submissionsCount,
          pendingSubmissions: pendingCount,
          gradedSubmissions: gradedCount,
          students: studentsRes.count || 0,
          averageGrade: Math.round(averageGrade * 10) / 10,
        });

        if (recentCoursesRes.data) {
          setRecentCourses(recentCoursesRes.data as RecentCourse[]);
        }

        const byDay: Record<string, number> = {};
        for (let i = 6; i >= 0; i--) {
          const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
          byDay[date] = 0;
        }

        submissionsData.forEach((s) => {
          const date = format(new Date(s.created_at), 'yyyy-MM-dd');
          if (byDay[date] !== undefined) {
            byDay[date]++;
          }
        });

        setSubmissionsByDay(
          Object.entries(byDay).map(([date, count]) => ({
            date: format(new Date(date), 'EEE', { locale: dateLocale }),
            count,
          }))
        );

        const pending = submissionsData.filter((s) => s.status === 'pending').length;
        const graded = submissionsData.filter((s) => s.status === 'graded').length;
        const submitted = submissionsData.filter((s) => s.status === 'submitted').length;

        setStatusData([
          { name: statusLabels.pending, value: pending, color: 'hsl(var(--warning))' },
          { name: statusLabels.graded, value: graded, color: 'hsl(var(--success))' },
          { name: statusLabels.submitted, value: submitted, color: 'hsl(var(--primary))' },
        ]);

        setSubjectStats(subjectStatsData);
      } else {
        const { data: assignment } = await supabase
          .from('professor_students')
          .select('professor_id')
          .eq('student_id', profile.id)
          .maybeSingle();

        if (!assignment) {
          setStats({ subjects: 0, courses: 0, submissions: 0, pendingSubmissions: 0, gradedSubmissions: 0, students: 0, averageGrade: 0 });
          setLoading(false);
          return;
        }

        const [
          subjectsRes,
          coursesRes,
          submissionsRes,
          pendingRes,
          gradedRes,
          recentCoursesRes,
          submissionsDataRes,
        ] = await Promise.all([
          supabase.from('subjects').select('id', { count: 'exact', head: true }).eq('professor_id', assignment.professor_id),
          supabase.from('courses').select('id', { count: 'exact', head: true }).eq('professor_id', assignment.professor_id),
          supabase.from('submissions').select('id', { count: 'exact', head: true }).eq('student_id', profile.id),
          supabase.from('submissions').select('id', { count: 'exact', head: true }).eq('student_id', profile.id).eq('status', 'pending'),
          supabase.from('submissions').select('id, grade', { count: 'exact' }).eq('student_id', profile.id).eq('status', 'graded'),
          supabase.from('courses').select('id, title, deadline, subject:subjects(name, color)').eq('professor_id', assignment.professor_id).order('created_at', { ascending: false }).limit(5),
          supabase.from('submissions').select('created_at, status').eq('student_id', profile.id).gte('created_at', subDays(new Date(), 7).toISOString()),
        ]);

        let averageGrade = 0;
        if (gradedRes.data && gradedRes.data.length > 0) {
          const grades = gradedRes.data.filter((s) => s.grade !== null).map((s) => s.grade as number);
          averageGrade = grades.length > 0 ? grades.reduce((a, b) => a + b, 0) / grades.length : 0;
        }

        setStats({
          subjects: subjectsRes.count || 0,
          courses: coursesRes.count || 0,
          submissions: submissionsRes.count || 0,
          pendingSubmissions: pendingRes.count || 0,
          gradedSubmissions: gradedRes.count || 0,
          students: 0,
          averageGrade: Math.round(averageGrade * 10) / 10,
        });

        if (recentCoursesRes.data) {
          setRecentCourses(recentCoursesRes.data as RecentCourse[]);
        }

        const byDay: Record<string, number> = {};
        for (let i = 6; i >= 0; i--) {
          const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
          byDay[date] = 0;
        }

        if (submissionsDataRes.data) {
          submissionsDataRes.data.forEach((s) => {
            const date = format(new Date(s.created_at), 'yyyy-MM-dd');
            if (byDay[date] !== undefined) {
              byDay[date]++;
            }
          });
        }

        setSubmissionsByDay(
          Object.entries(byDay).map(([date, count]) => ({
            date: format(new Date(date), 'EEE', { locale: dateLocale }),
            count,
          }))
        );

        const pending = submissionsDataRes.data?.filter((s) => s.status === 'pending').length || 0;
        const graded = submissionsDataRes.data?.filter((s) => s.status === 'graded').length || 0;
        const submitted = submissionsDataRes.data?.filter((s) => s.status === 'submitted').length || 0;

        setStatusData([
          { name: statusLabels.pending, value: pending, color: 'hsl(var(--warning))' },
          { name: statusLabels.graded, value: graded, color: 'hsl(var(--success))' },
          { name: statusLabels.submitted, value: submitted, color: 'hsl(var(--primary))' },
        ]);
      }

      setLoading(false);
    };

    fetchStats();
  }, [profile, isProfessor, language, t, dateLocale]);

  const statsCards = isProfessor
    ? [
        { title: t('Mes matieres', 'My subjects'), value: stats.subjects, icon: FolderOpen, color: 'text-primary', bgColor: 'bg-primary/10', href: '/subjects' },
        { title: t('Mes cours', 'My courses'), value: stats.courses, icon: BookOpen, color: 'text-accent', bgColor: 'bg-accent/10', href: '/courses' },
        { title: t('Mes etudiants', 'My students'), value: stats.students, icon: Users, color: 'text-success', bgColor: 'bg-success/10', href: '/students' },
        { title: t('En attente', 'Pending'), value: stats.pendingSubmissions, icon: Clock, color: 'text-warning', bgColor: 'bg-warning/10', href: '/submissions' },
      ]
    : [
        { title: t('Matieres', 'Subjects'), value: stats.subjects, icon: FolderOpen, color: 'text-primary', bgColor: 'bg-primary/10', href: '/subjects' },
        { title: t('Cours', 'Courses'), value: stats.courses, icon: BookOpen, color: 'text-accent', bgColor: 'bg-accent/10', href: '/courses' },
        { title: t('Mes soumissions', 'My submissions'), value: stats.submissions, icon: FileText, color: 'text-success', bgColor: 'bg-success/10', href: '/submissions' },
        { title: t('En attente', 'Pending'), value: stats.pendingSubmissions, icon: Clock, color: 'text-warning', bgColor: 'bg-warning/10', href: '/submissions' },
      ];

  const secondaryStats = isProfessor
    ? [
        { title: t('Total soumissions', 'Total submissions'), value: stats.submissions, icon: FileText, color: 'text-primary' },
        { title: t('Travaux notes', 'Graded work'), value: stats.gradedSubmissions, icon: CheckCircle, color: 'text-success' },
        { title: t('Moyenne generale', 'Average grade'), value: `${stats.averageGrade}/20`, icon: Award, color: 'text-accent' },
      ]
    : [
        { title: t('Travaux notes', 'Graded work'), value: stats.gradedSubmissions, icon: CheckCircle, color: 'text-success' },
        { title: t('Ma moyenne', 'My average'), value: `${stats.averageGrade}/20`, icon: Award, color: 'text-accent' },
        { title: t('Objectif', 'Goal'), value: '15/20', icon: Target, color: 'text-primary' },
      ];

  return (
    <DashboardLayout>
      <div className="space-y-8 page-grid">
        <div className="surface p-6 lg:p-8 animate-slide-up relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/12 via-transparent to-accent/12" />
            <div className="absolute -top-24 -right-16 w-64 h-64 bg-primary/15 blur-3xl" />
            <div className="absolute -bottom-28 -left-20 w-72 h-72 bg-accent/18 blur-3xl" />
          </div>
          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-3">
              <p className="section-title">{t('Bienvenue', 'Welcome')}</p>
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
                {t('Bonjour', 'Hello')}, {profile?.full_name?.split(' ')[0] || t('Utilisateur', 'User')}
              </h1>
              <p className="text-muted-foreground max-w-2xl">
                {isProfessor
                  ? t(
                      'Gerez vos cours, suivez les soumissions et animez vos echanges avec vos etudiants.',
                      'Manage courses, follow submissions, and guide your students in one place.'
                    )
                  : t(
                      'Retrouvez vos cours, soumettez vos travaux et restez a jour sur vos echanges.',
                      'Find your courses, submit work, and keep up with your feedback.'
                    )}
              </p>
              <div className="flex flex-wrap gap-3 pt-1">
                <Link to="/courses">
                  <Button className="gradient-primary btn-shine shadow-glow rounded-full px-5">
                    {t('Voir les cours', 'Browse courses')}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link to="/submissions">
                  <Button variant="outline" className="rounded-full px-5">
                    <FileText className="w-4 h-4 mr-2" />
                    {t('Soumissions', 'Submissions')}
                  </Button>
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full lg:w-auto lg:min-w-[260px]">
              {secondaryStats.slice(0, 2).map((stat) => (
                <div key={stat.title} className="rounded-2xl border border-border/70 bg-card/80 backdrop-blur p-4 shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{stat.title}</p>
                      <p className="text-lg font-semibold text-foreground">{loading ? '...' : stat.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="grid sm:grid-cols-3 gap-3">
          <Link to="/courses">
            <Card className="surface card-hover p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{t('Créer / voir les cours', 'Create / view courses')}</p>
                <p className="text-xs text-muted-foreground">{t('Ajouter du contenu et des ressources', 'Add content and resources')}</p>
              </div>
            </Card>
          </Link>
          <Link to="/subjects">
            <Card className="surface card-hover p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{t('Gérer les matières', 'Manage subjects')}</p>
                <p className="text-xs text-muted-foreground">{t('Couleurs, descriptions, organisation', 'Colors, descriptions, organization')}</p>
              </div>
            </Card>
          </Link>
          <Link to="/submissions">
            <Card className="surface card-hover p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{t('Noter / suivre les travaux', 'Grade / track work')}</p>
                <p className="text-xs text-muted-foreground">{t('Statuts, notes, téléchargements', 'Statuses, grades, downloads')}</p>
              </div>
            </Card>
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statsCards.map((stat, index) => (
            <Link key={stat.title} to={stat.href}>
              <Card
                className="surface card-hover stat-card animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                      <p className="text-3xl font-bold text-foreground mt-1">
                        {loading ? (
                          <span className="inline-block w-12 h-8 bg-muted animate-pulse rounded" />
                        ) : (
                          stat.value
                        )}
                      </p>
                    </div>
                    <div className={`w-14 h-14 rounded-2xl ${stat.bgColor} flex items-center justify-center shadow-sm`}>
                      <stat.icon className={`w-7 h-7 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="surface animate-slide-up" style={{ animationDelay: '400ms' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                {t('Activite (7 derniers jours)', 'Activity (last 7 days)')}
              </CardTitle>
              <CardDescription>
                {t('Evolution des soumissions cette semaine', 'Submissions trend this week')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[200px] bg-muted animate-pulse rounded-lg" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={submissionsByDay}>
                    <defs>
                      <linearGradient id="colorSubmissions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs fill-muted-foreground" />
                    <YAxis className="text-xs fill-muted-foreground" />
                    <RechartsTooltip
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
                      fillOpacity={1}
                      fill="url(#colorSubmissions)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="surface animate-slide-up" style={{ animationDelay: '500ms' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-accent" />
                {t('Distribution par statut', 'Status distribution')}
              </CardTitle>
              <CardDescription>
                {t('Repartition des soumissions par statut', 'Submissions by status')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[200px] bg-muted animate-pulse rounded-lg" />
              ) : (
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width="50%" height={200}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-3">
                    {statusData.map((status) => (
                      <div key={status.name} className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                        <span className="text-sm text-muted-foreground flex-1">{status.name}</span>
                        <span className="font-semibold text-foreground">{status.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {isProfessor && subjectStats.length > 0 && (
          <Card className="surface animate-slide-up" style={{ animationDelay: '550ms' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-primary" />
                {t('Soumissions par matiere', 'Submissions by subject')}
              </CardTitle>
              <CardDescription>
                {t('Repartition des travaux rendus par matiere', 'Breakdown of submissions by subject')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={subjectStats}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs fill-muted-foreground" />
                  <YAxis className="text-xs fill-muted-foreground" />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="submissions" radius={[8, 8, 0, 0]}>
                    {subjectStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          {secondaryStats.map((stat, index) => (
            <Card
              key={stat.title}
              className="surface animate-slide-up"
              style={{ animationDelay: `${(index + 6) * 100}ms` }}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-muted/80 flex items-center justify-center">
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold text-foreground">
                      {loading ? (
                        <span className="inline-block w-8 h-6 bg-muted animate-pulse rounded" />
                      ) : (
                        stat.value
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="surface animate-slide-up" style={{ animationDelay: '900ms' }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                {t('Cours recents', 'Recent courses')}
              </CardTitle>
              <CardDescription>
                {isProfessor ? t('Vos derniers cours ajoutes', 'Your latest courses') : t('Les derniers cours de votre professeur', 'Latest courses from your instructor')}
              </CardDescription>
            </div>
            <Link to="/courses">
              <Button variant="ghost" size="sm">
                {t('Voir tout', 'View all')}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
                ))}
              </div>
            ) : recentCourses.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <BookOpen className="w-8 h-8 text-primary" />
                </div>
                <p className="text-muted-foreground">
                  {isProfessor ? t("Vous n'avez pas encore cree de cours", 'You have not created any courses yet') : t('Aucun cours disponible', 'No courses available')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentCourses.map((course) => (
                  <Link key={course.id} to={`/courses/${course.id}`}>
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/40 hover:bg-secondary transition-all hover:-translate-x-1 group">
                      <div
                        className="w-1.5 h-14 rounded-full transition-all group-hover:h-16"
                        style={{ backgroundColor: course.subject?.color || '#3B82F6' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {course.title}
                        </p>
                        <p className="text-sm text-muted-foreground">{course.subject?.name || t('Sans matiere', 'No subject')}</p>
                      </div>
                      {course.deadline && (
                        <div className="text-right hidden sm:block">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{t('Deadline', 'Deadline')}</span>
                          </div>
                          <p className="text-sm font-medium text-foreground">
                            {format(new Date(course.deadline), 'dd MMM yyyy', { locale: dateLocale })}
                          </p>
                        </div>
                      )}
                      <ArrowRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
