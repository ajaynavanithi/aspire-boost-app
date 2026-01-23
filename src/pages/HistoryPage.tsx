import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { ScoreCircle } from '@/components/ui/score-circle';
import { SkillBadge } from '@/components/ui/skill-badge';
import { ProgressBar } from '@/components/ui/progress-bar';
import { useAuth } from '@/contexts/AuthContext';
import { getUserResumes } from '@/lib/supabase';
import { 
  History, 
  FileText, 
  Calendar, 
  ArrowLeftRight, 
  X, 
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export const HistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [resumes, setResumes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResumes, setSelectedResumes] = useState<string[]>([]);
  const [compareMode, setCompareMode] = useState(false);

  useEffect(() => {
    const fetchResumes = async () => {
      if (!user) return;
      
      try {
        const data = await getUserResumes(user.id);
        setResumes(data || []);
      } catch (error) {
        console.error('Error fetching resumes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResumes();
  }, [user]);

  const toggleResumeSelection = (resumeId: string) => {
    if (selectedResumes.includes(resumeId)) {
      setSelectedResumes(selectedResumes.filter(id => id !== resumeId));
    } else if (selectedResumes.length < 2) {
      setSelectedResumes([...selectedResumes, resumeId]);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-warning animate-pulse" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getComparisonResumes = () => {
    return selectedResumes.map(id => resumes.find(r => r.id === id)).filter(Boolean) as any[];
  };

  const getScoreDifference = (score1: number, score2: number) => {
    const diff = score1 - score2;
    if (diff > 0) return { icon: TrendingUp, color: 'text-success', value: `+${diff}` };
    if (diff < 0) return { icon: TrendingDown, color: 'text-destructive', value: diff.toString() };
    return { icon: Minus, color: 'text-muted-foreground', value: '0' };
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const comparisonResumes = getComparisonResumes();

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Resume History
            </h1>
            <p className="text-muted-foreground mt-1">
              View and compare your resume analyses over time
            </p>
          </div>
          {resumes.length >= 2 && (
            <Button
              variant={compareMode ? "outline" : "hero"}
              onClick={() => {
                setCompareMode(!compareMode);
                if (compareMode) setSelectedResumes([]);
              }}
            >
              <ArrowLeftRight className="w-4 h-4" />
              {compareMode ? 'Exit Compare' : 'Compare Resumes'}
            </Button>
          )}
        </div>

        {compareMode && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <p className="text-sm text-foreground">
              <span className="font-medium">Compare Mode:</span> Select up to 2 resumes to compare side by side
              {selectedResumes.length > 0 && ` (${selectedResumes.length}/2 selected)`}
            </p>
          </div>
        )}

        {resumes.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border border-border">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <History className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground mb-2">
              No Resume History
            </h2>
            <p className="text-muted-foreground">
              Upload your first resume to start tracking your progress
            </p>
          </div>
        ) : (
          <>
            {/* Resume List */}
            <div className="grid gap-4">
              {resumes.map((resume) => {
                const analysis = resume.resume_analysis?.[0];
                const isSelected = selectedResumes.includes(resume.id);
                
                return (
                  <div
                    key={resume.id}
                    className={cn(
                      "bg-card rounded-2xl border p-6 transition-all cursor-pointer hover-lift",
                      isSelected 
                        ? "border-primary ring-2 ring-primary/20" 
                        : "border-border hover:border-primary/50",
                      compareMode && selectedResumes.length >= 2 && !isSelected && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => compareMode && toggleResumeSelection(resume.id)}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                      {/* File Info */}
                      <div className="flex items-start gap-4 flex-1">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                          resume.status === 'completed' ? "bg-primary/10" : "bg-muted"
                        )}>
                          <FileText className={cn(
                            "w-6 h-6",
                            resume.status === 'completed' ? "text-primary" : "text-muted-foreground"
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground truncate">
                              {resume.file_name}
                            </h3>
                            {getStatusIcon(resume.status)}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span>{format(new Date(resume.created_at), 'MMM d, yyyy h:mm a')}</span>
                          </div>
                          {compareMode && (
                            <div className={cn(
                              "inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-full text-xs font-medium",
                              isSelected 
                                ? "bg-primary/10 text-primary" 
                                : "bg-muted text-muted-foreground"
                            )}>
                              {isSelected ? 'Selected for comparison' : 'Click to select'}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quick Stats */}
                      {analysis && (
                        <div className="flex items-center gap-6 lg:gap-8">
                          <div className="text-center">
                            <ScoreCircle score={analysis.ats_score || 0} size="sm" />
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-display font-bold text-foreground">
                              {(analysis.extracted_skills as string[])?.length || 0}
                            </div>
                            <p className="text-xs text-muted-foreground">Skills</p>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-display font-bold text-foreground">
                              {resume.job_recommendations?.length || 0}
                            </div>
                            <p className="text-xs text-muted-foreground">Jobs</p>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-display font-bold text-destructive">
                              {resume.skill_gaps?.length || 0}
                            </div>
                            <p className="text-xs text-muted-foreground">Gaps</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Comparison View */}
            {compareMode && comparisonResumes.length === 2 && (
              <div className="bg-card rounded-2xl border border-border p-6 mt-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-display text-xl font-semibold text-foreground">
                    Side-by-Side Comparison
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedResumes([])}
                  >
                    <X className="w-4 h-4" />
                    Clear
                  </Button>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                  {comparisonResumes.map((resume, index) => {
                    const analysis = resume.resume_analysis?.[0];
                    const otherResume = comparisonResumes[1 - index];
                    const otherAnalysis = otherResume?.resume_analysis?.[0];
                    
                    const scoreDiff = analysis && otherAnalysis 
                      ? getScoreDifference(analysis.ats_score || 0, otherAnalysis.ats_score || 0)
                      : null;

                    return (
                      <div key={resume.id} className="space-y-6">
                        {/* Header */}
                        <div className="pb-4 border-b border-border">
                          <h4 className="font-semibold text-foreground truncate mb-1">
                            {resume.file_name}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(resume.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>

                        {/* ATS Score */}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-2">ATS Score</p>
                            <div className="flex items-center gap-3">
                              <ScoreCircle score={analysis?.ats_score || 0} size="md" />
                              {index === 0 && scoreDiff && (
                                <div className={cn("flex items-center gap-1", scoreDiff.color)}>
                                  <scoreDiff.icon className="w-4 h-4" />
                                  <span className="text-sm font-medium">{scoreDiff.value}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Skills */}
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-3">
                            Skills ({(analysis?.extracted_skills as string[])?.length || 0})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {(analysis?.extracted_skills as string[])?.slice(0, 8).map((skill, i) => (
                              <SkillBadge key={i} skill={skill} variant="matched" size="sm" />
                            ))}
                            {(analysis?.extracted_skills as string[])?.length > 8 && (
                              <span className="text-xs text-muted-foreground px-2 py-1">
                                +{(analysis?.extracted_skills as string[]).length - 8} more
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Skill Gaps */}
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-3">
                            Skill Gaps ({resume.skill_gaps?.length || 0})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {resume.skill_gaps?.slice(0, 6).map((gap, i) => (
                              <SkillBadge key={i} skill={gap.skill_name} variant="missing" size="sm" />
                            ))}
                            {(resume.skill_gaps?.length || 0) > 6 && (
                              <span className="text-xs text-muted-foreground px-2 py-1">
                                +{(resume.skill_gaps?.length || 0) - 6} more
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Job Match */}
                        {resume.job_recommendations?.[0] && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-3">
                              Top Job Match
                            </p>
                            <div className="bg-muted/50 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-foreground text-sm">
                                  {resume.job_recommendations[0].job_title}
                                </span>
                                <span className="text-sm font-bold text-success">
                                  {resume.job_recommendations[0].match_percentage}%
                                </span>
                              </div>
                              <ProgressBar 
                                value={resume.job_recommendations[0].match_percentage} 
                                variant="success"
                                showValue={false}
                              />
                            </div>
                          </div>
                        )}

                        {/* Strengths & Weaknesses */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-2">
                              Strengths
                            </p>
                            <ul className="space-y-1">
                              {(analysis?.strengths as string[])?.slice(0, 3).map((s, i) => (
                                <li key={i} className="text-xs text-success flex items-start gap-1">
                                  <span>•</span>
                                  <span className="line-clamp-2">{s}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-2">
                              Weaknesses
                            </p>
                            <ul className="space-y-1">
                              {(analysis?.weaknesses as string[])?.slice(0, 3).map((w, i) => (
                                <li key={i} className="text-xs text-destructive flex items-start gap-1">
                                  <span>•</span>
                                  <span className="line-clamp-2">{w}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default HistoryPage;
