import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Subject } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { Plus, FolderOpen, Edit2, Trash2, BookOpen, Loader2, Palette, User } from 'lucide-react';
import { Link } from 'react-router-dom';

const COLORS = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444', '#F97316',
  '#EAB308', '#22C55E', '#14B8A6', '#06B6D4', '#6366F1',
];

const Subjects = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: COLORS[0],
  });

  const isProfessor = profile?.role === 'professor' || profile?.role === 'admin';

  const fetchSubjects = async () => {
    if (!profile) return;

    let professorId = profile.id;

    if (!isProfessor) {
      // Get student's professor
      const { data: assignment } = await supabase
        .from('professor_students')
        .select('professor_id')
        .eq('student_id', profile.id)
        .maybeSingle();

      if (assignment) {
        professorId = assignment.professor_id;
      } else {
        setSubjects([]);
        setLoading(false);
        return;
      }
    }

    const { data } = await supabase
      .from('subjects')
      .select('*, professor:profiles(*)')
      .eq('professor_id', professorId)
      .order('created_at', { ascending: false });

    if (data) {
      setSubjects(data as Subject[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSubjects();
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setIsSubmitting(true);

    if (editingSubject) {
      const { error } = await supabase
        .from('subjects')
        .update({
          name: formData.name,
          description: formData.description,
          color: formData.color,
        })
        .eq('id', editingSubject.id);

      if (error) {
        toast({ variant: 'destructive', title: 'Erreur', description: error.message });
      } else {
        toast({ title: 'Matière modifiée', description: 'La matière a été mise à jour.' });
        fetchSubjects();
        resetForm();
      }
    } else {
      const { error } = await supabase.from('subjects').insert({
        name: formData.name,
        description: formData.description,
        color: formData.color,
        professor_id: profile.id,
      });

      if (error) {
        toast({ variant: 'destructive', title: 'Erreur', description: error.message });
      } else {
        toast({ title: 'Matière créée', description: 'La nouvelle matière a été ajoutée.' });
        fetchSubjects();
        resetForm();
      }
    }

    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('subjects').delete().eq('id', id);

    if (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: error.message });
    } else {
      toast({ title: 'Matière supprimée', description: 'La matière a été supprimée.' });
      fetchSubjects();
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', color: COLORS[0] });
    setEditingSubject(null);
    setDialogOpen(false);
  };

  const openEditDialog = (subject: Subject) => {
    setEditingSubject(subject);
    setFormData({
      name: subject.name,
      description: subject.description || '',
      color: subject.color,
    });
    setDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="animate-slide-up">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
                <FolderOpen className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Matières</h1>
                <p className="text-muted-foreground">
                  {isProfessor ? 'Gérez vos matières' : 'Matières de votre professeur'}
                </p>
              </div>
            </div>
          </div>

          {isProfessor && (
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="gradient-primary btn-shine shadow-glow rounded-xl h-12 px-6">
                  <Plus className="w-5 h-5 mr-2" />
                  Nouvelle matière
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle className="text-xl">{editingSubject ? 'Modifier la matière' : 'Créer une matière'}</DialogTitle>
                    <DialogDescription>
                      {editingSubject ? 'Modifiez les informations de la matière.' : 'Ajoutez une nouvelle matière à vos cours.'}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="font-medium">Nom</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ex: Mathématiques"
                        required
                        className="h-12 rounded-xl"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className="font-medium">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Description de la matière..."
                        rows={3}
                        className="rounded-xl resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="font-medium flex items-center gap-2">
                        <Palette className="w-4 h-4" />
                        Couleur
                      </Label>
                      <div className="flex gap-2 flex-wrap">
                        {COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`w-10 h-10 rounded-xl transition-all ${
                              formData.color === color ? 'ring-2 ring-offset-2 ring-primary scale-110 shadow-lg' : 'hover:scale-105'
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => setFormData({ ...formData, color })}
                          />
                        ))}
                      </div>
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
                          {editingSubject ? 'Modification...' : 'Création...'}
                        </>
                      ) : (
                        editingSubject ? 'Modifier' : 'Créer'
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Subjects grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Chargement des matières...</p>
          </div>
        ) : subjects.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="flex flex-col items-center justify-center py-20">
              <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center mb-6">
                <FolderOpen className="w-12 h-12 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Aucune matière</h3>
              <p className="text-muted-foreground text-center max-w-md">
                {isProfessor 
                  ? 'Créez votre première matière pour organiser vos cours.' 
                  : "Votre professeur n'a pas encore créé de matières."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {subjects.map((subject, index) => (
              <Card 
                key={subject.id} 
                className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 group animate-slide-up overflow-hidden"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Colored header */}
                <div 
                  className="h-24 relative overflow-hidden"
                  style={{ backgroundColor: subject.color }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
                  <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full" />
                  <div className="absolute top-4 left-4">
                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                      <FolderOpen className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  
                  {isProfessor && subject.professor_id === profile?.id && (
                    <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 rounded-lg bg-white/20 hover:bg-white/30 text-white border-0"
                        onClick={() => openEditDialog(subject)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 rounded-lg bg-white/20 hover:bg-destructive text-white border-0"
                        onClick={() => handleDelete(subject.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <CardHeader className="pb-3">
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">
                    {subject.name}
                  </CardTitle>
                  {subject.description && (
                    <CardDescription className="line-clamp-2">{subject.description}</CardDescription>
                  )}
                </CardHeader>
                
                <CardContent>
                  {subject.professor && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-3 h-3 text-primary" />
                      </div>
                      <span>{subject.professor.full_name}</span>
                    </div>
                  )}
                  
                  <Link to={`/courses?subject=${subject.id}`}>
                    <Button variant="outline" className="w-full rounded-xl group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <BookOpen className="w-4 h-4 mr-2" />
                      Voir les cours
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

export default Subjects;
