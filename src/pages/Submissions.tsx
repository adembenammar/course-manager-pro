import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Submission } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { FileText, CheckCircle, Clock, Star, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const Submissions = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [gradingDialogOpen, setGradingDialogOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [gradeData, setGradeData] = useState({ grade: '', feedback: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isProfessor = profile?.role === 'professor' || profile?.role === 'admin';

  const fetchSubmissions = async () => {
    let query = supabase
      .from('submissions')
      .select('*, course:courses(*, subject:subjects(*)), student:profiles(*)')
      .order('created_at', { ascending: false });

    if (!isProfessor && profile) {
      query = query.eq('student_id', profile.id);
    }

    const { data, error } = await query;

    if (data) {
      setSubmissions(data as Submission[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (profile) {
      fetchSubmissions();
    }
  }, [profile]);

  const openGradingDialog = (submission: Submission) => {
    setSelectedSubmission(submission);
    setGradeData({
      grade: submission.grade?.toString() || '',
      feedback: submission.feedback || '',
    });
    setGradingDialogOpen(true);
  };

  const handleGrading = async () => {
    if (!selectedSubmission) return;

    const gradeValue = parseFloat(gradeData.grade);
    if (isNaN(gradeValue) || gradeValue < 0 || gradeValue > 20) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'La note doit être entre 0 et 20.' });
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase
      .from('submissions')
      .update({
        grade: gradeValue,
        feedback: gradeData.feedback,
        status: 'graded',
        graded_at: new Date().toISOString(),
      })
      .eq('id', selectedSubmission.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: error.message });
    } else {
      toast({ title: 'Note attribuée', description: 'La soumission a été notée.' });
      fetchSubmissions();
      setGradingDialogOpen(false);
    }

    setIsSubmitting(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'graded':
        return <Badge className="bg-success/10 text-success border-success/20">Noté</Badge>;
      case 'submitted':
        return <Badge className="bg-warning/10 text-warning border-warning/20">En attente</Badge>;
      default:
        return <Badge variant="secondary">Brouillon</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Soumissions</h1>
          <p className="text-muted-foreground">
            {isProfessor ? 'Gérez et notez les travaux des étudiants' : 'Suivez vos soumissions de travaux'}
          </p>
        </div>

        {/* Submissions table */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : submissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <FileText className="w-16 h-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground">Aucune soumission</h3>
                <p className="text-muted-foreground text-center mt-1">
                  {isProfessor ? 'Aucun travail soumis par les étudiants.' : 'Vous n\'avez pas encore soumis de travail.'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {isProfessor && <TableHead>Étudiant</TableHead>}
                    <TableHead>Cours</TableHead>
                    <TableHead>Matière</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Note</TableHead>
                    {isProfessor && <TableHead className="text-right">Action</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((submission) => (
                    <TableRow key={submission.id}>
                      {isProfessor && (
                        <TableCell className="font-medium">
                          {submission.student?.full_name}
                        </TableCell>
                      )}
                      <TableCell>{submission.course?.title}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          style={{
                            backgroundColor: `${submission.course?.subject?.color}20`,
                            color: submission.course?.subject?.color,
                          }}
                        >
                          {submission.course?.subject?.name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {submission.submitted_at
                          ? format(new Date(submission.submitted_at), 'dd MMM yyyy', { locale: fr })
                          : '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(submission.status)}</TableCell>
                      <TableCell>
                        {submission.grade !== null ? (
                          <span className="font-semibold text-foreground">{submission.grade}/20</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      {isProfessor && (
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openGradingDialog(submission)}
                          >
                            <Star className="w-4 h-4 mr-1" />
                            Noter
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Grading dialog */}
        <Dialog open={gradingDialogOpen} onOpenChange={setGradingDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Noter la soumission</DialogTitle>
              <DialogDescription>
                Attribuez une note et un feedback à l'étudiant.
              </DialogDescription>
            </DialogHeader>

            {selectedSubmission && (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-secondary rounded-lg">
                  <p className="font-medium text-foreground">{selectedSubmission.student?.full_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedSubmission.course?.title}</p>
                </div>

                {selectedSubmission.content && (
                  <div className="space-y-2">
                    <Label>Travail soumis</Label>
                    <div className="p-3 bg-muted rounded-lg text-sm max-h-40 overflow-y-auto">
                      {selectedSubmission.content}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="grade">Note (sur 20)</Label>
                  <Input
                    id="grade"
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={gradeData.grade}
                    onChange={(e) => setGradeData({ ...gradeData, grade: e.target.value })}
                    placeholder="Ex: 15"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="feedback">Feedback</Label>
                  <Textarea
                    id="feedback"
                    value={gradeData.feedback}
                    onChange={(e) => setGradeData({ ...gradeData, feedback: e.target.value })}
                    placeholder="Commentaires sur le travail..."
                    rows={4}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setGradingDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleGrading} disabled={isSubmitting} className="gradient-primary">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Attribution...
                  </>
                ) : (
                  'Attribuer la note'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Submissions;
