import { supabase } from "@/integrations/supabase/client";

export { supabase };

// Helper to call the Neon DB edge function
const neonDb = async (action: string, params: Record<string, any>) => {
  const { data, error } = await supabase.functions.invoke('neon-db', {
    body: { action, params }
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data?.data;
};

// ===== Storage (still uses Lovable Cloud storage) =====
export const uploadResume = async (file: File, userId: string) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from('resumes')
    .upload(fileName, file);

  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from('resumes')
    .getPublicUrl(fileName);

  return { path: data.path, url: publicUrl };
};

// ===== Resumes (Neon) =====
export const createResumeRecord = async (userId: string, fileName: string, fileUrl: string) => {
  const result = await neonDb('create_resume', {
    user_id: userId,
    file_name: fileName,
    file_url: fileUrl,
  });
  return result[0];
};

export const updateResumeStatus = async (resumeId: string, status: string, rawText?: string) => {
  await neonDb('update_resume_status', { id: resumeId, status, raw_text: rawText });
};

// ===== Analysis (Neon) =====
export const saveResumeAnalysis = async (
  resumeId: string,
  userId: string,
  analysis: {
    atsScore: number;
    skills: string[];
    education: any[];
    experience: any[];
    projects: any[];
    certifications: string[];
    strengths: string[];
    weaknesses: string[];
    missingKeywords: string[];
    improvementTips: string[];
  }
) => {
  const result = await neonDb('save_analysis', {
    resume_id: resumeId,
    user_id: userId,
    ats_score: analysis.atsScore,
    extracted_skills: analysis.skills,
    education: analysis.education,
    experience: analysis.experience,
    projects: analysis.projects,
    certifications: analysis.certifications,
    strengths: analysis.strengths,
    weaknesses: analysis.weaknesses,
    missing_keywords: analysis.missingKeywords,
    improvement_tips: analysis.improvementTips,
  });
  return result[0];
};

// ===== Job Recommendations (Neon) =====
export const saveJobRecommendations = async (
  resumeId: string,
  userId: string,
  jobs: Array<{
    jobTitle: string;
    companyType: string;
    matchPercentage: number;
    matchedSkills: string[];
    requiredSkills: string[];
    jobDescription: string;
    salaryRange: string;
  }>
) => {
  const records = jobs.map(job => ({
    resume_id: resumeId,
    user_id: userId,
    job_title: job.jobTitle,
    company_type: job.companyType,
    match_percentage: job.matchPercentage,
    matched_skills: job.matchedSkills,
    required_skills: job.requiredSkills,
    job_description: job.jobDescription,
    salary_range: job.salaryRange,
  }));
  await neonDb('save_job_recommendations', { records });
};

// ===== Skill Gaps (Neon) =====
export const saveSkillGaps = async (
  resumeId: string,
  userId: string,
  gaps: Array<{
    skillName: string;
    category: 'technical' | 'soft_skills' | 'tools_frameworks';
    importance: string;
    learningResources: string[];
  }>
) => {
  const records = gaps.map(gap => ({
    resume_id: resumeId,
    user_id: userId,
    skill_name: gap.skillName,
    category: gap.category,
    importance: gap.importance,
    learning_resources: gap.learningResources,
  }));
  await neonDb('save_skill_gaps', { records });
};

// ===== Interview Questions (Neon) =====
export const saveInterviewQuestions = async (
  resumeId: string,
  userId: string,
  questions: Array<{
    jobRole: string;
    question: string;
    category: 'technical' | 'hr' | 'coding_scenario';
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    suggestedAnswer: string;
  }>
) => {
  const records = questions.map(q => ({
    resume_id: resumeId,
    user_id: userId,
    job_role: q.jobRole,
    question: q.question,
    category: q.category,
    difficulty: q.difficulty,
    suggested_answer: q.suggestedAnswer,
  }));
  await neonDb('save_interview_questions', { records });
};

// ===== Queries (Neon) =====
export const getUserResumes = async (userId: string) => {
  return await neonDb('get_user_resumes', { user_id: userId });
};

export const getResumeById = async (resumeId: string) => {
  return await neonDb('get_resume_by_id', { id: resumeId });
};

// ===== Job Scraping =====
export const refreshJobRecommendations = async (resumeId: string, userId: string, skills: string[]) => {
  const { data, error } = await supabase.functions.invoke('scrape-jobs', {
    body: { skills, resumeId, userId }
  });
  if (error) throw error;
  return data;
};

// Subscribe to job updates - polls Neon instead of realtime
export const subscribeToJobUpdates = (
  resumeId: string, 
  callback: (jobs: any[]) => void
) => {
  // Poll every 5 seconds since Neon doesn't have realtime
  const interval = setInterval(async () => {
    try {
      const resume = await neonDb('get_resume_by_id', { id: resumeId });
      if (resume?.job_recommendations) {
        callback(resume.job_recommendations);
      }
    } catch (e) {
      console.error('Poll error:', e);
    }
  }, 5000);

  return () => clearInterval(interval);
};

// ===== Profile (Neon) =====
export const upsertProfile = async (userId: string, email: string, fullName: string) => {
  return await neonDb('upsert_profile', { user_id: userId, email, full_name: fullName });
};
