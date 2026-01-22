import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProgressBar } from '@/components/ui/progress-bar';
import { SkillBadge } from '@/components/ui/skill-badge';
import { useAuth } from '@/contexts/AuthContext';
import { getUserResumes } from '@/lib/supabase';
import { Briefcase, MapPin, DollarSign, Loader2 } from 'lucide-react';

export const JobsPage: React.FC = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      if (!user) return;
      
      try {
        const data = await getUserResumes(user.id);
        const completedResume = data?.find(r => r.status === 'completed');
        if (completedResume) {
          setJobs(completedResume.job_recommendations || []);
        }
      } catch (error) {
        console.error('Error fetching jobs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
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

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Job Recommendations
          </h1>
          <p className="text-muted-foreground mt-1">
            Personalized job matches based on your resume skills
          </p>
        </div>

        {jobs.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border border-border">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-8 h-8 text-primary" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground mb-2">
              No Job Recommendations Yet
            </h2>
            <p className="text-muted-foreground">
              Upload a resume to get personalized job recommendations.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
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

                    {/* Description */}
                    {job.job_description && (
                      <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                        {job.job_description}
                      </p>
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
                            Required Skills
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {(job.required_skills as string[]).slice(0, 5).map((skill, i) => (
                              <SkillBadge key={i} skill={skill} variant="neutral" size="sm" />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
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
