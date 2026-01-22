import { supabase } from "@/integrations/supabase/client";

export { supabase };

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

export const createResumeRecord = async (userId: string, fileName: string, fileUrl: string) => {
  const { data, error } = await supabase
    .from('resumes')
    .insert({
      user_id: userId,
      file_name: fileName,
      file_url: fileUrl,
      status: 'pending'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateResumeStatus = async (resumeId: string, status: string, rawText?: string) => {
  const { error } = await supabase
    .from('resumes')
    .update({ 
      status: status as any,
      raw_text: rawText,
      updated_at: new Date().toISOString()
    })
    .eq('id', resumeId);

  if (error) throw error;
};

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
  const { data, error } = await supabase
    .from('resume_analysis')
    .insert({
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
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

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
  const jobRecords = jobs.map(job => ({
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

  const { error } = await supabase
    .from('job_recommendations')
    .insert(jobRecords);

  if (error) throw error;
};

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
  const gapRecords = gaps.map(gap => ({
    resume_id: resumeId,
    user_id: userId,
    skill_name: gap.skillName,
    category: gap.category,
    importance: gap.importance,
    learning_resources: gap.learningResources,
  }));

  const { error } = await supabase
    .from('skill_gaps')
    .insert(gapRecords);

  if (error) throw error;
};

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
  const questionRecords = questions.map(q => ({
    resume_id: resumeId,
    user_id: userId,
    job_role: q.jobRole,
    question: q.question,
    category: q.category,
    difficulty: q.difficulty,
    suggested_answer: q.suggestedAnswer,
  }));

  const { error } = await supabase
    .from('interview_questions')
    .insert(questionRecords);

  if (error) throw error;
};

export const getUserResumes = async (userId: string) => {
  const { data, error } = await supabase
    .from('resumes')
    .select(`
      *,
      resume_analysis (*),
      job_recommendations (*),
      skill_gaps (*),
      interview_questions (*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const getResumeById = async (resumeId: string) => {
  const { data, error } = await supabase
    .from('resumes')
    .select(`
      *,
      resume_analysis (*),
      job_recommendations (*),
      skill_gaps (*),
      interview_questions (*)
    `)
    .eq('id', resumeId)
    .maybeSingle();

  if (error) throw error;
  return data;
};
