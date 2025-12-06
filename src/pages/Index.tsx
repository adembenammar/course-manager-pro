import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { GraduationCap, BookOpen, Users, FileText, ArrowRight, Loader2, CheckCircle, Sparkles, Zap, Shield } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const features = [
    {
      icon: BookOpen,
      title: 'Gestion des cours',
      description: 'Créez et organisez vos cours avec des deadlines, du contenu riche et des fichiers joints.',
      color: 'hsl(221 83% 53%)',
    },
    {
      icon: Users,
      title: 'Collaboration active',
      description: 'Échangez avec vos étudiants via les commentaires et discussions en temps réel.',
      color: 'hsl(262 83% 58%)',
    },
    {
      icon: FileText,
      title: 'Soumissions & Notes',
      description: 'Recevez, téléchargez et notez les travaux des étudiants facilement.',
      color: 'hsl(142 76% 36%)',
    },
  ];

  const stats = [
    { value: '100%', label: 'Gratuit', icon: Sparkles },
    { value: '24/7', label: 'Disponible', icon: Zap },
    { value: '100%', label: 'Sécurisé', icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-soft" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-primary/10 to-accent/10 rounded-full blur-3xl" />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                <GraduationCap className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">EduPlatform</span>
            </div>
            <Link to="/auth">
              <Button variant="outline" className="rounded-full px-6 border-primary/30 hover:bg-primary hover:text-primary-foreground transition-all duration-300">
                Connexion
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero section */}
      <div className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex justify-center mb-8 animate-slide-down">
              <div className="relative">
                <div className="w-24 h-24 rounded-3xl gradient-primary flex items-center justify-center shadow-glow animate-float">
                  <GraduationCap className="w-12 h-12 text-primary-foreground" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-success flex items-center justify-center animate-bounce">
                  <CheckCircle className="w-4 h-4 text-success-foreground" />
                </div>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 animate-fade-in">
              <Sparkles className="w-4 h-4" />
              Plateforme éducative moderne
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight animate-slide-up">
              <span className="text-foreground">Apprenez</span>
              <br />
              <span className="text-gradient">autrement</span>
            </h1>
            
            <p className="mt-6 text-xl sm:text-2xl text-muted-foreground max-w-2xl mx-auto animate-slide-up leading-relaxed" style={{ animationDelay: '0.1s' }}>
              La plateforme moderne de gestion de cours pour professeurs et étudiants.
              <span className="text-foreground font-medium"> Simple, efficace, gratuit.</span>
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <Link to="/auth">
                <Button size="lg" className="gradient-primary shadow-glow text-lg px-8 py-6 rounded-2xl btn-shine group">
                  Commencer gratuitement
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto animate-slide-up" style={{ animationDelay: '0.3s' }}>
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="flex justify-center mb-2">
                    <stat.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Features section */}
      <div className="relative py-24 bg-gradient-to-b from-transparent via-muted/30 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">Tout ce dont vous avez besoin</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Des outils puissants pour gérer vos cours efficacement
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group relative p-8 rounded-3xl bg-card border border-border shadow-md hover:shadow-xl transition-all duration-500 hover:-translate-y-2 animate-slide-up overflow-hidden"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" 
                     style={{ background: `radial-gradient(circle at top right, ${feature.color}10, transparent 70%)` }} />
                <div 
                  className="relative w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-500 group-hover:scale-110"
                  style={{ backgroundColor: `${feature.color}15` }}
                >
                  <feature.icon className="w-8 h-8" style={{ color: feature.color }} />
                </div>
                <h3 className="relative text-xl font-bold text-foreground mb-3">{feature.title}</h3>
                <p className="relative text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA section */}
      <div className="relative py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden">
            <div className="absolute inset-0 gradient-primary opacity-90" />
            <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at top right, rgba(255,255,255,0.2), transparent 60%)' }} />
            <div className="relative px-8 py-16 sm:px-16 text-center">
              <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground mb-4">
                Prêt à transformer votre enseignement ?
              </h2>
              <p className="text-lg text-primary-foreground/80 mb-8 max-w-xl mx-auto">
                Rejoignez EduPlatform et découvrez une nouvelle façon d'enseigner et d'apprendre
              </p>
              <Link to="/auth">
                <Button size="lg" variant="secondary" className="rounded-2xl px-8 py-6 text-lg font-semibold shadow-xl hover:scale-105 transition-transform">
                  Créer un compte gratuit
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground">EduPlatform</span>
            </div>
            <p className="text-muted-foreground">
              © {new Date().getFullYear()} EduPlatform. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;