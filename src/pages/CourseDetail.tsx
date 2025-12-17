import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { Course, Comment, Submission } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import FileUpload from '@/components/FileUpload';
import {
  ArrowLeft,
  Calendar,
  User,
  MessageSquare,
  Send,
  FileText,
  CheckCircle,
  Clock,
  Loader2,
  Download,
  Paperclip,
} from 'lucide-react';
import { format, addDays, differenceInCalendarDays } from 'date-fns';
import { fr } from 'date-fns/locale';

const CourseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, session } = useAuth();
  const { toast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submissionContent, setSubmissionContent] = useState('');
  const [submissionFileUrl, setSubmissionFileUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isStudent = profile?.role === 'student';
  const deadlineDate = course?.deadline ? new Date(course.deadline) : null;
  const submittedAt = submission?.submitted_at
    ? new Date(submission.submitted_at)
    : submission?.created_at
      ? new Date(submission.created_at)
      : null;
  const submissionLate = deadlineDate && submittedAt ? submittedAt > deadlineDate : false;

  const fetchData = async () => {
    if (!id) return;

    const [courseRes, commentsRes] = await Promise.all([
      supabase
        .from('courses')
        .select('*, subject:subjects(*), professor:profiles(*)')
        .eq('id', id)
        .maybeSingle(),
      supabase
        .from('comments')
        .select('*, user:profiles(*)')
        .eq('course_id', id)
        .order('created_at', { ascending: true }),
    ]);

    if (courseRes.data) {
      setCourse(courseRes.data as Course);
    }

    if (commentsRes.data) {
      setComments(commentsRes.data as Comment[]);
    }

    // Fetch student submission if applicable
    if (profile && isStudent) {
      const { data: submissionData } = await supabase
        .from('submissions')
        .select('*')
        .eq('course_id', id)
        .eq('student_id', profile.id)
        .maybeSingle();

      if (submissionData) {
        setSubmission(submissionData as Submission);
        setSubmissionContent(submissionData.content || '');
        setSubmissionFileUrl(submissionData.file_url || '');
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [id, profile]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newComment.trim()) return;

    setIsSubmitting(true);

    const { error } = await supabase.from('comments').insert({
      course_id: id,
      user_id: profile.id,
      content: newComment.trim(),
    });

    if (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: error.message });
    } else {
      setNewComment('');
      fetchData();
    }

    setIsSubmitting(false);
  };

  const handleSubmission = async () => {
    if (!profile || (!submissionContent.trim() && !submissionFileUrl)) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez ajouter du contenu ou un fichier.' });
      return;
    }

    setIsSubmitting(true);

    const submissionData = {
      content: submissionContent,
      file_url: submissionFileUrl || null,
      status: 'submitted' as const,
      submitted_at: new Date().toISOString(),
    };

    if (submission) {
      const { error } = await supabase
        .from('submissions')
        .update(submissionData)
        .eq('id', submission.id);

      if (error) {
        toast({ variant: 'destructive', title: 'Erreur', description: error.message });
      } else {
        toast({ title: 'Travail mis à jour', description: 'Votre travail a été soumis.' });
        fetchData();
      }
    } else {
      const { error } = await supabase.from('submissions').insert({
        course_id: id,
        student_id: profile.id,
        ...submissionData,
      });

      if (error) {
        toast({ variant: 'destructive', title: 'Erreur', description: error.message });
      } else {
        toast({ title: 'Travail soumis', description: 'Votre travail a été soumis avec succès.' });
        fetchData();
      }
    }

    setIsSubmitting(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const timeline = (() => {
    const steps = [];
    const deadline = course?.deadline ? new Date(course.deadline) : null;
    const today = new Date();

    steps.push({
      label: 'Brief & ressources',
      dateLabel: format(today, 'dd MMM', { locale: fr }),
      status: 'done' as const,
      color: 'text-success',
    });

    if (deadline) {
      const reviewDate = addDays(deadline, -2);
      steps.push({
        label: 'Rappel aux étudiants',
        dateLabel: format(reviewDate, 'dd MMM', { locale: fr }),
        status: differenceInCalendarDays(reviewDate, today) < 0 ? 'done' : 'todo',
        color: 'text-warning',
      });
      steps.push({
        label: 'Deadline',
        dateLabel: format(deadline, 'dd MMM', { locale: fr }),
        status: deadline < today ? 'done' : 'todo',
        color: deadline < today ? 'text-destructive' : 'text-primary',
      });
      steps.push({
        label: 'Correction & feedback',
        dateLabel: deadline < today ? format(addDays(deadline, 2), 'dd MMM', { locale: fr }) : 'À venir',
        status: deadline < today ? 'in-progress' : 'todo',
        color: 'text-accent',
      });
    } else {
      steps.push({
        label: 'Planifier une deadline',
        dateLabel: 'À définir',
        status: 'todo' as const,
        color: 'text-muted-foreground',
      });
    }

    return steps;
  })();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!course) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-foreground">Cours non trouvé</h2>
          <Button variant="link" onClick={() => navigate('/courses')}>
            Retourner aux cours
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Back button */}
        <Button variant="ghost" onClick={() => navigate('/courses')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux cours
        </Button>

        {/* Course header */}
        <Card className="border-0 shadow-md glass animate-slide-up overflow-hidden">
          <div className="h-2" style={{ background: `linear-gradient(90deg, ${course.subject?.color || '#3B82F6'}, ${course.subject?.color || '#3B82F6'}80)` }} />
          <CardHeader>
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md"
                style={{ backgroundColor: `${course.subject?.color}20` }}
              >
                <FileText className="w-7 h-7" style={{ color: course.subject?.color }} />
              </div>
              <div className="flex-1">
                <Badge
                  variant="secondary"
                  className="mb-2"
                  style={{
                    backgroundColor: `${course.subject?.color}15`,
                    color: course.subject?.color,
                  }}
                >
                  {course.subject?.name}
                </Badge>
                <CardTitle className="text-2xl">{course.title}</CardTitle>
                {course.description && (
                  <CardDescription className="mt-2">{course.description}</CardDescription>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
              {course.professor && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>{course.professor.full_name}</span>
                </div>
              )}
              {course.deadline && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{format(new Date(course.deadline), 'dd MMMM yyyy', { locale: fr })}</span>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl border border-border/60 bg-card/70 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Échéance</p>
                  <p className="text-sm font-semibold text-foreground">
                    {course.deadline
                      ? format(new Date(course.deadline), 'dd MMM yyyy', { locale: fr })
                      : 'Aucune'}
                  </p>
                </div>
              </div>
              <div className="p-3 rounded-xl border border-border/60 bg-card/70 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Ressources</p>
                  <p className="text-sm font-semibold text-foreground">
                    {course.file_url ? '1 pièce jointe' : 'Aucune'}
                  </p>
                </div>
              </div>
              <div className="p-3 rounded-xl border border-border/60 bg-card/70 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Progression</p>
                  <p className="text-sm font-semibold text-foreground">En cours</p>
                </div>
              </div>
            </div>

            {course.file_url && (
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Paperclip className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Fichier du cours</p>
                      <p className="text-sm text-muted-foreground">Document PDF ou autre</p>
                    </div>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <a href={course.file_url} target="_blank" rel="noopener noreferrer">
                      <Download className="w-4 h-4 mr-2" />
                      Télécharger
                    </a>
                  </Button>
                </div>
              </div>
            )}

            {course.content && (
              <>
                <Separator />
                <div className="prose prose-sm max-w-none">
                  <h3 className="text-lg font-semibold mb-3">Contenu du cours</h3>
                  <div className="whitespace-pre-wrap text-muted-foreground leading-relaxed">{course.content}</div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Student submission */}
        {isStudent && (
          <Card className="border-0 shadow-md glass animate-slide-up" style={{ animationDelay: '100ms' }}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Soumission de travail
                  </CardTitle>
                  <CardDescription>
                    Soumettez votre travail pour ce cours
                  </CardDescription>
                </div>
                {submission?.status && (
                  <Badge
                    className={
                      submission.status === 'graded'
                        ? 'bg-success/10 text-success border-success/20'
                        : submission.status === 'submitted'
                          ? 'bg-warning/10 text-warning border-warning/20'
                          : submissionLate
                            ? 'bg-destructive/10 text-destructive border-destructive/30'
                            : 'bg-accent/10 text-accent border-accent/30'
                    }
                  >
                    {submission.status === 'graded'
                      ? 'Corrigé'
                      : submission.status === 'submitted'
                        ? submissionLate
                          ? 'Soumis en retard'
                          : 'Soumis - en attente'
                        : submissionLate
                          ? 'En retard'
                          : 'À rendre'}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {submission?.status === 'graded' && (
                <div className="p-4 rounded-xl bg-success/10 border border-success/20">
                  <div className="flex items-center gap-2 text-success font-semibold">
                    <CheckCircle className="w-5 h-5" />
                    Travail noté: {submission.grade}/20
                  </div>
                  {submission.feedback && (
                    <p className="mt-2 text-sm text-muted-foreground">{submission.feedback}</p>
                  )}
                </div>
              )}

              {submission?.status === 'submitted' && !submission.grade && (
                <div className="p-4 rounded-xl bg-warning/10 border border-warning/20">
                  <div className="flex items-center gap-2 text-warning font-semibold">
                    <Clock className="w-5 h-5" />
                    En attente de correction
                  </div>
                </div>
              )}

              <Textarea
                placeholder="Rédigez votre travail ici..."
                value={submissionContent}
                onChange={(e) => setSubmissionContent(e.target.value)}
                rows={6}
                disabled={submission?.status === 'graded'}
                className="bg-background/50"
              />

              {submission?.status !== 'graded' && (
                <>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Fichier (optionnel)</p>
                    <FileUpload
                      bucket="submission-files"
                      folder={`${session?.user?.id}/${id}`}
                      onUploadComplete={(url) => setSubmissionFileUrl(url)}
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.rar"
                      existingFile={submissionFileUrl ? 'Fichier existant' : undefined}
                    />
                  </div>

                  <Button
                    onClick={handleSubmission}
                    disabled={isSubmitting || (!submissionContent.trim() && !submissionFileUrl)}
                    className="gradient-primary btn-shine"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Envoi...
                      </>
                    ) : submission ? (
                      'Mettre à jour'
                    ) : (
                      'Soumettre'
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Comments section */}
        <Card className="border-0 shadow-md glass animate-slide-up" style={{ animationDelay: '200ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Commentaires ({comments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Comments list */}
            {comments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Aucun commentaire pour le moment
              </p>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <Avatar className="h-9 w-9 ring-2 ring-background">
                      <AvatarImage src={comment.user?.avatar_url} />
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                        {comment.user?.full_name ? getInitials(comment.user.full_name) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-foreground">
                          {comment.user?.full_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comment.created_at), 'dd MMM à HH:mm', { locale: fr })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Separator />

            {/* New comment form */}
            <form onSubmit={handleCommentSubmit} className="flex gap-3">
              <Avatar className="h-9 w-9 ring-2 ring-background">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {profile?.full_name ? getInitials(profile.full_name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 flex gap-2">
                <Textarea
                  placeholder="Ajouter un commentaire..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={2}
                  className="flex-1 bg-background/50"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={isSubmitting || !newComment.trim()}
                  className="gradient-primary h-auto"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CourseDetail;
