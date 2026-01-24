import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Enhanced text extraction with better PDF parsing
async function extractTextFromPDF(pdfBytes: Uint8Array): Promise<string> {
  try {
    const text = new TextDecoder('latin1').decode(pdfBytes);
    const textContent: string[] = [];
    
    // Extract from BT/ET blocks
    const btEtRegex = /BT\s*([\s\S]*?)\s*ET/g;
    let match;
    
    while ((match = btEtRegex.exec(text)) !== null) {
      const block = match[1];
      const tjRegex = /\(([^)]*)\)\s*Tj/g;
      let tjMatch;
      while ((tjMatch = tjRegex.exec(block)) !== null) {
        textContent.push(tjMatch[1]);
      }
      
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
    
    // Extract plain text patterns (emails, skills, dates, etc.)
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phoneRegex = /[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}/g;
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
    
    const emails = text.match(emailRegex) || [];
    const phones = text.match(phoneRegex) || [];
    const urls = text.match(urlRegex) || [];
    
    // Extract readable text segments
    const plainTextRegex = /[A-Za-z][A-Za-z\s,.\-@0-9]{15,}/g;
    const plainMatches = text.match(plainTextRegex) || [];
    
    const extractedText = [
      ...textContent,
      ...emails,
      ...phones,
      ...urls,
      ...plainMatches
    ].join(' ');
    
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

// Enhanced DOCX extraction
async function extractTextFromDOCX(docxBytes: Uint8Array): Promise<string> {
  try {
    const text = new TextDecoder('utf-8', { fatal: false }).decode(docxBytes);
    const textContent: string[] = [];
    
    // Extract from w:t tags (Word text elements)
    const wtRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let match;
    while ((match = wtRegex.exec(text)) !== null) {
      if (match[1].trim()) textContent.push(match[1]);
    }
    
    // Extract from general XML tags
    const xmlTextRegex = />([^<]{3,})</g;
    while ((match = xmlTextRegex.exec(text)) !== null) {
      const content = match[1].trim();
      if (content && !/^[\s\d\-_.]+$/.test(content) && !content.startsWith('w:') && !content.includes('xmlns')) {
        textContent.push(content);
      }
    }
    
    return textContent.join(' ').replace(/\s+/g, ' ').trim();
  } catch (error) {
    console.error('DOCX extraction error:', error);
    return '';
  }
}

// Use AI for advanced NLP entity extraction
async function performNLPExtraction(rawText: string, apiKey: string): Promise<any> {
  const nlpPrompt = `Perform NLP entity extraction on this resume text. Extract structured information with high accuracy.

RESUME TEXT:
${rawText}

Extract and return JSON with these entities:
{
  "personalInfo": {
    "name": "full name if found",
    "email": "email address",
    "phone": "phone number",
    "location": "city, state/country",
    "linkedin": "linkedin url",
    "github": "github url",
    "portfolio": "portfolio/website url"
  },
  "professionalSummary": "brief career summary if present",
  "skills": {
    "technical": ["programming languages, frameworks, databases, etc."],
    "tools": ["software tools, IDEs, platforms"],
    "softSkills": ["communication, leadership, etc."],
    "certifications": ["AWS, Google, Microsoft certifications, etc."]
  },
  "experience": [
    {
      "title": "job title",
      "company": "company name",
      "location": "job location",
      "startDate": "start date",
      "endDate": "end date or Present",
      "responsibilities": ["key responsibilities/achievements"],
      "technologies": ["technologies used in this role"]
    }
  ],
  "education": [
    {
      "degree": "degree type and field",
      "institution": "school/university name",
      "graduationDate": "graduation year",
      "gpa": "GPA if mentioned",
      "achievements": ["honors, relevant coursework"]
    }
  ],
  "projects": [
    {
      "name": "project name",
      "description": "what the project does",
      "technologies": ["tech stack used"],
      "url": "project URL if available"
    }
  ],
  "languages": ["spoken languages with proficiency"],
  "rawSkillsList": ["ALL skills mentioned in any form - exhaustive list"]
}

Be thorough - extract EVERY skill, technology, and qualification mentioned. Include abbreviations and full forms.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "You are an expert NLP system for resume parsing. Extract all entities accurately. Return only valid JSON." },
        { role: "user", content: nlpPrompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`NLP extraction failed: ${response.status}`);
  }

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update status to processing
    await supabase.from("resumes").update({ status: "processing" }).eq("id", resumeId);

    // Download and extract resume text
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
        resumeText = new TextDecoder('utf-8').decode(fileBytes);
      }
      
      console.log('Extracted text length:', resumeText.length);
    }

    if (resumeText.length < 50) {
      console.log('Text extraction returned minimal content');
      resumeText = `Resume file: ${fileName}. Limited text extraction available.`;
    }

    // Truncate for context limits
    const truncatedText = resumeText.length > 12000 ? resumeText.substring(0, 12000) : resumeText;

    // Step 1: NLP Entity Extraction
    console.log('Performing NLP entity extraction...');
    let nlpData;
    try {
      nlpData = await performNLPExtraction(truncatedText, LOVABLE_API_KEY);
      console.log('NLP extraction successful');
    } catch (nlpError) {
      console.error('NLP extraction failed:', nlpError);
      nlpData = { rawSkillsList: [], skills: { technical: [], tools: [], softSkills: [] }, experience: [], education: [] };
    }

    // Combine all skills from NLP extraction
    const allSkills = [
      ...(nlpData.rawSkillsList || []),
      ...(nlpData.skills?.technical || []),
      ...(nlpData.skills?.tools || []),
      ...(nlpData.skills?.softSkills || []),
      ...(nlpData.skills?.certifications || []),
    ].filter((s, i, arr) => s && arr.indexOf(s) === i);

    console.log('Extracted skills:', allSkills.length);

    // Step 2: Comprehensive Resume Analysis
    const analysisPrompt = `Analyze this resume data and provide career guidance:

EXTRACTED NLP DATA:
${JSON.stringify(nlpData, null, 2)}

RAW RESUME TEXT (for additional context):
${truncatedText.substring(0, 4000)}

Provide JSON response:
{
  "atsScore": number (0-100, based on formatting, keywords, completeness),
  "strengths": ["3-5 resume strengths based on actual content"],
  "weaknesses": ["3-5 areas for improvement"],
  "missingKeywords": ["important keywords missing for their target roles"],
  "improvementTips": ["5 specific, actionable tips"],
  "skillGaps": [
    {
      "skillName": "missing but important skill",
      "category": "technical|soft_skills|tools_frameworks",
      "importance": "high|medium|low",
      "learningResources": ["url1", "url2"]
    }
  ],
  "interviewQuestions": [
    {
      "jobRole": "role this applies to",
      "question": "interview question",
      "category": "technical|hr|coding_scenario",
      "difficulty": "beginner|intermediate|advanced",
      "suggestedAnswer": "approach to answer"
    }
  ]
}`;

    const analysisResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an expert career coach and resume analyzer. Provide honest, helpful feedback based on actual resume content. Return only valid JSON." },
          { role: "user", content: analysisPrompt },
        ],
      }),
    });

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      console.error("AI analysis error:", analysisResponse.status, errorText);
      
      if (analysisResponse.status === 429) {
        await supabase.from("resumes").update({ status: "failed" }).eq("id", resumeId);
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error("AI analysis failed");
    }

    const analysisResult = await analysisResponse.json();
    let analysisText = analysisResult.choices?.[0]?.message?.content || "";
    analysisText = analysisText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch (e) {
      console.error("Failed to parse analysis:", analysisText);
      throw new Error("Failed to parse analysis results");
    }

    // Save resume analysis with NLP-extracted data
    await supabase.from("resume_analysis").insert({
      resume_id: resumeId,
      user_id: userId,
      ats_score: analysis.atsScore || 65,
      extracted_skills: allSkills,
      education: nlpData.education || [],
      experience: nlpData.experience || [],
      projects: nlpData.projects || [],
      certifications: nlpData.skills?.certifications || [],
      strengths: analysis.strengths || [],
      weaknesses: analysis.weaknesses || [],
      missing_keywords: analysis.missingKeywords || [],
      improvement_tips: analysis.improvementTips || [],
    });

    // Save skill gaps
    if (analysis.skillGaps?.length > 0) {
      const gapRecords = analysis.skillGaps.map((gap: any) => ({
        resume_id: resumeId,
        user_id: userId,
        skill_name: gap.skillName,
        category: gap.category || "technical",
        importance: gap.importance || "medium",
        learning_resources: gap.learningResources || [],
      }));
      await supabase.from("skill_gaps").insert(gapRecords);
    }

    // Save interview questions
    if (analysis.interviewQuestions?.length > 0) {
      const questionRecords = analysis.interviewQuestions.map((q: any) => ({
        resume_id: resumeId,
        user_id: userId,
        job_role: q.jobRole || "General",
        question: q.question,
        category: q.category || "technical",
        difficulty: q.difficulty || "intermediate",
        suggested_answer: q.suggestedAnswer || "",
      }));
      await supabase.from("interview_questions").insert(questionRecords);
    }

    // Update resume with raw text
    await supabase.from("resumes").update({ 
      raw_text: truncatedText.substring(0, 5000),
      status: "completed"
    }).eq('id', resumeId);

    // Step 3: Trigger real-time job scraping (async)
    console.log('Triggering real-time job scraping with skills:', allSkills.slice(0, 10));
    
    try {
      const scrapeResponse = await fetch(`${supabaseUrl}/functions/v1/scrape-jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          skills: allSkills.slice(0, 10),
          resumeId,
          userId,
        }),
      });
      
      if (scrapeResponse.ok) {
        const scrapeResult = await scrapeResponse.json();
        console.log('Job scraping completed:', scrapeResult.jobs?.length || 0, 'jobs found');
      } else {
        console.error('Job scraping failed:', await scrapeResponse.text());
      }
    } catch (scrapeError) {
      console.error('Job scraping error:', scrapeError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      analysis: {
        ...analysis,
        nlpData,
        extractedSkills: allSkills,
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    
    // Try to update status to failed
    try {
      const { resumeId } = await req.clone().json();
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      await supabase.from("resumes").update({ status: "failed" }).eq("id", resumeId);
    } catch {}
    
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
