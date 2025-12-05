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
import { Plus, BookOpen, Edit2, Trash2, Calendar, Loader2, Eye, FileText, Download } from 'lucide-react';
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
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
    const [coursesRes, subjectsRes] = await Promise.all([
      supabase
        .from('courses')
        .select('*, subject:subjects(*), professor:profiles(*)')
        .order('created_at', { ascending: false }),
      supabase.from('subjects').select('*').order('name'),
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
  }, [subjectFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setIsSubmitting(true);

    const courseData = {
      title: formData.title,
      description: formData.description,
      content: formData.content,
      subject_id: formData.subject_id,
      deadline: formData.deadline || null,
      file_url: formData.file_url || null,
    };

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="animate-slide-up">
            <h1 className="text-2xl font-bold text-foreground">Cours</h1>
            <p className="text-muted-foreground">
              {subjectFilter
                ? `Cours de ${subjects.find((s) => s.id === subjectFilter)?.name || 'la matière'}`
                : 'Tous les cours disponibles'}
            </p>
          </div>

          {isProfessor && (
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="gradient-primary btn-shine shadow-glow">
                  <Plus className="w-4 h-4 mr-2" />
                  Nouveau cours
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl glass-strong">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>{editingCourse ? 'Modifier le cours' : 'Créer un cours'}</DialogTitle>
                    <DialogDescription>
                      {editingCourse ? 'Modifiez les informations du cours.' : 'Ajoutez un nouveau cours à votre matière.'}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                    <div className="space-y-2">
                      <Label htmlFor="title">Titre</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Ex: Introduction aux équations"
                        required
                        className="bg-background/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">Matière</Label>
                      <Select
                        value={formData.subject_id}
                        onValueChange={(value) => setFormData({ ...formData, subject_id: value })}
                        required
                      >
                        <SelectTrigger className="bg-background/50">
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
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Brève description du cours..."
                        rows={2}
                        className="bg-background/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="content">Contenu</Label>
                      <Textarea
                        id="content"
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        placeholder="Contenu détaillé du cours..."
                        rows={6}
                        className="bg-background/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Fichier du cours (PDF, documents...)</Label>
                      <FileUpload
                        bucket="course-files"
                        folder={`courses/${session?.user?.id}`}
                        onUploadComplete={(url) => setFormData({ ...formData, file_url: url })}
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                        existingFile={formData.file_url ? 'Fichier existant' : undefined}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="deadline">Date limite (optionnel)</Label>
                      <Input
                        id="deadline"
                        type="date"
                        value={formData.deadline}
                        onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                        className="bg-background/50"
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Annuler
                    </Button>
                    <Button type="submit" disabled={isSubmitting} className="gradient-primary">
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

        {/* Courses grid */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-0 shadow-md">
                <CardContent className="p-6">
                  <div className="h-40 bg-muted animate-pulse rounded-lg" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <Card className="border-0 shadow-md glass">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <BookOpen className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Aucun cours</h3>
              <p className="text-muted-foreground text-center mt-1 max-w-sm">
                {isProfessor ? 'Créez votre premier cours pour commencer.' : 'Aucun cours disponible pour le moment.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course, index) => (
              <Card 
                key={course.id} 
                className="border-0 shadow-md card-hover group animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <Badge
                      variant="secondary"
                      className="text-xs font-medium"
                      style={{
                        backgroundColor: `${course.subject?.color}15`,
                        color: course.subject?.color,
                        borderColor: `${course.subject?.color}30`,
                      }}
                    >
                      {course.subject?.name}
                    </Badge>
                    {isProfessor && course.professor_id === profile?.id && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(course)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(course.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-lg mt-2 line-clamp-2 group-hover:text-primary transition-colors">
                    {course.title}
                  </CardTitle>
                  {course.description && (
                    <CardDescription className="line-clamp-2">{course.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {course.file_url && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileText className="w-4 h-4 text-primary" />
                        <span>Fichier joint</span>
                      </div>
                    )}
                    {course.deadline && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className={isDeadlinePassed(course.deadline) ? 'text-destructive' : 'text-muted-foreground'}>
                          {format(new Date(course.deadline), 'dd MMMM yyyy', { locale: fr })}
                        </span>
                        {isDeadlinePassed(course.deadline) && (
                          <Badge variant="destructive" className="text-xs">Expiré</Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <Link to={`/courses/${course.id}`} className="mt-4 block">
                    <Button variant="outline" size="sm" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Eye className="w-4 h-4 mr-2" />
                      Voir le cours
                    </Button>
                  </Link>
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