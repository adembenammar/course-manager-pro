import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { FileText, CheckCircle, Clock, Star, Loader2, Download, Eye, ExternalLink, Search, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const Submissions = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [gradingDialogOpen, setGradingDialogOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [gradeData, setGradeData] = useState({ grade: '', feedback: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deadlineSort, setDeadlineSort] = useState<'latest' | 'oldest'>('latest');

  const isProfessor = profile?.role === 'professor' || profile?.role === 'admin';

  const exportCsv = () => {
    const header = ['Etudiant', 'Cours', 'Matière', 'Statut', 'Note', 'Deadline', 'Soumis le', 'Fichier'];
    const rows = filteredSubmissions.map((s) => [
      s.student?.full_name || '',
      s.course?.title || '',
      s.course?.subject?.name || '',
      s.status,
      s.grade ?? '',
      s.course?.deadline ? format(new Date(s.course.deadline), 'dd/MM/yyyy', { locale: fr }) : '',
      s.submitted_at || s.created_at ? format(new Date(s.submitted_at || s.created_at), 'dd/MM/yyyy HH:mm', { locale: fr }) : '',
      s.file_url || '',
    ]);
    const csv = [header, ...rows]
      .map((r) =>
        r
          .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'soumissions.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const rows = filteredSubmissions
      .map(
        (s) => `<tr>
          <td>${s.student?.full_name || ''}</td>
          <td>${s.course?.title || ''}</td>
          <td>${s.course?.subject?.name || ''}</td>
          <td>${s.status}</td>
          <td>${s.grade ?? ''}</td>
          <td>${s.course?.deadline ? format(new Date(s.course.deadline), 'dd/MM/yyyy', { locale: fr }) : ''}</td>
          <td>${s.submitted_at || s.created_at ? format(new Date(s.submitted_at || s.created_at), 'dd/MM/yyyy HH:mm', { locale: fr }) : ''}</td>
        </tr>`
      )
      .join('');
    const html = `<html><head><title>Soumissions</title><style>
      table{width:100%;border-collapse:collapse;font-family:sans-serif;font-size:12px;}
      th,td{border:1px solid #ddd;padding:6px;text-align:left;}
      th{background:#f4f4f4;}
    </style></head><body>
      <h2>Soumissions export</h2>
      <table>
        <thead><tr>
          <th>Etudiant</th><th>Cours</th><th>Matière</th><th>Statut</th><th>Note</th><th>Deadline</th><th>Soumis le</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </body></html>`;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  const fetchSubmissions = async () => {
    if (!profile) return;

    if (isProfessor) {
      // Get professor's students first
      const { data: professorStudents } = await supabase
        .from('professor_students')
        .select('student_id')
        .eq('professor_id', profile.id);

      if (!professorStudents || professorStudents.length === 0) {
        setSubmissions([]);
        setFilteredSubmissions([]);
        setLoading(false);
        return;
      }

      const studentIds = professorStudents.map(ps => ps.student_id);

      // Get submissions only from professor's students
      const { data } = await supabase
        .from('submissions')
        .select('*, course:courses(*, subject:subjects(*)), student:profiles(*)')
        .in('student_id', studentIds)
        .order('created_at', { ascending: false });

      if (data) {
        setSubmissions(data as Submission[]);
        setFilteredSubmissions(data as Submission[]);
      }
    } else {
      // Students see only their own submissions
      const { data } = await supabase
        .from('submissions')
        .select('*, course:courses(*, subject:subjects(*)), student:profiles(*)')
        .eq('student_id', profile.id)
        .order('created_at', { ascending: false });

      if (data) {
        setSubmissions(data as Submission[]);
        setFilteredSubmissions(data as Submission[]);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    if (profile) {
      fetchSubmissions();
    }
  }, [profile]);

  useEffect(() => {
    const query = searchQuery.toLowerCase().trim();
    let result = submissions.slice();

    if (query) {
      result = result.filter(
        (s) =>
          s.student?.full_name?.toLowerCase().includes(query) ||
          s.course?.title?.toLowerCase().includes(query) ||
          s.course?.subject?.name?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((s) => s.status === statusFilter);
    }

    result = result.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return deadlineSort === 'latest' ? dateB - dateA : dateA - dateB;
    });

    setFilteredSubmissions(result);
  }, [searchQuery, submissions, statusFilter, deadlineSort]);

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
      
      // Send notification to student
      if (selectedSubmission.student?.id) {
        await supabase.from('notifications').insert({
          user_id: selectedSubmission.student.id,
          title: 'Travail noté',
          message: `Votre travail "${selectedSubmission.course?.title}" a été noté: ${gradeValue}/20`,
          type: 'grade',
          data: { grade: gradeValue, courseName: selectedSubmission.course?.title },
        });
      }
      
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

  const handleDownloadFile = async (fileUrl: string) => {
    try {
      const pathMatch = fileUrl.match(/submission-files\/(.+)/);
      if (pathMatch) {
        const { data } = await supabase.storage
          .from('submission-files')
          .createSignedUrl(pathMatch[1], 3600);
        
        if (data?.signedUrl) {
          window.open(data.signedUrl, '_blank');
          return;
        }
      }
      window.open(fileUrl, '_blank');
    } catch (error) {
      console.error('Download error:', error);
      window.open(fileUrl, '_blank');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-slide-up">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
              <FileText className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Soumissions</h1>
              <p className="text-muted-foreground">
                {isProfessor ? 'Gérez et notez les travaux de vos étudiants' : 'Suivez vos soumissions de travaux'}
              </p>
            </div>
          </div>

        <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4 items-center">
          {/* Search bar */}
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" aria-hidden="true" />
            <Label htmlFor="submission-search" className="sr-only">Rechercher une soumission</Label>
            <Input
              id="submission-search"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 rounded-xl border-border/50 bg-muted/30 focus:bg-background"
            />
          </div>

          {/* Status filter */}
          <div className="w-full">
            <Label htmlFor="status-filter" className="sr-only">Filtrer par statut</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger id="status-filter" className="h-12 rounded-xl border-border/50 bg-muted/30 focus:bg-background">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="submitted">Soumis</SelectItem>
                <SelectItem value="graded">Noté</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort by date */}
          <div className="w-full">
            <Label htmlFor="sort-order" className="sr-only">Trier par date</Label>
            <Select value={deadlineSort} onValueChange={(v: 'latest' | 'oldest') => setDeadlineSort(v)}>
              <SelectTrigger id="sort-order" className="h-12 rounded-xl border-border/50 bg-muted/30 focus:bg-background">
                <SelectValue placeholder="Tri par date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Plus récentes</SelectItem>
                <SelectItem value="oldest">Plus anciennes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 w-full col-span-full lg:col-span-1">
            <Button variant="outline" className="w-1/2" onClick={exportCsv}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" className="w-1/2" onClick={exportPdf}>
              <Printer className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* End header and filters */}
        </div>

        {/* Submissions table */}
        <Card className="border-0 shadow-lg animate-slide-up overflow-hidden" style={{ animationDelay: '50ms' }}>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <FileText className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Aucune soumission</h3>
                <p className="text-muted-foreground text-center mt-1 max-w-sm">
                  {searchQuery
                    ? 'Aucun résultat pour cette recherche.'
                    : isProfessor
                    ? 'Aucun travail soumis par vos étudiants.'
                    : 'Vous n\'avez pas encore soumis de travail.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      {isProfessor && <TableHead className="font-semibold">Étudiant</TableHead>}
                      <TableHead className="font-semibold">Cours</TableHead>
                      <TableHead className="font-semibold">Matière</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Statut</TableHead>
                      <TableHead className="font-semibold">Note</TableHead>
                      {isProfessor && <TableHead className="font-semibold">Fichier</TableHead>}
                      {isProfessor && <TableHead className="text-right font-semibold">Action</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubmissions.map((submission) => (
                      <TableRow key={submission.id} className="hover:bg-muted/20 transition-colors">
                        {isProfessor && (
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                                {submission.student?.full_name?.charAt(0)}
                              </div>
                              {submission.student?.full_name}
                            </div>
                          </TableCell>
                        )}
                        <TableCell className="font-medium">{submission.course?.title}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="font-medium"
                            style={{
                              backgroundColor: `${submission.course?.subject?.color}15`,
                              color: submission.course?.subject?.color,
                              borderColor: `${submission.course?.subject?.color}30`,
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
                            <span className="font-bold text-foreground text-lg">{submission.grade}<span className="text-muted-foreground font-normal text-sm">/20</span></span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        {isProfessor && (
                          <TableCell>
                            {submission.file_url ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadFile(submission.file_url!)}
                                className="gap-2 rounded-lg"
                              >
                                <Download className="w-4 h-4" />
                                Télécharger
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-sm">Aucun fichier</span>
                            )}
                          </TableCell>
                        )}
                        {isProfessor && (
                          <TableCell className="text-right">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => openGradingDialog(submission)}
                              className="gradient-primary rounded-lg"
                            >
                              <Star className="w-4 h-4 mr-1" />
                              {submission.grade !== null ? 'Modifier' : 'Noter'}
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Grading dialog */}
        <Dialog open={gradingDialogOpen} onOpenChange={setGradingDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl">Noter la soumission</DialogTitle>
              <DialogDescription>
                Attribuez une note et un feedback à l'étudiant.
              </DialogDescription>
            </DialogHeader>

            {selectedSubmission && (
              <div className="space-y-5 py-4">
                {/* Student info */}
                <div className="p-4 bg-muted/50 rounded-xl border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                      {selectedSubmission.student?.full_name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{selectedSubmission.student?.full_name}</p>
                      <p className="text-sm text-muted-foreground">{selectedSubmission.course?.title}</p>
                    </div>
                  </div>
                </div>

                {/* Content preview */}
                {selectedSubmission.content && (
                  <div className="space-y-2">
                    <Label className="text-foreground font-medium">Contenu soumis</Label>
                    <div className="p-4 bg-muted/30 rounded-xl text-sm max-h-40 overflow-y-auto border border-border/50">
                      {selectedSubmission.content}
                    </div>
                  </div>
                )}

                {/* File download */}
                {selectedSubmission.file_url && (
                  <div className="space-y-2">
                    <Label className="text-foreground font-medium">Fichier soumis</Label>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3 h-12 rounded-xl"
                      onClick={() => handleDownloadFile(selectedSubmission.file_url!)}
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <span className="flex-1 text-left">Télécharger le fichier</span>
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                )}

                {/* Grade input */}
                <div className="space-y-2">
                  <Label htmlFor="grade" className="text-foreground font-medium">Note (sur 20)</Label>
                  <Input
                    id="grade"
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={gradeData.grade}
                    onChange={(e) => setGradeData({ ...gradeData, grade: e.target.value })}
                    placeholder="Ex: 15"
                    className="h-12 rounded-xl text-lg font-medium"
                  />
                </div>

                {/* Feedback */}
                <div className="space-y-2">
                  <Label htmlFor="feedback" className="text-foreground font-medium">Feedback</Label>
                  <Textarea
                    id="feedback"
                    value={gradeData.feedback}
                    onChange={(e) => setGradeData({ ...gradeData, feedback: e.target.value })}
                    placeholder="Commentaires sur le travail..."
                    rows={4}
                    className="rounded-xl resize-none"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setGradingDialogOpen(false)} className="rounded-xl">
                Annuler
              </Button>
              <Button onClick={handleGrading} disabled={isSubmitting} className="gradient-primary rounded-xl">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Attribution...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Attribuer la note
                  </>
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
