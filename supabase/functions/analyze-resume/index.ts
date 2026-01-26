import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Use AI to extract text from document bytes
async function extractTextWithAI(fileBytes: Uint8Array, fileName: string, apiKey: string): Promise<string> {
  try {
    // Check if it's a plain text file - read directly
    if (fileName.toLowerCase().endsWith('.txt')) {
      console.log('Processing plain text file directly');
      const text = new TextDecoder('utf-8').decode(fileBytes);
      console.log('Plain text extracted, length:', text.length);
      return text.trim();
    }

    // Convert bytes to base64 in chunks to avoid stack overflow with large files
    let binaryString = '';
    const chunkSize = 8192; // Process 8KB at a time
    for (let i = 0; i < fileBytes.length; i += chunkSize) {
      const chunk = fileBytes.slice(i, i + chunkSize);
      binaryString += String.fromCharCode(...chunk);
    }
    const base64Data = btoa(binaryString);
    const mimeType = fileName.toLowerCase().endsWith('.pdf') 
      ? 'application/pdf' 
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    console.log('Using AI for document text extraction, size:', fileBytes.length);

    // Use Gemini's document understanding capabilities
    const extractionPrompt = `Extract ALL text content from this document. 
Return the complete text exactly as it appears, preserving:
- All names, emails, phone numbers, and URLs
- All job titles, company names, and dates
- All skills, technologies, and certifications
- All education details and degrees
- All project names and descriptions

Return ONLY the extracted text, no formatting or JSON.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "user", 
            content: [
              { type: "text", text: extractionPrompt },
              { 
                type: "image_url", 
                image_url: { 
                  url: `data:${mimeType};base64,${base64Data}` 
                } 
              }
            ]
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error('AI text extraction failed:', response.status);
      return fallbackTextExtraction(fileBytes, fileName);
    }

    const result = await response.json();
    const extractedText = result.choices?.[0]?.message?.content || '';
    
    console.log('AI extracted text length:', extractedText.length);
    return extractedText.trim();
  } catch (error) {
    console.error('AI extraction error:', error);
    return fallbackTextExtraction(fileBytes, fileName);
  }
}

// Fallback extraction for when AI fails
function fallbackTextExtraction(fileBytes: Uint8Array, fileName: string): string {
  try {
    const text = new TextDecoder('utf-8', { fatal: false }).decode(fileBytes);
    const extractedParts: string[] = [];
    
    // Extract emails
    const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    extractedParts.push(...emails);
    
    // Extract phone numbers
    const phones = text.match(/[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[0-9]{3,4}[-\s\.]?[0-9]{4,6}/g) || [];
    extractedParts.push(...phones);
    
    // Extract URLs
    const urls = text.match(/https?:\/\/[^\s<>"{}|\\^`\[\]]+/g) || [];
    extractedParts.push(...urls);
    
    // For DOCX, extract from XML tags
    if (fileName.toLowerCase().includes('.docx')) {
      const wtMatches = text.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || [];
      wtMatches.forEach(m => {
        const content = m.replace(/<[^>]+>/g, '').trim();
        if (content.length > 2) extractedParts.push(content);
      });
    }
    
    // Extract readable text segments
    const readableText = text.match(/[A-Za-z][A-Za-z\s,.\-'@0-9]{10,100}/g) || [];
    extractedParts.push(...readableText);
    
    return [...new Set(extractedParts)].join(' ').replace(/\s+/g, ' ').trim();
  } catch (error) {
    console.error('Fallback extraction error:', error);
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

    // Create admin client with service role key (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Update status to processing
    await supabase.from("resumes").update({ status: "processing" }).eq("id", resumeId);

    // Download and extract resume text
    let resumeText = '';
    
    if (filePath) {
      console.log('Downloading resume from bucket path:', filePath);
      
      // Use createSignedUrl for private bucket access with service role
      const { data: signedData, error: signedError } = await supabase.storage
        .from('resumes')
        .createSignedUrl(filePath, 60); // 60 seconds expiry

      if (signedError) {
        console.error('Signed URL error:', signedError);
        throw new Error('Failed to create signed URL for resume file');
      }

      console.log('Fetching from signed URL');
      
      const fileResponse = await fetch(signedData.signedUrl);
      if (!fileResponse.ok) {
        console.error('File fetch failed:', fileResponse.status, fileResponse.statusText);
        throw new Error('Failed to download resume file');
      }

      const fileBytes = new Uint8Array(await fileResponse.arrayBuffer());
      // Use AI-powered text extraction for accurate results
      resumeText = await extractTextWithAI(fileBytes, fileName || 'resume.pdf', LOVABLE_API_KEY);
      
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
      "suggestedAnswer": "detailed approach with example talking points"
    }
  ]
}

CRITICAL INSTRUCTIONS FOR INTERVIEW QUESTIONS:
- Generate AT LEAST 15-20 interview questions total
- Make questions HIGHLY SPECIFIC to the candidate's actual skills, projects, and experience mentioned in the resume
- Include questions about their SPECIFIC projects (e.g., "Tell me about your ${nlpData.projects?.[0]?.name || 'project'} - what challenges did you face?")
- Include questions about their SPECIFIC technologies (e.g., if they know Python, ask about Python-specific concepts)
- Include questions about their SPECIFIC experience (e.g., ask about their internship/job role responsibilities)

Question distribution:
- 5-6 Technical questions (specific to their tech stack: ${allSkills.slice(0, 5).join(', ')})
- 4-5 HR/Behavioral questions (about teamwork, challenges, career goals)
- 4-5 Coding/Scenario questions (real-world problems using their skills)
- 3-4 Project-based questions (about their actual projects mentioned)

Difficulty distribution:
- 5 beginner questions (fundamentals of their skills)
- 8-10 intermediate questions (practical application)
- 3-5 advanced questions (deep concepts, optimization, architecture)

Make suggested answers comprehensive (3-4 sentences with specific talking points).`;

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
