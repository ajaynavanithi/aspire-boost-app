import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { ScoreCircle } from '@/components/ui/score-circle';
import { ProgressBar } from '@/components/ui/progress-bar';
import { SkillBadge } from '@/components/ui/skill-badge';
import { useAuth } from '@/contexts/AuthContext';
import { getUserResumes } from '@/lib/supabase';
import { 
  Upload, 
  FileText, 
  Briefcase, 
  Target, 
  MessageSquare,
  ArrowRight,
  Loader2,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [resumes, setResumes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [latestAnalysis, setLatestAnalysis] = useState<any>(null);

  useEffect(() => {
    const fetchResumes = async () => {
      if (!user) return;
      
      try {
        const data = await getUserResumes(user.id);
        setResumes(data || []);
        
        // Get the latest completed analysis
        const completedResume = data?.find(r => r.status === 'completed' && r.resume_analysis?.length > 0);
        if (completedResume) {
          setLatestAnalysis({
            resume: completedResume,
            analysis: completedResume.resume_analysis[0],
            jobs: completedResume.job_recommendations || [],
            skills: completedResume.skill_gaps || [],
            questions: completedResume.interview_questions || [],
          });
        }
      } catch (error) {
        console.error('Error fetching resumes:', error);
        toast.error('Failed to load your data');
      } finally {
        setLoading(false);
      }
    };

    fetchResumes();
  }, [user]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const hasData = latestAnalysis !== null;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Welcome, {user?.user_metadata?.full_name?.split(' ')[0] || 'there'}!
            </h1>
            <p className="text-muted-foreground mt-1">
              {hasData 
                ? 'Here\'s an overview of your resume analysis'
                : 'Get started by uploading your resume'
              }
            </p>
          </div>
          <Link to="/upload">
            <Button variant="hero">
              <Upload className="w-4 h-4" />
              Upload Resume
            </Button>
          </Link>
        </div>

        {!hasData ? (
          /* Empty State */
          <div className="bg-card rounded-2xl border border-border p-12 text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-primary" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground mb-3">
              No Resume Uploaded Yet
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Upload your resume to get personalized ATS scores, job recommendations, skill gap analysis, and interview preparation.
            </p>
            <Link to="/upload">
              <Button variant="hero" size="lg">
                <Upload className="w-5 h-5" />
                Upload Your First Resume
              </Button>
            </Link>
          </div>
        ) : (
          /* Dashboard with Data */
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-card rounded-2xl border border-border p-6 hover-lift">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-muted-foreground">ATS Score</span>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Target className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <ScoreCircle score={latestAnalysis.analysis?.ats_score || 0} size="sm" />
              </div>

              <div className="bg-card rounded-2xl border border-border p-6 hover-lift">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-muted-foreground">Job Matches</span>
                  <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-success" />
                  </div>
                </div>
                <div className="font-display text-3xl font-bold text-foreground">
                  {latestAnalysis.jobs?.length || 0}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Recommended jobs</p>
              </div>

              <div className="bg-card rounded-2xl border border-border p-6 hover-lift">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-muted-foreground">Skills Found</span>
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-accent" />
                  </div>
                </div>
                <div className="font-display text-3xl font-bold text-foreground">
                  {(latestAnalysis.analysis?.extracted_skills as string[])?.length || 0}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Identified skills</p>
              </div>

              <div className="bg-card rounded-2xl border border-border p-6 hover-lift">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-muted-foreground">Interview Prep</span>
                  <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-warning" />
                  </div>
                </div>
                <div className="font-display text-3xl font-bold text-foreground">
                  {latestAnalysis.questions?.length || 0}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Practice questions</p>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Skills Overview */}
              <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-display text-xl font-semibold text-foreground">
                    Your Skills
                  </h3>
                  <Link to="/skills" className="text-sm text-primary hover:underline flex items-center gap-1">
                    View All <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(latestAnalysis.analysis?.extracted_skills as string[])?.slice(0, 12).map((skill, index) => (
                    <SkillBadge key={index} skill={skill} variant="matched" />
                  ))}
                  {(latestAnalysis.analysis?.extracted_skills as string[])?.length > 12 && (
                    <span className="px-3 py-1.5 text-sm text-muted-foreground">
                      +{(latestAnalysis.analysis?.extracted_skills as string[]).length - 12} more
                    </span>
                  )}
                </div>
              </div>

              {/* Top Job Match */}
              <div className="bg-card rounded-2xl border border-border p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-display text-xl font-semibold text-foreground">
                    Top Match
                  </h3>
                  <Link to="/jobs" className="text-sm text-primary hover:underline flex items-center gap-1">
                    View All <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                {latestAnalysis.jobs?.[0] ? (
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-foreground">
                          {latestAnalysis.jobs[0].job_title}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {latestAnalysis.jobs[0].company_type}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-display font-bold text-success">
                          {latestAnalysis.jobs[0].match_percentage}%
                        </div>
                        <p className="text-xs text-muted-foreground">Match</p>
                      </div>
                    </div>
                    <ProgressBar 
                      value={latestAnalysis.jobs[0].match_percentage} 
                      variant="success"
                      showValue={false}
                    />
                  </div>
                ) : (
                  <p className="text-muted-foreground">No job recommendations yet</p>
                )}
              </div>
            </div>

            {/* Skill Gaps */}
            {latestAnalysis.skills?.length > 0 && (
              <div className="bg-card rounded-2xl border border-border p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-display text-xl font-semibold text-foreground">
                    Skills to Develop
                  </h3>
                  <Link to="/skills" className="text-sm text-primary hover:underline flex items-center gap-1">
                    View All <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  {latestAnalysis.skills.slice(0, 8).map((gap: any, index: number) => (
                    <SkillBadge key={index} skill={gap.skill_name} variant="missing" />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
