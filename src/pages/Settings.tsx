import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Profile } from '@/types/database';
import FileUpload from '@/components/FileUpload';
import { Settings as SettingsIcon, User, Mail, BookOpen, Calendar, Loader2, Save, Camera, GraduationCap, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const Settings = () => {
  const { profile, user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [professors, setProfessors] = useState<Profile[]>([]);
  const [currentProfessor, setCurrentProfessor] = useState<Profile | null>(null);
  const [selectedProfessorId, setSelectedProfessorId] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    class_name: '',
  });

  const isStudent = profile?.role === 'student';

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        class_name: profile.class_name || '',
      });
      if (isStudent) {
        fetchProfessors();
        fetchCurrentProfessor();
      }
    }
  }, [profile]);

  const fetchProfessors = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'professor')
      .order('full_name');
    
    if (data) {
      setProfessors(data as Profile[]);
    }
  };

  const fetchCurrentProfessor = async () => {
    if (!profile) return;
    
    const { data: assignment } = await supabase
      .from('professor_students')
      .select('professor_id')
      .eq('student_id', profile.id)
      .maybeSingle();

    if (assignment) {
      setSelectedProfessorId(assignment.professor_id);
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', assignment.professor_id)
        .maybeSingle();
      
      if (prof) {
        setCurrentProfessor(prof as Profile);
      }
    }
  };

  const handleChangeProfessor = async () => {
    if (!profile || !selectedProfessorId) return;
    
    setLoading(true);

    // Remove existing assignment
    await supabase
      .from('professor_students')
      .delete()
      .eq('student_id', profile.id);

    // Add new assignment
    const { error } = await supabase.from('professor_students').insert({
      professor_id: selectedProfessorId,
      student_id: profile.id,
    });

    if (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: error.message });
    } else {
      await fetchCurrentProfessor();
      toast({ title: 'Professeur mis à jour', description: 'Vous avez été assigné au nouveau professeur.' });
    }

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: formData.full_name,
        class_name: formData.class_name,
      })
      .eq('id', profile.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: error.message });
    } else {
      await refreshProfile();
      toast({ title: 'Profil mis à jour', description: 'Vos informations ont été sauvegardées.' });
    }

    setLoading(false);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'professor':
        return 'Professeur';
      case 'admin':
        return 'Administrateur';
      default:
        return 'Étudiant';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'professor':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'admin':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const handleAvatarUpload = async (url: string) => {
    if (!profile) return;

    setAvatarUploading(true);

    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: url || null })
      .eq('id', profile.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: error.message });
    } else {
      await refreshProfile();
      toast({
        title: url ? 'Photo mise à jour' : 'Photo supprimée',
        description: url
          ? 'Votre nouvelle image de profil est enregistrée.'
          : 'Votre image de profil a été retirée.',
      });
    }

    setAvatarUploading(false);
  };

  if (!profile || !user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="animate-slide-up">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
              <SettingsIcon className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Paramètres du compte</h1>
              <p className="text-muted-foreground">Gérez vos informations personnelles</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-slide-up" style={{ animationDelay: '80ms' }}>
          <Card className="border-0 shadow-lg bg-gradient-to-r from-primary/10 via-background to-background/80">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-muted-foreground tracking-wide">Membre depuis</p>
                <p className="text-lg font-semibold text-foreground">
                  {user.created_at ? format(new Date(user.created_at), 'dd MMM yyyy', { locale: fr }) : '-'}
                </p>
              </div>
              <Calendar className="w-6 h-6 text-primary" />
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg bg-gradient-to-r from-accent/10 via-background to-background/80">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-muted-foreground tracking-wide">Rôle</p>
                <p className="text-lg font-semibold text-foreground">{getRoleLabel(profile.role)}</p>
              </div>
              <BookOpen className="w-6 h-6 text-accent" />
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg bg-gradient-to-r from-success/10 via-background to-background/80">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-muted-foreground tracking-wide">Email</p>
                <p className="text-lg font-semibold text-foreground truncate max-w-[160px]">{profile.email}</p>
              </div>
              <Mail className="w-6 h-6 text-success" />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Profile Card */}
          <Card className="md:col-span-1 border-0 shadow-xl overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/5 relative">
            <div className="absolute inset-0 opacity-40 pointer-events-none">
              <div className="absolute -top-10 -left-10 w-32 h-32 bg-primary/30 blur-3xl" />
              <div className="absolute -bottom-14 -right-6 w-36 h-36 bg-accent/30 blur-3xl" />
            </div>
            <CardContent className="p-6 flex flex-col items-center text-center relative z-10">
              <div className="relative mb-4">
                <div className="absolute inset-0 blur-xl bg-primary/30 rounded-full animate-pulse" />
                <Avatar className="w-24 h-24 border-4 border-background shadow-xl relative">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl font-bold gradient-primary text-primary-foreground">
                    {profile.full_name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-bold text-foreground">{profile.full_name}</h3>
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground mb-3">{profile.email}</p>
              
              <div className="flex flex-wrap justify-center gap-2">
                <Badge variant="outline" className={`${getRoleColor(profile.role)} px-3 py-1`}>
                  {getRoleLabel(profile.role)}
                </Badge>

                {profile.class_name && (
                  <Badge variant="secondary">
                    {profile.class_name}
                  </Badge>
                )}
              </div>

              <div className="w-full mt-6 space-y-3">
                <Label className="font-medium text-left w-full">Photo de profil</Label>
                <FileUpload
                  bucket="course-files"
                  folder={`profile-images/${profile.id}`}
                  accept="image/*"
                  maxSize={5}
                  existingFile={profile.avatar_url ? 'Image actuelle' : undefined}
                  onUploadComplete={async (url) => handleAvatarUpload(url)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full rounded-xl"
                  disabled={avatarUploading}
                  onClick={() => handleAvatarUpload('')}
                >
                  {avatarUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Mise à jour...
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4 mr-2" />
                      Retirer l'image
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Settings Form */}
          <Card className="md:col-span-2 border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Informations personnelles
              </CardTitle>
              <CardDescription>
                Modifiez vos informations de profil
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="full_name" className="font-medium">Nom complet</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="Votre nom"
                      className="h-12 rounded-xl"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="class_name" className="font-medium">Classe</Label>
                    <Input
                      id="class_name"
                      value={formData.class_name}
                      onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                      placeholder="Ex: 3ème A, Terminale S..."
                      className="h-12 rounded-xl"
                    />
                  </div>
                </div>

                <Separator />

                {/* Read-only info */}
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="font-medium flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      Email
                    </Label>
                    <Input
                      value={profile.email}
                      disabled
                      className="h-12 rounded-xl bg-muted/50"
                    />
                    <p className="text-xs text-muted-foreground">L'email ne peut pas être modifié</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-medium flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-muted-foreground" />
                      Rôle
                    </Label>
                    <Input
                      value={getRoleLabel(profile.role)}
                      disabled
                      className="h-12 rounded-xl bg-muted/50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    Membre depuis
                  </Label>
                  <Input
                    value={format(new Date(profile.created_at), 'PPP', { locale: fr })}
                    disabled
                    className="h-12 rounded-xl bg-muted/50"
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="gradient-primary rounded-xl h-12 px-6"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Enregistrer
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Professor Assignment for Students */}
          {isStudent && (
            <Card className="md:col-span-3 border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-primary" />
                  Mon Professeur
                </CardTitle>
                <CardDescription>
                  {currentProfessor 
                    ? `Vous êtes actuellement assigné à ${currentProfessor.full_name}`
                    : "Sélectionnez votre professeur pour accéder à ses cours et matières"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                  <div className="flex-1 space-y-2">
                    <Label className="font-medium">Professeur</Label>
                    <Select
                      value={selectedProfessorId}
                      onValueChange={setSelectedProfessorId}
                    >
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue placeholder="Sélectionnez un professeur" />
                      </SelectTrigger>
                      <SelectContent>
                        {professors.map((prof) => (
                          <SelectItem key={prof.id} value={prof.id}>
                            <div className="flex items-center gap-2">
                              <GraduationCap className="w-4 h-4 text-primary" />
                              {prof.full_name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={handleChangeProfessor}
                    disabled={loading || !selectedProfessorId || selectedProfessorId === currentProfessor?.id}
                    className="gradient-primary rounded-xl h-12 px-6"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Mise à jour...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {currentProfessor ? 'Changer de professeur' : 'Assigner'}
                      </>
                    )}
                  </Button>
                </div>
                {currentProfessor && (
                  <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={currentProfessor.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                          {currentProfessor.full_name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-foreground">{currentProfessor.full_name}</p>
                        <p className="text-sm text-muted-foreground">{currentProfessor.email}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
