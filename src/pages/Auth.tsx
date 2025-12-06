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
import { GraduationCap, Mail, Lock, User, Loader2, ArrowLeft, Sparkles, BookOpen, Users } from 'lucide-react';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('student');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

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
      <div className="hidden lg:flex lg:w-1/2 relative gradient-primary p-12 flex-col justify-between">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        </div>
        
        <div className="relative">
          <Link to="/" className="inline-flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Retour à l'accueil
          </Link>
        </div>

        <div className="relative space-y-8">
          <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center">
            <GraduationCap className="w-10 h-10 text-primary-foreground" />
          </div>
          
          <div>
            <h1 className="text-4xl font-bold text-primary-foreground mb-4">
              Bienvenue sur EduPlatform
            </h1>
            <p className="text-xl text-primary-foreground/80 leading-relaxed max-w-md">
              La plateforme moderne pour gérer vos cours, communiquer avec vos étudiants et suivre les progrès.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4 text-primary-foreground/80">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <p className="font-medium text-primary-foreground">Gestion complète des cours</p>
                <p className="text-sm">Créez, partagez et organisez facilement</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-primary-foreground/80">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="font-medium text-primary-foreground">Collaboration en temps réel</p>
                <p className="text-sm">Échangez via commentaires et feedback</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-primary-foreground/80">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <p className="font-medium text-primary-foreground">Interface intuitive</p>
                <p className="text-sm">Simple à utiliser pour tous</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative text-primary-foreground/60 text-sm">
          © {new Date().getFullYear()} EduPlatform
        </div>
      </div>

      {/* Right Panel - Auth Forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md animate-scale-in">
          {/* Mobile header */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <Link to="/" className="mb-6 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Retour
            </Link>
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-glow mb-4">
              <GraduationCap className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">EduPlatform</h1>
          </div>

          <Card className="border-0 shadow-xl bg-card">
            <Tabs defaultValue="signin" className="w-full">
              <CardContent className="p-6 sm:p-8">
                <TabsList className="grid w-full grid-cols-2 mb-8 bg-muted/50 p-1 rounded-xl">
                  <TabsTrigger value="signin" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm py-3 font-medium">
                    Connexion
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm py-3 font-medium">
                    Inscription
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="signin" className="mt-0 space-y-6">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-foreground">Bon retour!</h2>
                    <p className="text-muted-foreground mt-1">Connectez-vous à votre compte</p>
                  </div>
                  
                  <form onSubmit={handleSignIn} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email" className="text-foreground font-medium">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="signin-email"
                          type="email"
                          placeholder="votre@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-12 h-12 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-colors"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signin-password" className="text-foreground font-medium">Mot de passe</Label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="signin-password"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-12 h-12 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-colors"
                          required
                        />
                      </div>
                    </div>

                    <Button type="submit" className="w-full h-12 rounded-xl gradient-primary text-base font-semibold btn-shine" disabled={isLoading}>
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
                    <h2 className="text-2xl font-bold text-foreground">Créer un compte</h2>
                    <p className="text-muted-foreground mt-1">Rejoignez EduPlatform gratuitement</p>
                  </div>
                  
                  <form onSubmit={handleSignUp} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="text-foreground font-medium">Nom complet</Label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="Jean Dupont"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="pl-12 h-12 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-colors"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-foreground font-medium">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="votre@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-12 h-12 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-colors"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-foreground font-medium">Mot de passe</Label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-12 h-12 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-colors"
                          required
                          minLength={6}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Minimum 6 caractères</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-role" className="text-foreground font-medium">Je suis</Label>
                      <Select value={role} onValueChange={setRole}>
                        <SelectTrigger className="h-12 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-colors">
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

                    <Button type="submit" className="w-full h-12 rounded-xl gradient-primary text-base font-semibold btn-shine" disabled={isLoading}>
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
        </div>
      </div>
    </div>
  );
};

export default Auth;