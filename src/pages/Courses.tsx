import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Course, Subject } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import FileUpload from '@/components/FileUpload';
import { Plus, BookOpen, Edit2, Trash2, Calendar, Loader2, Eye, FileText, Download, Clock, User, Search } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const Courses = () => {
  const { profile, session } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const subjectFilter = searchParams.get('subject');

  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubject, setActiveSubject] = useState<string>(subjectFilter || 'all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    subject_id: '',
    deadline: '',
    file_url: '',
  });

  const isProfessor = profile?.role === 'professor' || profile?.role === 'admin';

  const fetchData = async () => {
    if (!profile) return;

    let professorId = profile.id;

    if (!isProfessor) {
      const { data: assignment } = await supabase
        .from('professor_students')
        .select('professor_id')
        .eq('student_id', profile.id)
        .maybeSingle();

      if (assignment) {
        professorId = assignment.professor_id;
      } else {
        setCourses([]);
        setSubjects([]);
        setLoading(false);
        return;
      }
    }

    const [coursesRes, subjectsRes] = await Promise.all([
      supabase
        .from('courses')
        .select('*, subject:subjects(*), professor:profiles(*)')
        .eq('professor_id', professorId)
        .order('created_at', { ascending: false }),
      supabase
        .from('subjects')
        .select('*')
        .eq('professor_id', professorId)
        .order('name'),
    ]);

    if (coursesRes.data) {
      let filteredCourses = coursesRes.data as Course[];
      if (subjectFilter) {
        filteredCourses = filteredCourses.filter((c) => c.subject_id === subjectFilter);
      }
      setCourses(filteredCourses);
    }

    if (subjectsRes.data) {
      setSubjects(subjectsRes.data as Subject[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    setActiveSubject(subjectFilter || 'all');
  }, [profile, subjectFilter]);

  const sendNewCourseNotification = async (courseTitle: string, subjectName: string, professorName: string) => {
    if (!profile) return;

    const { data: professorStudents } = await supabase
      .from('professor_students')
      .select('student_id')
      .eq('professor_id', profile.id);

    if (!professorStudents || professorStudents.length === 0) {
      return;
    }

    const studentIds = professorStudents.map((ps) => ps.student_id);

    const { data: students } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', studentIds);

    if (students && students.length > 0) {
      for (const student of students) {
        await supabase.from('notifications').insert({
          user_id: student.id,
          title: 'Nouveau cours disponible',
          message: `${professorName} a ajouté un nouveau cours: "${courseTitle}" en ${subjectName}`,
          type: 'course',
          data: { courseTitle, subjectName, professorName },
        });

        try {
          await supabase.functions.invoke('send-notification', {
            body: {
              to: student.email,
              toName: student.full_name,
              type: 'new_course',
              data: {
                courseName: courseTitle,
                subjectName,
                professorName,
              },
            },
          });
        } catch (e) {
          console.log('Email notification skipped');
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!formData.subject_id) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez sélectionner une matière' });
      return;
    }

    setIsSubmitting(true);

    const courseData = {
      title: formData.title,
      description: formData.description,
      content: formData.content,
      subject_id: formData.subject_id,
      deadline: formData.deadline || null,
      file_url: formData.file_url || null,
    };

    const selectedSubject = subjects.find((s) => s.id === formData.subject_id);

    if (editingCourse) {
      const { error } = await supabase
        .from('courses')
        .update(courseData)
        .eq('id', editingCourse.id);

      if (error) {
        toast({ variant: 'destructive', title: 'Erreur', description: error.message });
      } else {
        toast({ title: 'Cours modifié', description: 'Le cours a été mis à jour.' });
        fetchData();
        resetForm();
      }
    } else {
      const { error } = await supabase.from('courses').insert({
        ...courseData,
        professor_id: profile.id,
      });

      if (error) {
        toast({ variant: 'destructive', title: 'Erreur', description: error.message });
      } else {
        toast({ title: 'Cours créé', description: 'Le nouveau cours a été ajouté.' });

        await sendNewCourseNotification(formData.title, selectedSubject?.name || '', profile.full_name);

        fetchData();
        resetForm();
      }
    }

    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('courses').delete().eq('id', id);

    if (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: error.message });
    } else {
      toast({ title: 'Cours supprimé', description: 'Le cours a été supprimé.' });
      fetchData();
    }
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', content: '', subject_id: '', deadline: '', file_url: '' });
    setEditingCourse(null);
    setDialogOpen(false);
  };

  const openEditDialog = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      title: course.title,
      description: course.description || '',
      content: course.content || '',
      subject_id: course.subject_id,
      deadline: course.deadline ? course.deadline.split('T')[0] : '',
      file_url: course.file_url || '',
    });
    setDialogOpen(true);
  };

  const isDeadlinePassed = (deadline?: string) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };

  const filteredCourses = courses
    .filter((course) => (activeSubject === 'all' ? true : course.subject_id === activeSubject))
    .filter((course) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();

      return [
        course.title || '',
        course.description || '',
        course.subject?.name || '',
        course.professor?.full_name || '',
      ].some((field) => field.toLowerCase().includes(query));
    });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="animate-slide-up">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
                <BookOpen className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Cours</h1>
                <p className="text-muted-foreground">
                  {subjectFilter
                    ? `Cours de ${subjects.find((s) => s.id === subjectFilter)?.name || 'la matière'}`
                    : isProfessor
                      ? 'Vos cours'
                      : 'Cours de votre professeur'}
                </p>
              </div>
            </div>
          </div>

          {isProfessor && (
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="gradient-primary btn-shine shadow-glow rounded-xl h-12 px-6">
                  <Plus className="w-5 h-5 mr-2" />
                  Nouveau cours
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle className="text-xl">{editingCourse ? 'Modifier le cours' : 'Créer un cours'}</DialogTitle>
                    <DialogDescription>
                      {editingCourse ? 'Modifiez les informations du cours.' : 'Ajoutez un nouveau cours. Vos étudiants seront notifiés.'}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="font-medium">Titre</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Ex: Introduction aux équations"
                        required
                        className="h-12 rounded-xl"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject" className="font-medium">Matière</Label>
                      <Select
                        value={formData.subject_id}
                        onValueChange={(value) => setFormData({ ...formData, subject_id: value })}
                        required
                      >
                        <SelectTrigger className="h-12 rounded-xl">
                          <SelectValue placeholder="Sélectionnez une matière" />
                        </SelectTrigger>
                        <SelectContent>
                          {subjects.map((subject) => (
                            <SelectItem key={subject.id} value={subject.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: subject.color }}
                                />
                                {subject.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {subjects.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          Créez d&apos;abord une matière dans la section Matières
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className="font-medium">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Brève description du cours..."
                        rows={2}
                        className="rounded-xl resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="content" className="font-medium">Contenu</Label>
                      <Textarea
                        id="content"
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        placeholder="Contenu détaillé du cours..."
                        rows={6}
                        className="rounded-xl resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="font-medium">Fichier du cours (PDF, documents...)</Label>
                      <FileUpload
                        bucket="course-files"
                        folder={`courses/${session?.user?.id}`}
                        onUploadComplete={(url) => setFormData({ ...formData, file_url: url })}
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                        existingFile={formData.file_url ? 'Fichier existant' : undefined}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="deadline" className="font-medium">Date limite (optionnel)</Label>
                      <Input
                        id="deadline"
                        type="date"
                        value={formData.deadline}
                        onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                        className="h-12 rounded-xl"
                      />
                    </div>
                  </div>

                  <DialogFooter className="gap-2">
                    <Button type="button" variant="outline" onClick={resetForm} className="rounded-xl">
                      Annuler
                    </Button>
                    <Button type="submit" disabled={isSubmitting} className="gradient-primary rounded-xl">
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {editingCourse ? 'Modification...' : 'Création...'}
                        </>
                      ) : (
                        editingCourse ? 'Modifier' : 'Créer'
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="sticky top-4 z-20 space-y-3">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Rechercher un cours..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 rounded-xl border-border/50 bg-muted/30 focus:bg-background"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Button
              variant={activeSubject === 'all' ? 'secondary' : 'outline'}
              size="sm"
              className="rounded-full px-4"
              onClick={() => setActiveSubject('all')}
            >
              Toutes
            </Button>
            {subjects.map((subject) => (
              <Button
                key={subject.id}
                variant={activeSubject === subject.id ? 'secondary' : 'outline'}
                size="sm"
                className="rounded-full px-4 flex items-center gap-2 border-0 shadow-sm"
                style={{
                  background: activeSubject === subject.id ? `${subject.color}22` : 'transparent',
                }}
                onClick={() => setActiveSubject(subject.id)}
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: subject.color }}
                />
                {subject.name}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Chargement des cours...</p>
          </div>
        ) : courses.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="flex flex-col items-center justify-center py-20 relative overflow-hidden">
              <div className="absolute inset-0 opacity-60 bg-gradient-to-br from-primary/10 via-accent/10 to-transparent" />
              <div className="relative w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center mb-6 shadow-glow">
                <BookOpen className="w-12 h-12 text-primary" />
              </div>
              <h3 className="relative text-xl font-semibold text-foreground mb-2">Aucun cours</h3>
              <p className="relative text-muted-foreground text-center max-w-md">
                {isProfessor
                  ? 'Créez votre premier cours pour commencer à enseigner.'
                  : "Votre professeur n'a pas encore publié de cours."}
              </p>
              {isProfessor && subjects.length === 0 && (
                <Link to="/subjects" className="relative">
                  <Button variant="outline" className="mt-4 rounded-xl">
                    Créer une matière d'abord
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : filteredCourses.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 rounded-2xl bg-muted/40 flex items-center justify-center mb-4">
                <Search className="w-10 h-10 text-muted-foreground/70" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Aucun résultat</h3>
              <p className="text-muted-foreground text-center mt-1 max-w-sm">
                Aucun cours ne correspond à votre recherche.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredCourses.map((course, index) => (
              <Card
                key={course.id}
                className="border-0 shadow-lg card-hover group animate-slide-up overflow-hidden"
                style={{
                  animationDelay: `${index * 50}ms`,
                  background: course.subject?.color
                    ? `linear-gradient(145deg, ${course.subject.color}10 0%, ${course.subject.color}05 100%)`
                    : undefined,
                }}
              >
                <div
                  className="h-3 w-full"
                  style={{ backgroundColor: course.subject?.color || 'hsl(var(--primary))' }}
                />

                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <Badge
                      variant="secondary"
                      className="text-xs font-semibold px-3 py-1"
                      style={{
                        backgroundColor: `${course.subject?.color || 'hsl(var(--primary))'}15`,
                        color: course.subject?.color || 'hsl(var(--primary))',
                        borderColor: `${course.subject?.color || 'hsl(var(--primary))'}30`,
                      }}
                    >
                      {course.subject?.name}
                    </Badge>
                    {isProfessor && course.professor_id === profile?.id && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => openEditDialog(course)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(course.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-lg mt-3 line-clamp-2 group-hover:text-primary transition-colors">
                    {course.title}
                  </CardTitle>
                  {course.description && (
                    <CardDescription className="line-clamp-2 mt-1">{course.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {course.professor && (
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                          <User className="w-4 h-4 text-accent" />
                        </div>
                        <span className="text-muted-foreground">{course.professor.full_name}</span>
                      </div>
                    )}

                    {course.file_url && (
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-muted-foreground">Fichier joint</span>
                      </div>
                    )}

                    {course.deadline && (
                      <div className="flex items-center gap-2 text-sm">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            isDeadlinePassed(course.deadline) ? 'bg-destructive/10' : 'bg-warning/10'
                          }`}
                        >
                          <Clock
                            className={`w-4 h-4 ${
                              isDeadlinePassed(course.deadline) ? 'text-destructive' : 'text-warning'
                            }`}
                          />
                        </div>
                        <span className={isDeadlinePassed(course.deadline) ? 'text-destructive' : 'text-muted-foreground'}>
                          {format(new Date(course.deadline), 'dd MMMM yyyy', { locale: fr })}
                        </span>
                        {isDeadlinePassed(course.deadline) && (
                          <Badge variant="destructive" className="text-xs">Expiré</Badge>
                        )}
                      </div>
                    )}

                    <div className="pt-3 mt-3 border-t border-border/50">
                      <Link to={`/courses/${course.id}`}>
                        <Button variant="outline" className="w-full rounded-xl group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          <Eye className="w-4 h-4 mr-2" />
                          Voir le détail
                        </Button>
                      </Link>
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

export default Courses;
