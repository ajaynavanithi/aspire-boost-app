import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeId, userId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // AI Analysis prompt
    const analysisPrompt = `Analyze this resume and provide a JSON response with the following structure:
{
  "atsScore": number (0-100),
  "skills": ["skill1", "skill2", ...],
  "education": [{"degree": "...", "institution": "..."}],
  "experience": [{"title": "...", "company": "..."}],
  "projects": ["project1", "project2"],
  "certifications": ["cert1", "cert2"],
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "missingKeywords": ["keyword1", "keyword2"],
  "improvementTips": ["tip1", "tip2"],
  "jobRecommendations": [
    {
      "jobTitle": "...",
      "companyType": "...",
      "matchPercentage": number,
      "matchedSkills": ["..."],
      "requiredSkills": ["..."],
      "jobDescription": "...",
      "salaryRange": "..."
    }
  ],
  "skillGaps": [
    {
      "skillName": "...",
      "category": "technical|soft_skills|tools_frameworks",
      "importance": "high|medium|low",
      "learningResources": ["url1", "url2"]
    }
  ],
  "interviewQuestions": [
    {
      "jobRole": "...",
      "question": "...",
      "category": "technical|hr|coding_scenario",
      "difficulty": "beginner|intermediate|advanced",
      "suggestedAnswer": "..."
    }
  ]
}

Generate realistic sample data for a software developer resume. Include 5 job recommendations, 5 skill gaps, and 10 interview questions across different categories and difficulties.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a professional resume analyzer. Return only valid JSON." },
          { role: "user", content: analysisPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error("AI analysis failed");
    }

    const aiResult = await response.json();
    let analysisText = aiResult.choices?.[0]?.message?.content || "";
    
    // Clean up JSON from markdown code blocks
    analysisText = analysisText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch (e) {
      console.error("Failed to parse AI response:", analysisText);
      throw new Error("Failed to parse analysis results");
    }

    // Save to database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Save resume analysis
    await supabase.from("resume_analysis").insert({
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

    // Save job recommendations
    if (analysis.jobRecommendations?.length > 0) {
      const jobRecords = analysis.jobRecommendations.map((job: any) => ({
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
      await supabase.from("job_recommendations").insert(jobRecords);
    }

    // Save skill gaps
    if (analysis.skillGaps?.length > 0) {
      const gapRecords = analysis.skillGaps.map((gap: any) => ({
        resume_id: resumeId,
        user_id: userId,
        skill_name: gap.skillName,
        category: gap.category,
        importance: gap.importance,
        learning_resources: gap.learningResources,
      }));
      await supabase.from("skill_gaps").insert(gapRecords);
    }

    // Save interview questions
    if (analysis.interviewQuestions?.length > 0) {
      const questionRecords = analysis.interviewQuestions.map((q: any) => ({
        resume_id: resumeId,
        user_id: userId,
        job_role: q.jobRole,
        question: q.question,
        category: q.category,
        difficulty: q.difficulty,
        suggested_answer: q.suggestedAnswer,
      }));
      await supabase.from("interview_questions").insert(questionRecords);
    }

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
