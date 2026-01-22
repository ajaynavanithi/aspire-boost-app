import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { SkillBadge } from '@/components/ui/skill-badge';
import { useAuth } from '@/contexts/AuthContext';
import { getUserResumes } from '@/lib/supabase';
import { Target, Code, Users, Wrench, ExternalLink, Loader2 } from 'lucide-react';

export const SkillsPage: React.FC = () => {
  const { user } = useAuth();
  const [skillGaps, setSkillGaps] = useState<any[]>([]);
  const [extractedSkills, setExtractedSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSkills = async () => {
      if (!user) return;
      
      try {
        const data = await getUserResumes(user.id);
        const completedResume = data?.find(r => r.status === 'completed');
        if (completedResume) {
          setSkillGaps(completedResume.skill_gaps || []);
          if (completedResume.resume_analysis?.[0]) {
            setExtractedSkills(completedResume.resume_analysis[0].extracted_skills as string[] || []);
          }
        }
      } catch (error) {
        console.error('Error fetching skills:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSkills();
  }, [user]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'technical':
        return Code;
      case 'soft_skills':
        return Users;
      case 'tools_frameworks':
        return Wrench;
      default:
        return Target;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'technical':
        return 'Technical Skills';
      case 'soft_skills':
        return 'Soft Skills';
      case 'tools_frameworks':
        return 'Tools & Frameworks';
      default:
        return category;
    }
  };

  const groupedGaps = skillGaps.reduce((acc, gap) => {
    const category = gap.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(gap);
    return acc;
  }, {} as Record<string, any[]>);

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
            Skill Gap Analysis
          </h1>
          <p className="text-muted-foreground mt-1">
            Compare your skills with market requirements
          </p>
        </div>

        {/* Your Skills */}
        {extractedSkills.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-6">
            <h3 className="font-display text-xl font-semibold text-foreground mb-4">
              Your Skills ({extractedSkills.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {extractedSkills.map((skill, index) => (
                <SkillBadge key={index} skill={skill} variant="matched" />
              ))}
            </div>
          </div>
        )}

        {/* Skill Gaps by Category */}
        {Object.keys(groupedGaps).length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border border-border">
            <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-success" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground mb-2">
              Great Job!
            </h2>
            <p className="text-muted-foreground">
              No significant skill gaps identified. Keep learning to stay ahead!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <h3 className="font-display text-xl font-semibold text-foreground">
              Skills to Develop
            </h3>
            
            {Object.entries(groupedGaps).map(([category, gaps]) => {
              const Icon = getCategoryIcon(category);
              return (
                <div key={category} className="bg-card rounded-2xl border border-border p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-destructive" />
                    </div>
                    <h4 className="font-display text-lg font-semibold text-foreground">
                      {getCategoryLabel(category)}
                    </h4>
                    <span className="ml-auto bg-destructive/10 text-destructive px-2 py-0.5 rounded-full text-sm font-medium">
                      {gaps.length} gaps
                    </span>
                  </div>

                  <div className="space-y-4">
                    {gaps.map((gap, index) => (
                      <div 
                        key={gap.id || index} 
                        className="p-4 rounded-xl bg-muted/50 border border-border/50"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h5 className="font-semibold text-foreground">{gap.skill_name}</h5>
                            {gap.importance && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Importance: <span className="font-medium">{gap.importance}</span>
                              </p>
                            )}
                          </div>
                          <SkillBadge skill="Missing" variant="missing" size="sm" />
                        </div>

                        {Array.isArray(gap.learning_resources) && gap.learning_resources.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                              Learning Resources
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {(gap.learning_resources as string[]).map((resource: string, i: number) => (
                                <a
                                  key={i}
                                  href={resource}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  Resource {i + 1}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SkillsPage;
