import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Search, BookOpen, FolderOpen, FileText, Users, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface SearchResult {
  id: string;
  type: 'course' | 'subject' | 'student';
  title: string;
  subtitle?: string;
  color?: string;
}

const GlobalSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { profile } = useAuth();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);

  const isProfessor = profile?.role === 'professor' || profile?.role === 'admin';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const search = async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      const searchResults: SearchResult[] = [];

      // Search courses
      const { data: courses } = await supabase
        .from('courses')
        .select('id, title, subject:subjects(name, color)')
        .ilike('title', `%${query}%`)
        .limit(3);

      if (courses) {
        courses.forEach((course: any) => {
          searchResults.push({
            id: course.id,
            type: 'course',
            title: course.title,
            subtitle: course.subject?.name,
            color: course.subject?.color,
          });
        });
      }

      // Search subjects
      const { data: subjects } = await supabase
        .from('subjects')
        .select('id, name, color')
        .ilike('name', `%${query}%`)
        .limit(3);

      if (subjects) {
        subjects.forEach((subject) => {
          searchResults.push({
            id: subject.id,
            type: 'subject',
            title: subject.name,
            color: subject.color,
          });
        });
      }

      // Professor: search students
      if (isProfessor && profile) {
        const { data: professorStudents } = await supabase
          .from('professor_students')
          .select('student_id')
          .eq('professor_id', profile.id);

        if (professorStudents && professorStudents.length > 0) {
          const studentIds = professorStudents.map(ps => ps.student_id);
          
          const { data: students } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', studentIds)
            .ilike('full_name', `%${query}%`)
            .limit(3);

          if (students) {
            students.forEach((student) => {
              searchResults.push({
                id: student.id,
                type: 'student',
                title: student.full_name,
                subtitle: student.email,
              });
            });
          }
        }
      }

      setResults(searchResults);
      setLoading(false);
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [query, isProfessor, profile]);

  const handleResultClick = (result: SearchResult) => {
    switch (result.type) {
      case 'course':
        navigate(`/courses/${result.id}`);
        break;
      case 'subject':
        navigate(`/courses?subject=${result.id}`);
        break;
      case 'student':
        navigate('/students');
        break;
    }
    setQuery('');
    setIsOpen(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'course':
        return BookOpen;
      case 'subject':
        return FolderOpen;
      case 'student':
        return Users;
      default:
        return FileText;
    }
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Rechercher cours, matières..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-12 pr-10 h-11 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-all"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && (query.trim().length >= 2 || loading) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Aucun résultat pour "{query}"
            </div>
          ) : (
            <div className="py-2">
              {results.map((result) => {
                const Icon = getIcon(result.type);
                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{
                        backgroundColor: result.color ? `${result.color}20` : 'hsl(var(--primary) / 0.1)',
                      }}
                    >
                      <Icon
                        className="w-5 h-5"
                        style={{ color: result.color || 'hsl(var(--primary))' }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{result.title}</p>
                      {result.subtitle && (
                        <p className="text-sm text-muted-foreground truncate">{result.subtitle}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground capitalize bg-muted px-2 py-1 rounded-md">
                      {result.type === 'course' ? 'Cours' : result.type === 'subject' ? 'Matière' : 'Étudiant'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;