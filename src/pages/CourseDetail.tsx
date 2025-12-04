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
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const CourseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submissionContent, setSubmissionContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isStudent = profile?.role === 'student';

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
    if (!profile || !submissionContent.trim()) return;

    setIsSubmitting(true);

    if (submission) {
      const { error } = await supabase
        .from('submissions')
        .update({
          content: submissionContent,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        })
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
        content: submissionContent,
        status: 'submitted',
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
        <Card className="border-0 shadow-md">
          <CardHeader>
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${course.subject?.color}20` }}
              >
                <FileText className="w-7 h-7" style={{ color: course.subject?.color }} />
              </div>
              <div className="flex-1">
                <Badge
                  variant="secondary"
                  className="mb-2"
                  style={{
                    backgroundColor: `${course.subject?.color}20`,
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

          {course.content && (
            <CardContent>
              <Separator className="mb-4" />
              <div className="prose prose-sm max-w-none">
                <h3 className="text-lg font-semibold mb-3">Contenu du cours</h3>
                <div className="whitespace-pre-wrap text-muted-foreground">{course.content}</div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Student submission */}
        {isStudent && (
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Soumission de travail
              </CardTitle>
              <CardDescription>
                Soumettez votre travail pour ce cours
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {submission?.status === 'graded' && (
                <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                  <div className="flex items-center gap-2 text-success font-medium">
                    <CheckCircle className="w-5 h-5" />
                    Travail noté: {submission.grade}/20
                  </div>
                  {submission.feedback && (
                    <p className="mt-2 text-sm text-muted-foreground">{submission.feedback}</p>
                  )}
                </div>
              )}

              {submission?.status === 'submitted' && !submission.grade && (
                <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                  <div className="flex items-center gap-2 text-warning font-medium">
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
              />

              {submission?.status !== 'graded' && (
                <Button
                  onClick={handleSubmission}
                  disabled={isSubmitting || !submissionContent.trim()}
                  className="gradient-primary"
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
              )}
            </CardContent>
          </Card>
        )}

        {/* Comments section */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Commentaires ({comments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Comments list */}
            {comments.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Aucun commentaire pour le moment
              </p>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="h-8 w-8">
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
              <Avatar className="h-8 w-8">
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
                  className="flex-1"
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
