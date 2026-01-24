import React, { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProgressBar } from '@/components/ui/progress-bar';
import { SkillBadge } from '@/components/ui/skill-badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { getUserResumes, refreshJobRecommendations, subscribeToJobUpdates } from '@/lib/supabase';
import { Briefcase, MapPin, DollarSign, Loader2, RefreshCw, Sparkles, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export const JobsPage: React.FC = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resumeData, setResumeData] = useState<any>(null);

  const fetchJobs = useCallback(async () => {
    if (!user) return;
    
    try {
      const data = await getUserResumes(user.id);
      const completedResume = data?.find(r => r.status === 'completed');
      if (completedResume) {
        setResumeData(completedResume);
        setJobs(completedResume.job_recommendations || []);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Subscribe to real-time job updates
  useEffect(() => {
    if (!resumeData?.id) return;

    const unsubscribe = subscribeToJobUpdates(resumeData.id, (updatedJobs) => {
      setJobs(updatedJobs);
      toast.success('Job recommendations updated!');
    });

    return unsubscribe;
  }, [resumeData?.id]);

  const handleRefreshJobs = async () => {
    if (!resumeData || !user) return;

    const skills = resumeData.resume_analysis?.[0]?.extracted_skills || [];
    if (skills.length === 0) {
      toast.error('No skills found to search for jobs');
      return;
    }

    setRefreshing(true);
    toast.info('Searching for real-time job matches...');

    try {
      const result = await refreshJobRecommendations(resumeData.id, user.id, skills);
      if (result?.jobs) {
        setJobs(result.jobs);
        toast.success(`Found ${result.jobs.length} matching jobs!`);
      }
    } catch (error) {
      console.error('Error refreshing jobs:', error);
      toast.error('Failed to refresh job recommendations');
    } finally {
      setRefreshing(false);
    }
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

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-7 h-7 text-primary" />
              Job Recommendations
            </h1>
            <p className="text-muted-foreground mt-1">
              Real-time job matches scraped from LinkedIn, Indeed & Glassdoor
            </p>
          </div>
          
          {resumeData && (
            <Button 
              onClick={handleRefreshJobs} 
              disabled={refreshing}
              className="gap-2"
            >
              {refreshing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {refreshing ? 'Searching...' : 'Refresh Jobs'}
            </Button>
          )}
        </div>

        {jobs.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border border-border">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-8 h-8 text-primary" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground mb-2">
              No Job Recommendations Yet
            </h2>
            <p className="text-muted-foreground mb-4">
              Upload a resume to get personalized job recommendations from live job boards.
            </p>
            {resumeData && (
              <Button onClick={handleRefreshJobs} disabled={refreshing}>
                {refreshing ? 'Searching...' : 'Search for Jobs Now'}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Real-time indicator */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </span>
              Live data from job boards • {jobs.length} jobs found
            </div>

            {jobs.map((job, index) => (
              <div 
                key={job.id || index} 
                className="bg-card rounded-2xl border border-border p-6 hover:border-primary/30 transition-colors hover-lift"
              >
                <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                  {/* Job Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-display text-xl font-semibold text-foreground">
                          {job.job_title}
                        </h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          {job.company_type && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {job.company_type}
                            </span>
                          )}
                          {job.salary_range && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              {job.salary_range}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Match Percentage */}
                      <div className="text-right">
                        <div className="text-3xl font-display font-bold text-success">
                          {job.match_percentage}%
                        </div>
                        <p className="text-xs text-muted-foreground">Match</p>
                      </div>
                    </div>

                    {/* Match Progress */}
                    <div className="mb-4">
                      <ProgressBar 
                        value={job.match_percentage} 
                        variant={job.match_percentage >= 80 ? 'success' : job.match_percentage >= 60 ? 'primary' : 'warning'}
                        showValue={false}
                        size="sm"
                      />
                    </div>

                    {/* Full Description */}
                    {job.job_description && (
                      <div className="mb-4">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                          Job Description
                        </p>
                        <p className="text-muted-foreground text-sm whitespace-pre-line">
                          {job.job_description}
                        </p>
                      </div>
                    )}

                    {/* Skills */}
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                          Matched Skills
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {(job.matched_skills as string[] || []).slice(0, 5).map((skill, i) => (
                            <SkillBadge key={i} skill={skill} variant="matched" size="sm" />
                          ))}
                        </div>
                      </div>

                      {(job.required_skills as string[] || []).length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                            Skills to Develop
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {(job.required_skills as string[]).slice(0, 5).map((skill, i) => (
                              <SkillBadge key={i} skill={skill} variant="missing" size="sm" />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Apply Button */}
                    {job.apply_url && (
                      <a 
                        href={job.apply_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 mt-4 text-sm text-primary hover:underline"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View Job Posting
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default JobsPage;
