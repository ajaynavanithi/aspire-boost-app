import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface JobResult {
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  salary?: string;
  matchedSkills: string[];
  matchPercentage: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { skills, resumeId, userId } = await req.json();
    
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!FIRECRAWL_API_KEY) {
      throw new Error("FIRECRAWL_API_KEY is not configured");
    }
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!skills || skills.length === 0) {
      throw new Error("No skills provided for job search");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create search queries from top skills - India focused
    const topSkills = skills.slice(0, 5).join(" ");
    const searchQueries = [
      `${topSkills} jobs India Bangalore Mumbai Delhi`,
      `${skills[0]} developer jobs India 2024`,
      `${skills.slice(0, 3).join(" ")} engineer India remote`,
      `${topSkills} jobs Hyderabad Chennai Pune`,
    ];

    console.log("Searching for India jobs with skills:", topSkills);

    const allJobResults: JobResult[] = [];

    // Search multiple job sources using Firecrawl - India focused
    for (const query of searchQueries) {
      try {
        console.log("Searching:", query);
        
        const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: query + " site:linkedin.com/jobs OR site:indeed.co.in OR site:naukri.com OR site:glassdoor.co.in",
            limit: 5,
            country: "IN",
            scrapeOptions: {
              formats: ["markdown"],
            },
          }),
        });

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          console.log("Search results:", searchData.data?.length || 0);
          
          if (searchData.data && Array.isArray(searchData.data)) {
            for (const result of searchData.data) {
              // Calculate match percentage based on skill overlap
              const matchedSkills = skills.filter((skill: string) => 
                (result.markdown || result.description || "").toLowerCase().includes(skill.toLowerCase())
              );
              const matchPercentage = Math.min(95, Math.round((matchedSkills.length / skills.length) * 100) + 40);

              // Keep full description (up to 2000 chars for database)
              const fullDescription = (result.markdown || result.description || "").substring(0, 2000);

              allJobResults.push({
                title: result.title || "Job Opening",
                company: extractCompany(result.url || result.title || ""),
                location: extractIndiaLocation(result.markdown || result.description || ""),
                description: fullDescription,
                url: result.url || "",
                matchedSkills: matchedSkills.slice(0, 5),
                matchPercentage,
              });
            }
          }
        }
      } catch (error) {
        console.error("Search error for query:", query, error);
      }
    }

    // Remove duplicates and sort by match
    const uniqueJobs = removeDuplicates(allJobResults);
    const sortedJobs = uniqueJobs.sort((a, b) => b.matchPercentage - a.matchPercentage).slice(0, 10);

    console.log("Found unique jobs:", sortedJobs.length);

    // Use AI to enhance job recommendations with better matching
    if (sortedJobs.length > 0) {
      const enhancePrompt = `Given these job search results and the candidate's skills, enhance and structure the job recommendations:

CANDIDATE SKILLS: ${skills.join(", ")}

RAW JOB RESULTS:
${JSON.stringify(sortedJobs, null, 2)}

Return a JSON array with enhanced job recommendations FOR INDIA. For each job:
1. Clean up the job title
2. Extract or estimate the company name
3. Calculate an accurate match percentage based on skill overlap
4. Identify which candidate skills match the job
5. Identify required skills the candidate is missing
6. Provide a DETAILED and COMPLETE job description (at least 200 words covering responsibilities, requirements, and benefits)
7. Estimate salary range in INR (Indian Rupees) based on role and Indian market data
8. Location MUST be in India (city name like Bangalore, Mumbai, Delhi, Hyderabad, etc.)

Return format:
[
  {
    "jobTitle": "clean job title",
    "companyType": "startup/enterprise/agency/tech company",
    "companyName": "company name if known",
    "location": "City, India",
    "matchPercentage": number (50-95),
    "matchedSkills": ["skill1", "skill2"],
    "requiredSkills": ["missing skill1"],
    "jobDescription": "DETAILED job description with responsibilities, requirements, qualifications, and benefits - at least 200 words",
    "salaryRange": "₹XX,XX,XXX - ₹XX,XX,XXX per annum",
    "applyUrl": "job url"
  }
]`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You are a job matching expert. Enhance job listings with accurate skill matching. Return only valid JSON array." },
            { role: "user", content: enhancePrompt },
          ],
        }),
      });

      if (aiResponse.ok) {
        const aiResult = await aiResponse.json();
        let enhancedText = aiResult.choices?.[0]?.message?.content || "";
        enhancedText = enhancedText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        
        try {
          const enhancedJobs = JSON.parse(enhancedText);
          
          // Save to database if resumeId provided
          if (resumeId && userId && Array.isArray(enhancedJobs)) {
            // First delete any existing AI-generated recommendations
            await supabase
              .from("job_recommendations")
              .delete()
              .eq("resume_id", resumeId)
              .eq("user_id", userId);

            // Insert new scraped jobs
            const jobRecords = enhancedJobs.map((job: any) => ({
              resume_id: resumeId,
              user_id: userId,
              job_title: job.jobTitle || "Unknown Position",
              company_type: job.companyType || job.companyName || "Company",
              match_percentage: job.matchPercentage || 70,
              matched_skills: job.matchedSkills || [],
              required_skills: job.requiredSkills || [],
              job_description: job.jobDescription || "",
              salary_range: job.salaryRange || "Competitive",
            }));

            const { error: insertError } = await supabase
              .from("job_recommendations")
              .insert(jobRecords);

            if (insertError) {
              console.error("Insert error:", insertError);
            }
          }

          return new Response(JSON.stringify({ success: true, jobs: enhancedJobs }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (parseError) {
          console.error("Failed to parse enhanced jobs:", parseError);
        }
      }
    }

    // Fallback: return basic scraped results
    return new Response(JSON.stringify({ success: true, jobs: sortedJobs }), {
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

function extractCompany(text: string): string {
  // Try to extract company from LinkedIn/Indeed/Naukri URLs or text
  const linkedinMatch = text.match(/linkedin\.com\/company\/([^\/\?]+)/i);
  if (linkedinMatch) return linkedinMatch[1].replace(/-/g, " ");
  
  const indeedMatch = text.match(/indeed\.co\.in\/cmp\/([^\/\?]+)/i);
  if (indeedMatch) return indeedMatch[1].replace(/-/g, " ");
  
  const naukriMatch = text.match(/naukri\.com\/([^\/\?]+)-jobs/i);
  if (naukriMatch) return naukriMatch[1].replace(/-/g, " ");
  
  return "Tech Company";
}

function extractIndiaLocation(text: string): string {
  const lowerText = text.toLowerCase();
  
  // Major Indian cities
  const cities = [
    "Bangalore", "Bengaluru", "Mumbai", "Delhi", "NCR", "Gurgaon", "Gurugram",
    "Hyderabad", "Chennai", "Pune", "Kolkata", "Noida", "Ahmedabad", "Jaipur",
    "Kochi", "Thiruvananthapuram", "Coimbatore", "Indore", "Chandigarh"
  ];
  
  for (const city of cities) {
    if (lowerText.includes(city.toLowerCase())) {
      return `${city}, India`;
    }
  }
  
  if (lowerText.includes("remote") && lowerText.includes("india")) {
    return "Remote, India";
  }
  
  if (lowerText.includes("india")) {
    return "India";
  }
  
  return "India (Remote/Hybrid)";
}

function removeDuplicates(jobs: JobResult[]): JobResult[] {
  const seen = new Set<string>();
  return jobs.filter(job => {
    const key = `${job.title.toLowerCase()}-${job.company.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
