import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ScoreCircle } from '@/components/ui/score-circle';
import { SkillBadge } from '@/components/ui/skill-badge';
import { useAuth } from '@/contexts/AuthContext';
import { getUserResumes } from '@/lib/supabase';
import { 
  CheckCircle, 
  XCircle, 
  Lightbulb, 
  GraduationCap,
  Briefcase,
  FolderKanban,
  Award,
  Loader2
} from 'lucide-react';

// Helper to safely convert any value to a displayable string
const toStr = (val: any): string => {
  if (typeof val === 'string') return val;
  if (val && typeof val === 'object') {
    return val.name || val.title || val.skill || val.keyword || val.label || val.degree || val.role || JSON.stringify(val);
  }
  return String(val ?? '');
};

export const AnalysisPage: React.FC = () => {
  const { user } = useAuth();
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalysis = async () => {
      if (!user) return;
      
      try {
        const data = await getUserResumes(user.id);
        const completedResume = data?.find(r => r.status === 'completed' && r.resume_analysis?.length > 0);
        if (completedResume) {
          setAnalysis(completedResume.resume_analysis[0]);
        }
      } catch (error) {
        console.error('Error fetching analysis:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
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

  if (!analysis) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <h2 className="font-display text-2xl font-bold text-foreground mb-3">
            No Analysis Available
          </h2>
          <p className="text-muted-foreground">
            Upload a resume to see your analysis results.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const strengths = (analysis.strengths as any[] || []).map(toStr);
  const weaknesses = (analysis.weaknesses as any[] || []).map(toStr);
  const skills = (analysis.extracted_skills as any[] || []).map(toStr);
  const education = analysis.education as any[] || [];
  const experience = analysis.experience as any[] || [];
  const projects = analysis.projects as any[] || [];
  const certifications = analysis.certifications as any[] || [];
  const missingKeywords = (analysis.missing_keywords as any[] || []).map(toStr);
  const tips = (analysis.improvement_tips as any[] || []).map(toStr);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Resume Analysis
          </h1>
          <p className="text-muted-foreground mt-1">
            Detailed breakdown of your resume's ATS compatibility
          </p>
        </div>

        {/* ATS Score Card */}
        <div className="bg-card rounded-2xl border border-border p-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <ScoreCircle score={analysis.ats_score || 0} size="lg" label="ATS Score" />
            
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                  {analysis.ats_score >= 80 
                    ? 'Excellent Resume!' 
                    : analysis.ats_score >= 60 
                      ? 'Good Resume' 
                      : 'Needs Improvement'}
                </h3>
                <p className="text-muted-foreground">
                  {analysis.ats_score >= 80 
                    ? 'Your resume is well-optimized for ATS systems.'
                    : analysis.ats_score >= 60
                      ? 'Your resume is decent but could use some improvements.'
                      : 'Consider updating your resume with the suggestions below.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Strengths & Weaknesses */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground">Strengths</h3>
            </div>
            <ul className="space-y-3">
              {strengths.map((strength, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">{strength}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-destructive" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground">Areas to Improve</h3>
            </div>
            <ul className="space-y-3">
              {weaknesses.map((weakness, index) => (
                <li key={index} className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">{weakness}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Extracted Skills */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <h3 className="font-display text-lg font-semibold text-foreground mb-4">
            Extracted Skills ({skills.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill, index) => (
              <SkillBadge key={index} skill={skill} variant="matched" />
            ))}
          </div>
        </div>

        {/* Missing Keywords */}
        {missingKeywords.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-6">
            <h3 className="font-display text-lg font-semibold text-foreground mb-4">
              Missing Keywords
            </h3>
            <div className="flex flex-wrap gap-2">
              {missingKeywords.map((keyword, index) => (
                <SkillBadge key={index} skill={keyword} variant="missing" />
              ))}
            </div>
          </div>
        )}

        {/* Education & Experience */}
        <div className="grid md:grid-cols-2 gap-6">
          {education.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">Education</h3>
              </div>
              <ul className="space-y-3">
                {education.map((edu: any, index: number) => (
                  <li key={index} className="border-l-2 border-primary/30 pl-4">
                    <p className="font-medium text-foreground">{edu.degree || edu}</p>
                    {edu.institution && (
                      <p className="text-sm text-muted-foreground">{edu.institution}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {experience.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-accent" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">Experience</h3>
              </div>
              <ul className="space-y-3">
                {experience.map((exp: any, index: number) => (
                  <li key={index} className="border-l-2 border-accent/30 pl-4">
                    <p className="font-medium text-foreground">{typeof exp === 'string' ? exp : (exp.title || exp.role || JSON.stringify(exp))}</p>
                    {exp.company && (
                      <p className="text-sm text-muted-foreground">{exp.company}{exp.duration ? ` · ${exp.duration}` : ''}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Projects & Certifications */}
        <div className="grid md:grid-cols-2 gap-6">
          {projects.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                  <FolderKanban className="w-5 h-5 text-warning" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">Projects</h3>
              </div>
              <ul className="space-y-2">
                {projects.map((project: any, index: number) => (
                  <li key={index} className="text-foreground">
                    • {typeof project === 'string' ? project : project.name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {certifications.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                  <Award className="w-5 h-5 text-success" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">Certifications</h3>
              </div>
              <ul className="space-y-2">
                {certifications.map((cert: any, index: number) => (
                  <li key={index} className="text-foreground">• {typeof cert === 'string' ? cert : (cert.title || cert.name || JSON.stringify(cert))}{typeof cert === 'object' && cert.issuer ? ` — ${cert.issuer}` : ''}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Improvement Tips */}
        {tips.length > 0 && (
          <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl border border-primary/20 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground">
                Improvement Tips
              </h3>
            </div>
            <ul className="space-y-3">
              {tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
                    {index + 1}
                  </span>
                  <span className="text-foreground">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AnalysisPage;
