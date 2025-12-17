import {
  GraduationCap,
  BookOpen,
  Users,
  FileText,
  Sparkles,
  Zap,
  Shield,
} from 'lucide-react';

export const landingCopy = {
  en: {
    brand: 'EduPlatform',
    navLogin: 'Log in',
    badge: 'Learning OS 2025',
    heroTitle1: 'Teach boldly,',
    heroTitle2: 'learn effortlessly.',
    heroSubtitle:
      'Design and run courses with cinematic clarity, live feedback, and zero admin stress.',
    cta: 'Launch my workspace',
    secondaryCta: 'Take the live tour',
    noteLine1: 'Setup in 2 minutes',
    noteLine2: 'No credit card',
    ribbons: ['Adaptive paths', 'AI nudges', 'Clean analytics'],
    stats: [
      { value: '98%', label: 'Engagement', icon: Sparkles },
      { value: '<1h', label: 'Full setup', icon: Zap },
      { value: '0 paper', label: 'Manual work', icon: Shield },
    ],
    features: [
      {
        icon: BookOpen,
        title: 'Course architecture',
        description: 'Structure modules, media, and milestones with beautiful pacing.',
        color: 'hsl(221 83% 53%)',
      },
      {
        icon: Users,
        title: 'Live collaboration',
        description: 'Bring students into the flow with comments, reactions, and live pulses.',
        color: 'hsl(262 83% 58%)',
      },
      {
        icon: FileText,
        title: 'Submissions & grading',
        description: 'Collect, review, and grade without leaving the cockpit.',
        color: 'hsl(142 76% 36%)',
      },
    ],
    board: {
      title: 'Course cockpit',
      className: 'Grade 9A',
      badge: 'Live sync',
      items: [
        { title: 'Homework - Physics', date: 'Dec 18 - 23:59', status: 'Pending', color: 'bg-amber-100 text-amber-800' },
        { title: 'React project - Senior', date: 'Dec 20 - 18:00', status: 'Submitted', color: 'bg-blue-100 text-blue-800' },
        { title: 'Quiz - Math', date: 'Dec 22 - 08:30', status: 'To grade', color: 'bg-emerald-100 text-emerald-800' },
      ],
      progressLabel: 'Progress',
      progressFootnote: 'Deadlines on track - Auto reminders on',
      micro: [
        { label: 'Satisfaction', value: '4.9/5' },
        { label: 'Late tasks', value: '-42%' },
      ],
    },
    featureSectionTitle: 'The new classroom OS',
    featureSectionSubtitle: 'Precision tools for teachers who design experiences, not spreadsheets.',
    ctaTitle: 'Ready to launch a brighter cohort?',
    ctaSubtitle: 'Join EduPlatform and orchestrate your next course with style.',
    ctaButton: 'Create a free account',
    footerText: `© ${new Date().getFullYear()} EduPlatform. All rights reserved.`,
    steps: [
      { title: 'Create your space', description: 'Import students or start fresh' },
      { title: 'Launch your first course', description: 'Modules, deadlines, reminders' },
      { title: 'Track live progress', description: 'Submissions, grading, nudges' },
    ],
  },
  fr: {
    brand: 'EduPlatform',
    navLogin: 'Connexion',
    badge: 'Suite pédagogique 2025',
    heroTitle1: 'Enseignez avec audace,',
    heroTitle2: 'apprenez sans friction.',
    heroSubtitle:
      'Orchestrez vos cours avec une clarté cinématique, du feedback en direct et zéro charge admin.',
    cta: 'Lancer mon espace',
    secondaryCta: 'Voir la démo live',
    noteLine1: 'Mise en route 2 min',
    noteLine2: 'Sans carte bancaire',
    ribbons: ['Parcours adaptatifs', 'Assistances IA', 'Analyses limpides'],
    stats: [
      { value: '98%', label: 'Engagement', icon: Sparkles },
      { value: '<1h', label: 'Mise en place', icon: Zap },
      { value: '0 papier', label: 'Charge manuelle', icon: Shield },
    ],
    features: [
      {
        icon: BookOpen,
        title: 'Architecture de cours',
        description: 'Pacez modules, médias et jalons avec fluidité et précision.',
        color: 'hsl(221 83% 53%)',
      },
      {
        icon: Users,
        title: 'Collaboration live',
        description: 'Commentaires, réactions et pulses en direct pour garder la classe engagée.',
        color: 'hsl(262 83% 58%)',
      },
      {
        icon: FileText,
        title: 'Soumissions & notation',
        description: 'Collectez, relisez et notez sans quitter le cockpit.',
        color: 'hsl(142 76% 36%)',
      },
    ],
    board: {
      title: 'Cockpit de cours',
      className: 'Classe de 3ème A',
      badge: 'Sync en direct',
      items: [
        { title: 'Devoir - Physique', date: '18 déc - 23:59', status: 'En attente', color: 'bg-amber-100 text-amber-800' },
        { title: 'Projet React - Terminale', date: '20 déc - 18:00', status: 'Soumis', color: 'bg-blue-100 text-blue-800' },
        { title: 'Contrôle - Maths', date: '22 déc - 08:30', status: 'À noter', color: 'bg-emerald-100 text-emerald-800' },
      ],
      progressLabel: 'Progression',
      progressFootnote: 'Délais respectés - Rappels auto activés',
      micro: [
        { label: 'Satisfaction', value: '4,9/5' },
        { label: 'Retards', value: '-42%' },
      ],
    },
    featureSectionTitle: 'Le nouvel OS pédagogique',
    featureSectionSubtitle: 'Des outils précis pour des enseignants qui conçoivent des expériences, pas des tableurs.',
    ctaTitle: 'Prêt à lancer une cohorte lumineuse ?',
    ctaSubtitle: 'Rejoignez EduPlatform et pilotez vos cours avec panache.',
    ctaButton: 'Créer un compte gratuit',
    footerText: `© ${new Date().getFullYear()} EduPlatform. Tous droits réservés.`,
    steps: [
      { title: 'Créez votre espace', description: 'Importez les étudiants ou démarrez de zéro' },
      { title: 'Lancez un cours', description: 'Modules, jalons, rappels automatiques' },
      { title: 'Suivez en direct', description: 'Soumissions, notation, relances' },
    ],
  },
} as const;

export type LandingLocale = keyof typeof landingCopy;
