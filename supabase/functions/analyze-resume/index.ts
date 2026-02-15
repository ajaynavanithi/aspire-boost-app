import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { neon } from "https://esm.sh/@neondatabase/serverless@0.9.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Use AI to extract text from document bytes
async function extractTextWithAI(fileBytes: Uint8Array, fileName: string, apiKey: string): Promise<string> {
  try {
    if (fileName.toLowerCase().endsWith('.txt')) {
      const text = new TextDecoder('utf-8').decode(fileBytes);
      return text.trim();
    }

    let binaryString = '';
    const chunkSize = 8192;
    for (let i = 0; i < fileBytes.length; i += chunkSize) {
      const chunk = fileBytes.slice(i, i + chunkSize);
      binaryString += String.fromCharCode(...chunk);
    }
    const base64Data = btoa(binaryString);
    const mimeType = fileName.toLowerCase().endsWith('.pdf') 
      ? 'application/pdf' 
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    const extractionPrompt = `Extract ALL text content from this document. Return ONLY the extracted text, no formatting or JSON.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "user", content: [
            { type: "text", text: extractionPrompt },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}` } }
          ]},
        ],
      }),
    });

    if (!response.ok) return fallbackTextExtraction(fileBytes, fileName);
    const result = await response.json();
    return (result.choices?.[0]?.message?.content || '').trim();
  } catch (error) {
    return fallbackTextExtraction(fileBytes, fileName);
  }
}

