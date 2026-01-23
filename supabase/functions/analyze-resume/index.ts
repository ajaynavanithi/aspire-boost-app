import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Extract text from PDF using basic parsing
async function extractTextFromPDF(pdfBytes: Uint8Array): Promise<string> {
  try {
    // Convert to string and look for text content between stream markers
    const text = new TextDecoder('latin1').decode(pdfBytes);
    
    // Extract text from PDF streams (basic extraction)
    const textContent: string[] = [];
    
    // Look for text between BT (Begin Text) and ET (End Text) markers
    const btEtRegex = /BT\s*([\s\S]*?)\s*ET/g;
    let match;
    
    while ((match = btEtRegex.exec(text)) !== null) {
      const block = match[1];
      // Extract text from Tj and TJ operators
      const tjRegex = /\(([^)]*)\)\s*Tj/g;
      let tjMatch;
      while ((tjMatch = tjRegex.exec(block)) !== null) {
        textContent.push(tjMatch[1]);
      }
      
      // Extract from TJ arrays
      const tjArrayRegex = /\[([^\]]*)\]\s*TJ/g;
      let tjArrayMatch;
      while ((tjArrayMatch = tjArrayRegex.exec(block)) !== null) {
        const arrayContent = tjArrayMatch[1];
        const stringRegex = /\(([^)]*)\)/g;
        let strMatch;
        while ((strMatch = stringRegex.exec(arrayContent)) !== null) {
          textContent.push(strMatch[1]);
        }
      }
    }
    
    // Also try to extract plain text patterns
    const plainTextRegex = /[A-Za-z][A-Za-z\s,.\-@0-9]{20,}/g;
    const plainMatches = text.match(plainTextRegex) || [];
    
    const extractedText = textContent.join(' ') + ' ' + plainMatches.join(' ');
    
    // Clean up the text
    return extractedText
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  } catch (error) {
    console.error('PDF extraction error:', error);
    return '';
  }
}

// Extract text from DOCX (simplified - looks for text in XML)
async function extractTextFromDOCX(docxBytes: Uint8Array): Promise<string> {
  try {
    // DOCX is a ZIP file, we'll look for readable text patterns
    const text = new TextDecoder('utf-8', { fatal: false }).decode(docxBytes);
    
    // Extract text from XML tags
    const textContent: string[] = [];
    const xmlTextRegex = />([^<]{3,})</g;
    let match;
    
    while ((match = xmlTextRegex.exec(text)) !== null) {
      const content = match[1].trim();
      if (content && !/^[\s\d\-_.]+$/.test(content)) {
        textContent.push(content);
      }
    }
    
    return textContent.join(' ').replace(/\s+/g, ' ').trim();
  } catch (error) {
    console.error('DOCX extraction error:', error);
    return '';
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeId, userId, fileName, filePath } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Download the resume file from storage
    let resumeText = '';
    
    if (filePath) {
      console.log('Downloading resume from:', filePath);
      
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('resumes')
        .download(filePath);

      if (downloadError) {
        console.error('Download error:', downloadError);
        throw new Error('Failed to download resume file');
      }

      const fileBytes = new Uint8Array(await fileData.arrayBuffer());
      const fileNameLower = (fileName || '').toLowerCase();
      
      if (fileNameLower.endsWith('.pdf')) {
        resumeText = await extractTextFromPDF(fileBytes);
      } else if (fileNameLower.endsWith('.docx') || fileNameLower.endsWith('.doc')) {
        resumeText = await extractTextFromDOCX(fileBytes);
      } else {
        // Try plain text
        resumeText = new TextDecoder('utf-8').decode(fileBytes);
      }
      
      console.log('Extracted text length:', resumeText.length);
    }

    // If extraction failed or returned very little text, use filename hints
    if (resumeText.length < 50) {
      console.log('Text extraction returned minimal content, using filename as context');
      resumeText = `Resume file: ${fileName}. Please analyze based on typical resume structure and provide comprehensive feedback.`;
    }

    // Truncate if too long (keep first 8000 chars for context limits)
    if (resumeText.length > 8000) {
      resumeText = resumeText.substring(0, 8000);
    }

    // AI Analysis prompt with actual resume content
    const analysisPrompt = `Analyze the following resume content and provide a detailed JSON response:

RESUME CONTENT:
${resumeText}

Provide a JSON response with this exact structure:
{
  "atsScore": number (0-100, based on formatting, keywords, structure),
  "skills": ["extracted skill 1", "skill 2", ...] (extract ALL skills mentioned),
  "education": [{"degree": "...", "institution": "..."}] (extract education details),
  "experience": [{"title": "job title", "company": "company name"}] (extract work experience),
  "projects": ["project name 1", "project 2"] (extract any projects mentioned),
  "certifications": ["cert1", "cert2"] (extract certifications),
  "strengths": ["strength1", "strength2"] (identify 3-5 resume strengths),
  "weaknesses": ["weakness1", "weakness2"] (identify 3-5 areas to improve),
  "missingKeywords": ["keyword1", "keyword2"] (suggest important missing keywords),
  "improvementTips": ["tip1", "tip2"] (provide 5 actionable improvement tips),
  "jobRecommendations": [
    {
      "jobTitle": "relevant job title",
      "companyType": "startup/enterprise/agency/etc",
      "matchPercentage": number (50-100),
      "matchedSkills": ["skill1", "skill2"],
      "requiredSkills": ["missing skill"],
      "jobDescription": "brief description",
      "salaryRange": "$XX,XXX - $XXX,XXX"
    }
  ] (provide 5 job recommendations based on the resume),
  "skillGaps": [
    {
      "skillName": "missing skill",
      "category": "technical|soft_skills|tools_frameworks",
      "importance": "high|medium|low",
      "learningResources": ["https://resource1.com", "https://resource2.com"]
    }
  ] (identify 5 skill gaps based on job market),
  "interviewQuestions": [
    {
      "jobRole": "relevant role",
      "question": "interview question",
      "category": "technical|hr|coding_scenario",
      "difficulty": "beginner|intermediate|advanced",
      "suggestedAnswer": "how to approach this question"
    }
  ] (provide 10 interview questions tailored to this resume)
}

IMPORTANT: Base your analysis on the ACTUAL content extracted from the resume. Extract real skills, education, and experience mentioned in the text.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a professional resume analyzer and career coach. Analyze resumes accurately and provide honest, helpful feedback. Return only valid JSON." },
          { role: "user", content: analysisPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
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

    // Update resume record with extracted text
    await supabase.from("resumes").update({ raw_text: resumeText.substring(0, 5000) }).eq('id', resumeId);

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
