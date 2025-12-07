import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/database';
import { Users, Mail, Loader2, GraduationCap, Calendar, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const Students = () => {
  const { profile } = useAuth();
  const [students, setStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const isProfessor = profile?.role === 'professor' || profile?.role === 'admin';

  useEffect(() => {
    fetchStudents();
  }, [profile]);

  const fetchStudents = async () => {
    if (!profile) return;

    if (isProfessor) {
      // Professors only see their own students
      const { data: professorStudents } = await supabase
        .from('professor_students')
        .select('student_id')
        .eq('professor_id', profile.id);

      const studentIds = professorStudents?.map((ps) => ps.student_id) || [];

      if (studentIds.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .in('id', studentIds)
          .order('full_name');

        setStudents((data as Profile[]) || []);
      } else {
        setStudents([]);
      }
    } else {
      // Students see classmates (students with same professor)
      const { data: myProfessor } = await supabase
        .from('professor_students')
        .select('professor_id')
        .eq('student_id', profile.id)
        .maybeSingle();

      if (myProfessor) {
        const { data: classmateIds } = await supabase
          .from('professor_students')
          .select('student_id')
          .eq('professor_id', myProfessor.professor_id);

        const studentIds = classmateIds?.map((c) => c.student_id) || [];

        if (studentIds.length > 0) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .in('id', studentIds)
            .order('full_name');

          setStudents((data as Profile[]) || []);
        }
      } else {
        setStudents([]);
      }
    }

    setLoading(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="animate-slide-up">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
              <Users className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {isProfessor ? 'Mes Étudiants' : 'Mes Camarades'}
              </h1>
              <p className="text-muted-foreground">
                {isProfessor
                  ? `${students.length} étudiant${students.length > 1 ? 's' : ''} inscrit${students.length > 1 ? 's' : ''} dans vos cours`
                  : 'Étudiants de votre classe'}
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        {isProfessor && students.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/10 to-primary/5">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{students.length}</p>
                  <p className="text-sm text-muted-foreground">Étudiants actifs</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg bg-gradient-to-br from-success/10 to-success/5">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">100%</p>
                  <p className="text-sm text-muted-foreground">Taux de participation</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg bg-gradient-to-br from-accent/10 to-accent/5">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {students.length > 0 
                      ? format(new Date(students[students.length - 1].created_at), 'dd MMM', { locale: fr })
                      : '-'
                    }
                  </p>
                  <p className="text-sm text-muted-foreground">Dernière inscription</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Students grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Chargement des étudiants...</p>
          </div>
        ) : students.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="flex flex-col items-center justify-center py-20">
              <div className="w-24 h-24 rounded-3xl bg-muted/50 flex items-center justify-center mb-6">
                <Users className="w-12 h-12 text-muted-foreground/50" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Aucun étudiant</h3>
              <p className="text-muted-foreground text-center max-w-md">
                {isProfessor
                  ? "Aucun étudiant n'est encore inscrit à vos cours. Les étudiants peuvent vous sélectionner lors de leur inscription."
                  : "Vous n'êtes pas encore assigné à un professeur."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {students.map((student, index) => (
              <Card
                key={student.id}
                className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 group animate-slide-up overflow-hidden"
                style={{ animationDelay: `${(index + 1) * 50}ms` }}
              >
                <CardContent className="p-0">
                  {/* Gradient header */}
                  <div className="h-20 gradient-primary relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-foreground/10 to-transparent" />
                    <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-primary-foreground/10 rounded-full" />
                  </div>
                  
                  {/* Avatar */}
                  <div className="px-6 -mt-10 relative z-10">
                    <Avatar className="h-20 w-20 border-4 border-card shadow-lg">
                      <AvatarImage src={student.avatar_url} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
                        {getInitials(student.full_name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  {/* Content */}
                  <div className="p-6 pt-4">
                    <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                      {student.full_name}
                    </h3>
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{student.email}</span>
                    </div>
                    
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-0 font-medium">
                        <GraduationCap className="w-3 h-3 mr-1" />
                        Étudiant
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(student.created_at), 'dd MMM yyyy', { locale: fr })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Students;