function fallbackTextExtraction(fileBytes: Uint8Array, fileName: string): string {
  try {
    const text = new TextDecoder('utf-8', { fatal: false }).decode(fileBytes);
    const parts: string[] = [];
    const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    parts.push(...emails);
    const phones = text.match(/[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[0-9]{3,4}[-\s\.]?[0-9]{4,6}/g) || [];
    parts.push(...phones);
    if (fileName.toLowerCase().includes('.docx')) {
      const wt = text.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || [];
      wt.forEach(m => { const c = m.replace(/<[^>]+>/g, '').trim(); if (c.length > 2) parts.push(c); });
    }
    const readable = text.match(/[A-Za-z][A-Za-z\s,.\-'@0-9]{10,100}/g) || [];
    parts.push(...readable);
    return [...new Set(parts)].join(' ').replace(/\s+/g, ' ').trim();
  } catch { return ''; }
}

async function performNLPExtraction(rawText: string, apiKey: string): Promise<any> {
  const nlpPrompt = `Perform NLP entity extraction on this resume text. Extract structured information.

RESUME TEXT:
${rawText}

Return JSON with: personalInfo, professionalSummary, skills (technical, tools, softSkills, certifications), experience[], education[], projects[], languages[], rawSkillsList[]`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "Expert NLP resume parser. Return only valid JSON." },
        { role: "user", content: nlpPrompt },
      ],
    }),
  });

  if (!response.ok) throw new Error(`NLP extraction failed: ${response.status}`);
  const result = await response.json();
  let text = result.choices?.[0]?.message?.content || "{}";
  text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(text);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeId, userId, fileName, filePath } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const NEON_DATABASE_URL = Deno.env.get("NEON_DATABASE_URL");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!NEON_DATABASE_URL) throw new Error("NEON_DATABASE_URL is not configured");

    const sql = neon(NEON_DATABASE_URL);
    // Supabase client only for storage access
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Update status to processing in Neon
    await sql`UPDATE resumes SET status = 'processing'::analysis_status WHERE id = ${resumeId}::uuid`;

    // Download resume from storage
    let resumeText = '';
    if (filePath) {
      const { data: signedData, error: signedError } = await supabase.storage
        .from('resumes')
        .createSignedUrl(filePath, 60);
      if (signedError) throw new Error('Failed to create signed URL');

      const fileResponse = await fetch(signedData.signedUrl);
      if (!fileResponse.ok) throw new Error('Failed to download resume file');

      const fileBytes = new Uint8Array(await fileResponse.arrayBuffer());
      resumeText = await extractTextWithAI(fileBytes, fileName || 'resume.pdf', LOVABLE_API_KEY);
    }

    if (resumeText.length < 50) {
      resumeText = `Resume file: ${fileName}. Limited text extraction available.`;
    }

    const truncatedText = resumeText.length > 12000 ? resumeText.substring(0, 12000) : resumeText;

    // NLP Extraction
    let nlpData;
    try {
      nlpData = await performNLPExtraction(truncatedText, LOVABLE_API_KEY);
    } catch {
      nlpData = { rawSkillsList: [], skills: { technical: [], tools: [], softSkills: [] }, experience: [], education: [] };
    }

    const allSkills = [
      ...(nlpData.rawSkillsList || []),
      ...(nlpData.skills?.technical || []),
      ...(nlpData.skills?.tools || []),
      ...(nlpData.skills?.softSkills || []),
      ...(nlpData.skills?.certifications || []),
    ].filter((s: string, i: number, arr: string[]) => s && arr.indexOf(s) === i);

    // AI Analysis
    const analysisPrompt = `Analyze this resume and provide JSON with: atsScore (0-100), strengths[], weaknesses[], missingKeywords[], improvementTips[], skillGaps[{skillName, category(technical|soft_skills|tools_frameworks), importance, learningResources[]}], interviewQuestions[{jobRole, question, category(technical|hr|coding_scenario), difficulty(beginner|intermediate|advanced), suggestedAnswer}] - generate 15-20 questions.

NLP DATA: ${JSON.stringify(nlpData, null, 2)}
RESUME TEXT: ${truncatedText.substring(0, 4000)}`;

    const analysisResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Expert career coach. Return only valid JSON." },
          { role: "user", content: analysisPrompt },
        ],
      }),
    });

    if (!analysisResponse.ok) {
      if (analysisResponse.status === 429) {
        await sql`UPDATE resumes SET status = 'failed'::analysis_status WHERE id = ${resumeId}::uuid`;
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI analysis failed");
    }

    const analysisResult = await analysisResponse.json();
    let analysisText = analysisResult.choices?.[0]?.message?.content || "";
    analysisText = analysisText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const analysis = JSON.parse(analysisText);

    // Save to Neon
    await sql`INSERT INTO resume_analysis (resume_id, user_id, ats_score, extracted_skills, education, experience, projects, certifications, strengths, weaknesses, missing_keywords, improvement_tips)
      VALUES (${resumeId}::uuid, ${userId}, ${analysis.atsScore || 65}, ${JSON.stringify(allSkills)}, ${JSON.stringify(nlpData.education || [])}, ${JSON.stringify(nlpData.experience || [])}, ${JSON.stringify(nlpData.projects || [])}, ${JSON.stringify(nlpData.skills?.certifications || [])}, ${JSON.stringify(analysis.strengths || [])}, ${JSON.stringify(analysis.weaknesses || [])}, ${JSON.stringify(analysis.missingKeywords || [])}, ${JSON.stringify(analysis.improvementTips || [])})`;

    // Save skill gaps
    if (analysis.skillGaps?.length > 0) {
      for (const gap of analysis.skillGaps) {
        await sql`INSERT INTO skill_gaps (resume_id, user_id, skill_name, category, importance, learning_resources)
          VALUES (${resumeId}::uuid, ${userId}, ${gap.skillName}, ${gap.category || 'technical'}::skill_category, ${gap.importance || 'medium'}, ${JSON.stringify(gap.learningResources || [])})`;
      }
    }

    // Save interview questions
    if (analysis.interviewQuestions?.length > 0) {
      for (const q of analysis.interviewQuestions) {
        await sql`INSERT INTO interview_questions (resume_id, user_id, job_role, question, category, difficulty, suggested_answer)
          VALUES (${resumeId}::uuid, ${userId}, ${q.jobRole || 'General'}, ${q.question}, ${q.category || 'technical'}::question_category, ${q.difficulty || 'intermediate'}::question_difficulty, ${q.suggestedAnswer || ''})`;
      }
    }

    // Update resume with raw text
    await sql`UPDATE resumes SET raw_text = ${truncatedText.substring(0, 5000)}, status = 'completed'::analysis_status WHERE id = ${resumeId}::uuid`;

    // Trigger job scraping
    try {
      const scrapeResponse = await fetch(`${supabaseUrl}/functions/v1/scrape-jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
        body: JSON.stringify({ skills: allSkills.slice(0, 10), resumeId, userId }),
      });
      if (scrapeResponse.ok) {
        const r = await scrapeResponse.json();
        console.log('Job scraping completed:', r.jobs?.length || 0);
      }
    } catch (e) {
      console.error('Job scraping error:', e);
    }

    return new Response(JSON.stringify({ success: true, analysis: { ...analysis, nlpData, extractedSkills: allSkills } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error:", error);
    try {
      const NEON_DATABASE_URL = Deno.env.get("NEON_DATABASE_URL");
      if (NEON_DATABASE_URL) {
        const sql = neon(NEON_DATABASE_URL);
        const { resumeId } = await req.clone().json();
        if (resumeId) await sql`UPDATE resumes SET status = 'failed'::analysis_status WHERE id = ${resumeId}::uuid`;
      }
    } catch {}
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
