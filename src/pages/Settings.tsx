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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Settings as SettingsIcon, User, Mail, BookOpen, Calendar, Loader2, Save, Camera } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const Settings = () => {
  const { profile, user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    class_name: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        class_name: profile.class_name || '',
      });
    }
  }, [profile]);

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

        <div className="grid gap-6 md:grid-cols-3">
          {/* Profile Card */}
          <Card className="md:col-span-1 border-0 shadow-lg">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="relative mb-4">
                <Avatar className="w-24 h-24 border-4 border-background shadow-xl">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl font-bold gradient-primary text-primary-foreground">
                    {profile.full_name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute -bottom-1 -right-1 rounded-full w-8 h-8 shadow-md"
                  disabled
                >
                  <Camera className="w-4 h-4" />
                </Button>
              </div>

              <h3 className="text-xl font-bold text-foreground mb-1">{profile.full_name}</h3>
              <p className="text-sm text-muted-foreground mb-3">{profile.email}</p>
              
              <Badge variant="outline" className={`${getRoleColor(profile.role)} px-3 py-1`}>
                {getRoleLabel(profile.role)}
              </Badge>

              {profile.class_name && (
                <Badge variant="secondary" className="mt-2">
                  {profile.class_name}
                </Badge>
              )}
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
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;