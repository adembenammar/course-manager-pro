import { useState, useEffect, useMemo } from 'react';
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
import { GraduationCap, Mail, Lock, User, Loader2, ArrowLeft, Sparkles, BookOpen, Users, Shield, Award, TrendingUp, CheckCircle, Info } from 'lucide-react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [className, setClassName] = useState('');
  const [role, setRole] = useState('student');
  const [selectedProfessorId, setSelectedProfessorId] = useState('');
  const [professors, setProfessors] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp, resetPassword, user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const t = (fr: string, en: string) => (language === 'en' ? en : fr);
  const passwordChecks = useMemo(
    () => [
      { label: t('Au moins 6 caracteres', 'At least 6 characters'), valid: password.length >= 6 },
      { label: t('1 majuscule', '1 uppercase letter'), valid: /[A-Z]/.test(password) },
      { label: t('1 chiffre', '1 number'), valid: /\d/.test(password) },
      { label: t('1 symbole', '1 symbol'), valid: /[^A-Za-z0-9]/.test(password) },
    ],
    [password, language],
  );
  const passwordScore = passwordChecks.filter((c) => c.valid).length;
  const strengthLabels = [t('Tres faible', 'Very weak'), t('Faible', 'Weak'), t('Correct', 'Okay'), t('Solide', 'Strong')];
  const strengthColors = ['bg-destructive/80', 'bg-warning/80', 'bg-primary/80', 'bg-success/80'];
  const featureList = language === 'en'
    ? [
        { icon: BookOpen, title: 'Complete management', desc: 'Courses, homework and submissions' },
        { icon: Users, title: 'Collaboration', desc: 'Real-time discussions' },
        { icon: TrendingUp, title: 'Progress tracking', desc: 'Analytics and stats' },
        { icon: Shield, title: 'Secure', desc: 'Protected data' },
      ]
    : [
        { icon: BookOpen, title: 'Gestion complete', desc: 'Cours, devoirs et soumissions' },
        { icon: Users, title: 'Collaboration', desc: 'Echanges en temps reel' },
        { icon: TrendingUp, title: 'Suivi des progres', desc: 'Analytics et statistiques' },
        { icon: Shield, title: 'Securise', desc: 'Donnees protegees' },
      ];

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
    fetchProfessors();
  }, [user, navigate]);

  useEffect(() => {
    const savedEmail = localStorage.getItem('remember_email');
    const savedFlag = localStorage.getItem('remember_me');
    if (savedEmail && savedFlag === 'true') {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

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
        title: t('Erreur de connexion', 'Login error'),
        description: error.message === 'Invalid login credentials'
          ? t('Email ou mot de passe incorrect', 'Incorrect email or password')
          : error.message,
      });
    } else {
      toast({
        title: t('Connexion reussie', 'Signed in'),
        description: t('Bienvenue sur EduPlatform!', 'Welcome back to EduPlatform!'),
      });
      if (rememberMe) {
        localStorage.setItem('remember_email', email);
        localStorage.setItem('remember_me', 'true');
      } else {
        localStorage.removeItem('remember_email');
        localStorage.removeItem('remember_me');
      }
      navigate('/dashboard');
    }

    setIsLoading(false);
  };

  const handleResetPassword = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      toast({
        variant: 'destructive',
        title: t('Email requis', 'Email required'),
        description: t('Renseignez votre email pour reinitialiser le mot de passe.', 'Enter your email to reset your password.'),
      });
      return;
    }

    setIsResetting(true);
    const { error } = await resetPassword(normalizedEmail);

    if (error) {
      toast({
        variant: 'destructive',
        title: t('Erreur', 'Error'),
        description: error.message,
      });
    } else {
      toast({
        title: t('Email envoye', 'Email sent'),
        description: t('Verifiez votre boite mail pour reinitialiser votre mot de passe.', 'Check your inbox to reset your password.'),
      });
    }

    setIsResetting(false);
  };

  const assignStudentToProfessor = async (studentEmail: string, professorId: string): Promise<boolean> => {
    // Poll for the profile to be created (max 20 attempts, 500ms each = 10 seconds max)
    let attempts = 0;
    const maxAttempts = 20;

    while (attempts < maxAttempts) {
      const { data: newProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', studentEmail)
        .maybeSingle();

      if (newProfile) {
        const { data: existingAssignment } = await supabase
          .from('professor_students')
          .select('id')
          .eq('professor_id', professorId)
          .eq('student_id', newProfile.id)
          .maybeSingle();

        if (existingAssignment) {
          return true;
        }

        const { error } = await supabase.from('professor_students').insert({
          professor_id: professorId,
          student_id: newProfile.id,
        });

        if (!error) {
          return true;
        }
      }

      attempts++;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return false;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const normalizedEmail = email.trim().toLowerCase();

    if (password.length < 6) {
      toast({
        variant: 'destructive',
        title: t('Mot de passe trop court', 'Password too short'),
        description: t('Le mot de passe doit contenir au moins 6 caracteres', 'Password must be at least 6 characters'),
      });
      setIsLoading(false);
      return;
    }

    if (role === 'student' && !selectedProfessorId) {
      toast({
        variant: 'destructive',
        title: t('Professeur requis', 'Professor required'),
        description: t('Veuillez selectionner votre professeur', 'Please select your instructor'),
      });
      setIsLoading(false);
      return;
    }

    if (!normalizedEmail || !normalizedEmail.includes('@') || normalizedEmail.endsWith('@')) {
      toast({
        variant: 'destructive',
        title: t('Email invalide', 'Invalid email'),
        description: t('Verifiez ladresse saisie.', 'Please check your email address.'),
      });
      setIsLoading(false);
      return;
    }

    const { error } = await signUp(normalizedEmail, password, fullName, role, className);

    if (error) {
      toast({
        variant: 'destructive',
        title: t("Erreur d'inscription", 'Sign-up error'),
        description: error.message.includes('already registered')
          ? t('Cet email est deja utilise', 'This email is already in use')
          : error.message,
      });
      setIsLoading(false);
      return;
    }

    if (role === 'student' && selectedProfessorId) {
      const assigned = await assignStudentToProfessor(normalizedEmail, selectedProfessorId);
      if (!assigned) {
        toast({
          variant: 'destructive',
          title: t('Attention', 'Heads up'),
          description: t("Lassignation au professeur a echoue. Veuillez contacter ladministrateur.", 'Assignment to the instructor failed. Please contact the admin.'),
        });
      }
    }

    toast({
      title: t('Inscription reussie', 'Sign-up successful'),
      description: t('Votre compte a ete cree avec succes!', 'Your account has been created!'),
    });
    navigate('/dashboard');

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,hsl(214_100%_65%_/_0.14),transparent_35%),radial-gradient(circle_at_80%_0%,hsl(28_93%_60%_/_0.12),transparent_30%),radial-gradient(circle_at_60%_70%,hsl(221_83%_53%_/_0.08),transparent_45%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0)_40%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0))]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex items-center justify-between mb-10">
          <Link to="/" className="inline-flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold tracking-tight">EduPlatform</span>
            <ArrowLeft className="w-4 h-4 opacity-70" />
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-start">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold">
              <Sparkles className="w-4 h-4" />
              {t('Espace securise pour equipes pedagogiques', 'Secure workspace for modern teaching teams')}
            </div>

            <div className="space-y-5">
              <h1 className="text-4xl sm:text-5xl font-black leading-[1.05] tracking-tight">
                {t('Un portail clair pour vos classes', 'A sharp portal for your classes')}
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl">
                {t('Visualisez vos cours, devoirs et feedback en une seule interface inspiree des meilleurs outils SaaS.', 'See courses, homework, and feedback in one sleek, SaaS-inspired cockpit.')}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {featureList.map((feature, i) => (
                <div
                  key={i}
                  className="group rounded-2xl border border-border/60 bg-card/80 backdrop-blur p-4 shadow-md hover:-translate-y-1 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <p className="font-semibold mb-1">{feature.title}</p>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/70 bg-card/70">
                <Award className="w-4 h-4 text-primary" />
                <span className="text-sm">{t('Lance en 2024', 'Launched in 2024')}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/70 bg-card/70">
                <Shield className="w-4 h-4 text-success" />
                <span className="text-sm">{t('Donnees protegees', 'Data protected')}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/70 bg-card/70">
                <Users className="w-4 h-4 text-accent" />
                <span className="text-sm">{t('Classes synchronisees', 'Classes in sync')}</span>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/10 via-accent/10 to-transparent rounded-[28px] blur-3xl" />
            <Card className="relative border border-border/70 bg-card/90 backdrop-blur-xl shadow-2xl overflow-hidden rounded-[24px]">
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {t('Portail', 'Portal')}
                    </p>
                    <h2 className="text-xl font-bold">{t('Connexion / Inscription', 'Sign in / Sign up')}</h2>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Shield className="w-4 h-4 text-primary" />
                    {t('Chiffre et securise', 'Encrypted & secure')}
                  </div>
                </div>

                <Tabs defaultValue="signin" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50 p-1.5 rounded-2xl h-12">
                    <TabsTrigger value="signin" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md py-2.5 font-semibold text-sm">
                      {t('Connexion', 'Sign in')}
                    </TabsTrigger>
                    <TabsTrigger value="signup" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md py-2.5 font-semibold text-sm">
                      {t('Inscription', 'Sign up')}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="signin" className="mt-0 space-y-5">
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email" className="text-foreground font-medium">{t('Email', 'Email')}</Label>
                        <div className="relative group">
                          <Mail aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                          <Input
                            id="signin-email"
                            type="email"
                            placeholder={t('vous@example.com', 'you@example.com')}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-12 h-12 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-all focus:shadow-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signin-password" className="text-foreground font-medium">{t('Mot de passe', 'Password')}</Label>
                        <div className="relative group">
                          <Lock aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                          <Input
                            id="signin-password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="********"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pl-12 pr-12 h-12 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-all focus:shadow-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((p) => !p)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-lg"
                            aria-label={showPassword ? t('Masquer le mot de passe', 'Hide password') : t('Afficher le mot de passe', 'Show password')}
                          >
                            {showPassword ? '🐻' : '🐻‍❄️'}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                          />
                          <span>{t('Se souvenir de moi', 'Remember me')}</span>
                        </label>
                        <Button
                          type="button"
                          variant="link"
                          className="px-0 text-sm"
                          onClick={handleResetPassword}
                          disabled={isResetting || isLoading}
                        >
                          {isResetting ? t('Envoi en cours...', 'Sending...') : t('Mot de passe oublie ?', 'Forgot password?')}
                        </Button>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-success" />
                        {t('2 minutes pour demarrer', '2-minute setup')}
                      </div>

                      <Button type="submit" className="w-full h-12 rounded-xl gradient-primary text-base font-semibold btn-shine shadow-glow" disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            {t('Connexion...', 'Signing in...')}
                          </>
                        ) : (
                          t('Se connecter', 'Sign in')
                        )}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup" className="mt-0 space-y-5">
                    <div className="rounded-2xl border border-border/50 bg-muted/30 p-4 flex items-center gap-3 text-sm">
                      <Info className="w-5 h-5 text-primary" />
                      <span>{t('Choisissez votre role et nous adaptons votre espace automatiquement.', 'Pick your role and we tailor the workspace automatically.')}</span>
                    </div>

                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="signup-name" className="text-foreground font-medium">{t('Nom complet', 'Full name')}</Label>
                          <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                              id="signup-name"
                              type="text"
                              placeholder={t('Jean Dupont', 'Jane Doe')}
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              className="pl-12 h-12 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-all"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="signup-class" className="text-foreground font-medium">{t('Classe', 'Class')}</Label>
                          <div className="relative group">
                            <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                              id="signup-class"
                              type="text"
                              placeholder={t('Ex: 3eme A', 'Ex: Grade 9A')}
                              value={className}
                              onChange={(e) => setClassName(e.target.value)}
                              className="pl-12 h-12 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-all"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-email" className="text-foreground font-medium">{t('Email', 'Email')}</Label>
                        <div className="relative group">
                          <Mail aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder={t('vous@example.com', 'you@example.com')}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-12 h-12 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-password" className="text-foreground font-medium">{t('Mot de passe', 'Password')}</Label>
                        <div className="relative group">
                          <Lock aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                          <Input
                            id="signup-password"
                            type="password"
                            placeholder="********"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pl-12 h-12 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            required
                            minLength={6}
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{t('Solidite', 'Strength')} : {strengthLabels[Math.max(0, passwordScore - 1)] || '--'}</span>
                            <span className="text-foreground font-medium">{passwordScore}/4</span>
                          </div>
                          <div className="flex gap-2">
                            {[0, 1, 2, 3].map((i) => (
                              <div key={i} className={`h-2 flex-1 rounded-full ${passwordScore > i ? strengthColors[i] : 'bg-muted'}`} />
                            ))}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {passwordChecks.map((check) => (
                              <div key={check.label} className={`flex items-center gap-2 rounded-lg px-2 py-1 ${check.valid ? 'text-success bg-success/10' : 'text-muted-foreground bg-muted/40'}`}>
                                <CheckCircle className="w-3 h-3" aria-hidden="true" />
                                <span>{check.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-role" className="text-foreground font-medium">{t('Je suis', 'I am')}</Label>
                        <Select
                          value={role}
                          onValueChange={(value) => {
                            setRole(value);
                            if (value === 'professor') setSelectedProfessorId('');
                          }}
                        >
                          <SelectTrigger className="h-12 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                            <SelectValue placeholder={t('Selectionnez votre role', 'Choose your role')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="student">
                              <span className="flex items-center gap-2">
                                <Users className="w-4 h-4" aria-hidden="true" />
                                {t('Etudiant', 'Student')}
                              </span>
                            </SelectItem>
                            <SelectItem value="professor">
                              <span className="flex items-center gap-2">
                                <GraduationCap className="w-4 h-4" aria-hidden="true" />
                                {t('Professeur', 'Professor')}
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {role === 'student' && (
                        <div className="space-y-2 animate-slide-up">
                          <Label htmlFor="signup-professor" className="text-foreground font-medium">
                            {t('Mon professeur', 'My instructor')}
                          </Label>
                          <Select value={selectedProfessorId} onValueChange={setSelectedProfessorId}>
                            <SelectTrigger className="h-12 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-all">
                              <SelectValue placeholder={t('Selectionnez votre professeur', 'Select your instructor')} />
                            </SelectTrigger>
                            <SelectContent>
                              {professors.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-muted-foreground">
                                  {t('Aucun professeur disponible', 'No instructor available')}
                                </div>
                              ) : (
                                professors.map((prof) => (
                                  <SelectItem key={prof.id} value={prof.id}>
                                    <span className="flex items-center gap-2">
                                      <GraduationCap className="w-4 h-4" />
                                      {prof.full_name}
                                    </span>
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            {t('Vous serez assigne a ce professeur et verrez ses cours', 'You will be assigned to this instructor and see their courses')}
                          </p>
                        </div>
                      )}

                      <Button type="submit" className="w-full h-12 rounded-xl gradient-primary text-base font-semibold btn-shine shadow-glow mt-4" disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            {t('Inscription...', 'Signing up...')}
                          </>
                        ) : (
                          t("S'inscrire", 'Sign up')
                        )}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>

                <div className="mt-6 text-center text-xs text-muted-foreground">
                  {t("En vous inscrivant, vous acceptez nos", 'By signing up, you accept our')}{' '}
                  <a href="#" className="text-primary hover:underline">
                    {t("conditions d'utilisation", 'terms of use')}
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
