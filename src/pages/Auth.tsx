import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/database';
import { GraduationCap, Mail, Lock, User, Loader2, ArrowLeft, Sparkles, BookOpen, Users, Shield, Award, TrendingUp } from 'lucide-react';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('student');
  const [selectedProfessorId, setSelectedProfessorId] = useState('');
  const [professors, setProfessors] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
    fetchProfessors();
  }, [user, navigate]);

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

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur de connexion',
        description: error.message === 'Invalid login credentials' 
          ? 'Email ou mot de passe incorrect'
          : error.message,
      });
    } else {
      toast({
        title: 'Connexion réussie',
        description: 'Bienvenue sur EduPlatform!',
      });
      navigate('/dashboard');
    }

    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (password.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Mot de passe trop court',
        description: 'Le mot de passe doit contenir au moins 6 caractères',
      });
      setIsLoading(false);
      return;
    }

    if (role === 'student' && !selectedProfessorId) {
      toast({
        variant: 'destructive',
        title: 'Professeur requis',
        description: 'Veuillez sélectionner votre professeur',
      });
      setIsLoading(false);
      return;
    }

    const { error } = await signUp(email, password, fullName, role);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur d\'inscription',
        description: error.message.includes('already registered')
          ? 'Cet email est déjà utilisé'
          : error.message,
      });
    } else {
      // If student, assign to professor
      if (role === 'student' && selectedProfessorId) {
        // Wait for profile to be created, then assign
        setTimeout(async () => {
          const { data: newProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .maybeSingle();

          if (newProfile) {
            await supabase.from('professor_students').insert({
              professor_id: selectedProfessorId,
              student_id: newProfile.id,
            });
          }
        }, 1000);
      }

      toast({
        title: 'Inscription réussie',
        description: 'Votre compte a été créé avec succès!',
      });
      navigate('/dashboard');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex overflow-hidden">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative p-12 flex-col justify-between overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-accent" />
        
        {/* Animated shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-72 h-72 bg-primary-foreground/10 rounded-full blur-3xl animate-pulse-soft" />
          <div className="absolute bottom-40 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-float" />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-primary-foreground/5 rounded-full blur-2xl" />
          
          {/* Decorative grid */}
          <div className="absolute inset-0 opacity-10" 
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
              backgroundSize: '40px 40px'
            }}
          />
        </div>
        
        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground transition-colors group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Retour à l'accueil
          </Link>
        </div>

        <div className="relative z-10 space-y-10">
          {/* Logo */}
          <div className="w-24 h-24 rounded-3xl bg-primary-foreground/20 backdrop-blur-xl flex items-center justify-center shadow-2xl border border-primary-foreground/20">
            <GraduationCap className="w-12 h-12 text-primary-foreground" />
          </div>
          
          <div>
            <h1 className="text-5xl font-bold text-primary-foreground mb-6 leading-tight">
              Bienvenue sur<br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-foreground via-primary-foreground to-primary-foreground/70">
                EduPlatform
              </span>
            </h1>
            <p className="text-xl text-primary-foreground/80 leading-relaxed max-w-md">
              La plateforme nouvelle génération pour gérer vos cours, suivre les progrès et communiquer efficacement.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-5">
            {[
              { icon: BookOpen, title: 'Gestion complète', desc: 'Cours, devoirs et soumissions' },
              { icon: Users, title: 'Collaboration', desc: 'Échanges en temps réel' },
              { icon: TrendingUp, title: 'Suivi des progrès', desc: 'Analytics et statistiques' },
              { icon: Shield, title: 'Sécurisé', desc: 'Données protégées' },
            ].map((feature, i) => (
              <div 
                key={i} 
                className="flex items-center gap-4 text-primary-foreground/90 group"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="w-14 h-14 rounded-2xl bg-primary-foreground/10 backdrop-blur flex items-center justify-center group-hover:bg-primary-foreground/20 transition-colors">
                  <feature.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold text-primary-foreground">{feature.title}</p>
                  <p className="text-sm text-primary-foreground/70">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-primary-foreground/60 text-sm">
          <Award className="w-5 h-5" />
          <span>Plateforme éducative de confiance depuis 2024</span>
        </div>
      </div>

      {/* Right Panel - Auth Forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-background relative">
        {/* Subtle pattern */}
        <div className="absolute inset-0 opacity-50" 
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, hsl(var(--muted)) 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }}
        />

        <div className="w-full max-w-md animate-scale-in relative z-10">
          {/* Mobile header */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <Link to="/" className="mb-6 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Retour
            </Link>
            <div className="w-20 h-20 rounded-3xl gradient-primary flex items-center justify-center shadow-glow mb-4">
              <GraduationCap className="w-10 h-10 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">EduPlatform</h1>
          </div>

          <Card className="border-0 shadow-2xl bg-card/80 backdrop-blur-xl">
            <Tabs defaultValue="signin" className="w-full">
              <CardContent className="p-8">
                <TabsList className="grid w-full grid-cols-2 mb-8 bg-muted/50 p-1.5 rounded-2xl h-14">
                  <TabsTrigger value="signin" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md py-3 font-semibold text-sm">
                    Connexion
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md py-3 font-semibold text-sm">
                    Inscription
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="signin" className="mt-0 space-y-6">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl gradient-primary mx-auto mb-4 flex items-center justify-center shadow-glow">
                      <Sparkles className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">Bon retour!</h2>
                    <p className="text-muted-foreground mt-2">Connectez-vous à votre compte</p>
                  </div>
                  
                  <form onSubmit={handleSignIn} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email" className="text-foreground font-medium">Email</Label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                          id="signin-email"
                          type="email"
                          placeholder="votre@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-12 h-14 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-all focus:shadow-md"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signin-password" className="text-foreground font-medium">Mot de passe</Label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                          id="signin-password"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-12 h-14 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-all focus:shadow-md"
                          required
                        />
                      </div>
                    </div>

                    <Button type="submit" className="w-full h-14 rounded-xl gradient-primary text-base font-semibold btn-shine shadow-glow" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Connexion...
                        </>
                      ) : (
                        'Se connecter'
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="mt-0 space-y-6">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 rounded-2xl gradient-primary mx-auto mb-4 flex items-center justify-center shadow-glow">
                      <User className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">Créer un compte</h2>
                    <p className="text-muted-foreground mt-2">Rejoignez EduPlatform</p>
                  </div>
                  
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="text-foreground font-medium">Nom complet</Label>
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="Jean Dupont"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="pl-12 h-12 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-all"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-foreground font-medium">Email</Label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="votre@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-12 h-12 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-all"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-foreground font-medium">Mot de passe</Label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-12 h-12 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-all"
                          required
                          minLength={6}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Minimum 6 caractères</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-role" className="text-foreground font-medium">Je suis</Label>
                      <Select value={role} onValueChange={(value) => {
                        setRole(value);
                        if (value === 'professor') setSelectedProfessorId('');
                      }}>
                        <SelectTrigger className="h-12 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-all">
                          <SelectValue placeholder="Sélectionnez votre rôle" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">
                            <span className="flex items-center gap-2">
                              📚 Étudiant
                            </span>
                          </SelectItem>
                          <SelectItem value="professor">
                            <span className="flex items-center gap-2">
                              👨‍🏫 Professeur
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Professor selection for students */}
                    {role === 'student' && (
                      <div className="space-y-2 animate-slide-up">
                        <Label htmlFor="signup-professor" className="text-foreground font-medium">
                          Mon professeur
                        </Label>
                        <Select value={selectedProfessorId} onValueChange={setSelectedProfessorId}>
                          <SelectTrigger className="h-12 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-all">
                            <SelectValue placeholder="Sélectionnez votre professeur" />
                          </SelectTrigger>
                          <SelectContent>
                            {professors.length === 0 ? (
                              <div className="p-4 text-center text-muted-foreground text-sm">
                                Aucun professeur disponible
                              </div>
                            ) : (
                              professors.map((prof) => (
                                <SelectItem key={prof.id} value={prof.id}>
                                  <span className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                                      {prof.full_name.charAt(0)}
                                    </div>
                                    {prof.full_name}
                                  </span>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Vous serez assigné à ce professeur et pourrez voir ses cours
                        </p>
                      </div>
                    )}

                    <Button type="submit" className="w-full h-14 rounded-xl gradient-primary text-base font-semibold btn-shine shadow-glow mt-6" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Inscription...
                        </>
                      ) : (
                        'Créer mon compte'
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>

          {/* Trust badges */}
          <div className="mt-8 flex items-center justify-center gap-6 text-muted-foreground">
            <div className="flex items-center gap-2 text-xs">
              <Shield className="w-4 h-4 text-success" />
              Sécurisé
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Lock className="w-4 h-4 text-success" />
              Crypté
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Award className="w-4 h-4 text-success" />
              Fiable
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
