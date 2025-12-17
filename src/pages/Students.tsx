import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/database';
import { Users, Mail, Loader2, GraduationCap, Calendar, UserCheck, Search } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const Students = () => {
  const { profile } = useAuth();
  const [students, setStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');

  const isProfessor = profile?.role === 'professor' || profile?.role === 'admin';

  useEffect(() => {
    fetchStudents();
  }, [profile]);

  const fetchStudents = async () => {
    if (!profile) return;

    if (isProfessor) {
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

  const classOptions = useMemo(
    () =>
      Array.from(
        new Set(
          students
            .map((s) => s.class_name)
            .filter((c): c is string => Boolean(c))
        )
      ),
    [students]
  );

  const filteredStudents = students
    .filter((student) => (classFilter === 'all' ? true : student.class_name === classFilter))
    .filter((student) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        student.full_name?.toLowerCase().includes(query) ||
        student.email?.toLowerCase().includes(query) ||
        student.class_name?.toLowerCase().includes(query)
      );
    });

  return (
    <DashboardLayout>
      <div className="space-y-8">
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

        <div className="sticky top-4 z-20 bg-background/80 backdrop-blur-md p-3 rounded-2xl border border-border/60 shadow-sm space-y-3">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" aria-hidden="true" />
            <Label htmlFor="student-search" className="sr-only">Rechercher un étudiant</Label>
            <Input
              id="student-search"
              placeholder="Rechercher par nom, email ou classe..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 rounded-xl border-border/50 bg-muted/30 focus:bg-background"
            />
          </div>
          {classOptions.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <Button
                variant={classFilter === 'all' ? 'secondary' : 'outline'}
                size="sm"
                className="rounded-full px-4"
                onClick={() => setClassFilter('all')}
              >
                Toutes les classes
              </Button>
              {classOptions.map((className) => (
                <Button
                  key={className}
                  variant={classFilter === className ? 'secondary' : 'outline'}
                  size="sm"
                  className="rounded-full px-4"
                  onClick={() => setClassFilter(className)}
                >
                  {className}
                </Button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Chargement des étudiants...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="flex flex-col items-center justify-center py-20 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/10 to-transparent opacity-70" />
              <div className="relative w-24 h-24 rounded-3xl bg-muted/50 flex items-center justify-center mb-6 shadow-glow">
                <Users className="w-12 h-12 text-muted-foreground/50" />
              </div>
              <h3 className="relative text-xl font-semibold text-foreground mb-2">
                {students.length === 0 ? 'Aucun étudiant' : 'Aucun résultat'}
              </h3>
              <p className="relative text-muted-foreground text-center max-w-md">
                {students.length === 0
                  ? isProfessor
                    ? "Aucun étudiant n'est encore inscrit à vos cours. Ils peuvent vous sélectionner lors de leur inscription."
                    : "Vous n'êtes pas encore assigné à un professeur."
                  : 'Aucun étudiant ne correspond à votre recherche/filtre.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredStudents.map((student, index) => (
              <Card
                key={student.id}
                className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 group animate-slide-up overflow-hidden"
                style={{ animationDelay: `${(index + 1) * 50}ms` }}
              >
                <CardContent className="p-0">
                  <div className="h-20 gradient-primary relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-foreground/10 to-transparent" />
                    <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-primary-foreground/10 rounded-full" />
                  </div>

                  <div className="px-6 -mt-10 relative z-10">
                    <Avatar className="h-20 w-20 border-4 border-card shadow-lg">
                      <AvatarImage src={student.avatar_url} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
                        {getInitials(student.full_name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  <div className="p-6 pt-4">
                    <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                      {student.full_name}
                    </h3>
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{student.email}</span>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-0 font-medium">
                          <GraduationCap className="w-3 h-3 mr-1" />
                          Étudiant
                        </Badge>
                        {student.class_name && (
                          <Badge variant="outline" className="font-medium">
                            {student.class_name}
                          </Badge>
                        )}
                      </div>
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
