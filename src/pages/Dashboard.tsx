import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, FolderOpen, FileText, Users, TrendingUp, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Stats {
  subjects: number;
  courses: number;
  submissions: number;
  pendingSubmissions: number;
}

interface RecentCourse {
  id: string;
  title: string;
  deadline?: string;
  subject: { name: string; color: string } | null;
}

const Dashboard = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats>({ subjects: 0, courses: 0, submissions: 0, pendingSubmissions: 0 });
  const [recentCourses, setRecentCourses] = useState<RecentCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [subjectsRes, coursesRes, submissionsRes, pendingRes, recentRes] = await Promise.all([
        supabase.from('subjects').select('id', { count: 'exact', head: true }),
        supabase.from('courses').select('id', { count: 'exact', head: true }),
        supabase.from('submissions').select('id', { count: 'exact', head: true }),
        supabase.from('submissions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase
          .from('courses')
          .select('id, title, deadline, subject:subjects(name, color)')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      setStats({
        subjects: subjectsRes.count || 0,
        courses: coursesRes.count || 0,
        submissions: submissionsRes.count || 0,
        pendingSubmissions: pendingRes.count || 0,
      });

      if (recentRes.data) {
        setRecentCourses(recentRes.data as RecentCourse[]);
      }

      setLoading(false);
    };

    fetchStats();
  }, []);

  const statsCards = [
    {
      title: 'Matières',
      value: stats.subjects,
      icon: FolderOpen,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Cours',
      value: stats.courses,
      icon: BookOpen,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      title: 'Soumissions',
      value: stats.submissions,
      icon: FileText,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'En attente',
      value: stats.pendingSubmissions,
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome section */}
        <div className="gradient-hero rounded-2xl p-6 lg:p-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            Bonjour, {profile?.full_name?.split(' ')[0] || 'Utilisateur'} 👋
          </h1>
          <p className="text-muted-foreground mt-2">
            Bienvenue sur votre tableau de bord. Voici un aperçu de vos activités.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statsCards.map((stat) => (
            <Card key={stat.title} className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold text-foreground mt-1">
                      {loading ? '...' : stat.value}
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent courses */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Cours récents
            </CardTitle>
            <CardDescription>Les derniers cours ajoutés à la plateforme</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : recentCourses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucun cours disponible</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentCourses.map((course) => (
                  <div
                    key={course.id}
                    className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <div
                      className="w-3 h-12 rounded-full"
                      style={{ backgroundColor: course.subject?.color || '#3B82F6' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{course.title}</p>
                      <p className="text-sm text-muted-foreground">{course.subject?.name || 'Sans matière'}</p>
                    </div>
                    {course.deadline && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Deadline</p>
                        <p className="text-sm font-medium text-foreground">
                          {format(new Date(course.deadline), 'dd MMM yyyy', { locale: fr })}
                        </p>
                      </div>
                    )}
                  </div>
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
