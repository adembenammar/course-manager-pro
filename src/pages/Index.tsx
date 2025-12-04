import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { GraduationCap, BookOpen, Users, FileText, ArrowRight, Loader2 } from 'lucide-react';

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
      description: 'Créez et organisez vos cours avec des deadlines et du contenu riche.',
    },
    {
      icon: Users,
      title: 'Collaboration',
      description: 'Échangez avec vos étudiants via les commentaires et discussions.',
    },
    {
      icon: FileText,
      title: 'Soumissions',
      description: 'Recevez et notez les travaux des étudiants facilement.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center shadow-glow animate-float">
                <GraduationCap className="w-10 h-10 text-primary-foreground" />
              </div>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight animate-slide-up">
              EduPlatform
            </h1>
            <p className="mt-4 text-xl text-muted-foreground max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
              La plateforme moderne de gestion de cours pour professeurs et étudiants
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <Link to="/auth">
                <Button size="lg" className="gradient-primary shadow-glow text-lg px-8">
                  Commencer
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-foreground">Fonctionnalités</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Tout ce dont vous avez besoin pour gérer vos cours efficacement
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="p-6 rounded-2xl bg-card border border-border shadow-md hover:shadow-lg transition-all hover:-translate-y-1"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA section */}
      <div className="gradient-hero py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Prêt à commencer ?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Rejoignez EduPlatform et transformez votre expérience d'enseignement
          </p>
          <Link to="/auth">
            <Button size="lg" className="gradient-primary shadow-glow">
              Créer un compte gratuit
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">EduPlatform</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} EduPlatform. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
