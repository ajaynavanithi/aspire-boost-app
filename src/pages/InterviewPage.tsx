import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { getUserResumes } from '@/lib/supabase';
import { 
  MessageSquare, 
  ChevronDown, 
  ChevronUp, 
  Filter,
  Loader2,
  Code,
  Users,
  Lightbulb
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const InterviewPage: React.FC = () => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    category: 'all',
    difficulty: 'all',
  });

  useEffect(() => {
    const fetchQuestions = async () => {
      if (!user) return;
      
      try {
        const data = await getUserResumes(user.id);
        const completedResume = data?.find(r => r.status === 'completed');
        if (completedResume) {
          setQuestions(completedResume.interview_questions || []);
        }
      } catch (error) {
        console.error('Error fetching questions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [user]);

  const toggleQuestion = (id: string) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'technical':
        return Code;
      case 'hr':
        return Users;
      case 'coding_scenario':
        return Lightbulb;
      default:
        return MessageSquare;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'technical':
        return 'Technical';
      case 'hr':
        return 'HR';
      case 'coding_scenario':
        return 'Coding Scenario';
      default:
        return category;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-success/10 text-success';
      case 'intermediate':
        return 'bg-warning/10 text-warning';
      case 'advanced':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const filteredQuestions = questions.filter(q => {
    if (filters.category !== 'all' && q.category !== filters.category) return false;
    if (filters.difficulty !== 'all' && q.difficulty !== filters.difficulty) return false;
    return true;
  });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Interview Preparation
          </h1>
          <p className="text-muted-foreground mt-1">
            Practice with AI-generated questions tailored to your profile
          </p>
        </div>

        {questions.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border border-border">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-primary" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground mb-2">
              No Questions Yet
            </h2>
            <p className="text-muted-foreground">
              Upload a resume to get personalized interview questions.
            </p>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Filters:</span>
              </div>

              <div className="flex gap-2">
                {['all', 'technical', 'hr', 'coding_scenario'].map(cat => (
                  <Button
                    key={cat}
                    variant={filters.category === cat ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setFilters(prev => ({ ...prev, category: cat }))}
                  >
                    {cat === 'all' ? 'All Categories' : getCategoryLabel(cat)}
                  </Button>
                ))}
              </div>

              <div className="h-6 w-px bg-border" />

              <div className="flex gap-2">
                {['all', 'beginner', 'intermediate', 'advanced'].map(diff => (
                  <Button
                    key={diff}
                    variant={filters.difficulty === diff ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setFilters(prev => ({ ...prev, difficulty: diff }))}
                  >
                    {diff === 'all' ? 'All Levels' : diff.charAt(0).toUpperCase() + diff.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-4">
              {filteredQuestions.map((question, index) => {
                const Icon = getCategoryIcon(question.category);
                const isExpanded = expandedQuestions.has(question.id || String(index));
                
                return (
                  <div
                    key={question.id || index}
                    className="bg-card rounded-2xl border border-border overflow-hidden transition-all hover:border-primary/30"
                  >
                    <button
                      onClick={() => toggleQuestion(question.id || String(index))}
                      className="w-full p-6 text-left flex items-start gap-4"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={cn(
                            'px-2 py-0.5 rounded-full text-xs font-medium',
                            getDifficultyColor(question.difficulty)
                          )}>
                            {question.difficulty}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {getCategoryLabel(question.category)}
                          </span>
                          {question.job_role && (
                            <>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground">
                                {question.job_role}
                              </span>
                            </>
                          )}
                        </div>
                        <p className="font-medium text-foreground pr-8">
                          {question.question}
                        </p>
                      </div>

                      <div className="flex-shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {isExpanded && question.suggested_answer && (
                      <div className="px-6 pb-6 pt-0">
                        <div className="bg-muted/50 rounded-xl p-4 border-l-4 border-primary">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                            Suggested Answer
                          </p>
                          <p className="text-foreground whitespace-pre-wrap">
                            {question.suggested_answer}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredQuestions.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    No questions match your filters.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default InterviewPage;
