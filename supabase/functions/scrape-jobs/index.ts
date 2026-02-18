import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { neon } from "https://esm.sh/@neondatabase/serverless@0.9.0";

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
    const NEON_DATABASE_URL = Deno.env.get("NEON_DATABASE_URL");

    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY is not configured");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!NEON_DATABASE_URL) throw new Error("NEON_DATABASE_URL is not configured");
    if (!skills || skills.length === 0) throw new Error("No skills provided");

    const sql = neon(NEON_DATABASE_URL);

    // Normalize skills to strings
    const normalizedSkills: string[] = skills.map((s: any) => typeof s === 'string' ? s : (s?.name || s?.skill || s?.title || String(s ?? '')));
    const topSkills = normalizedSkills.slice(0, 5).join(" ");
    const searchQueries = [
      `${topSkills} jobs India Bangalore Mumbai Delhi`,
      `${normalizedSkills[0]} developer jobs India 2024`,
      `${normalizedSkills.slice(0, 3).join(" ")} engineer India remote`,
      `${topSkills} jobs Hyderabad Chennai Pune`,
    ];

    const allJobResults: JobResult[] = [];

    for (const query of searchQueries) {
      try {
        const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: query + " site:linkedin.com/jobs OR site:indeed.co.in OR site:naukri.com",
            limit: 5,
            country: "IN",
            scrapeOptions: { formats: ["markdown"] },
          }),
        });

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          if (searchData.data && Array.isArray(searchData.data)) {
            for (const result of searchData.data) {
              const matchedSkills = normalizedSkills.filter((skill: string) => 
                (result.markdown || result.description || "").toLowerCase().includes(skill.toLowerCase())
              );
              const matchPercentage = Math.min(95, Math.round((matchedSkills.length / normalizedSkills.length) * 100) + 40);
              allJobResults.push({
                title: result.title || "Job Opening",
                company: extractCompany(result.url || result.title || ""),
                location: extractIndiaLocation(result.markdown || result.description || ""),
                description: (result.markdown || result.description || "").substring(0, 2000),
                url: result.url || "",
                matchedSkills: matchedSkills.slice(0, 5),
                matchPercentage,
              });
            }
          }
        }
      } catch (error) {
        console.error("Search error:", error);
      }
    }

    const uniqueJobs = removeDuplicates(allJobResults);
    const sortedJobs = uniqueJobs.sort((a, b) => b.matchPercentage - a.matchPercentage).slice(0, 10);

    if (sortedJobs.length > 0) {
      const enhancePrompt = `Given job results and candidate skills (${normalizedSkills.join(", ")}), return JSON array of enhanced India job recommendations. IMPORTANT: For "applyUrl", use the EXACT real URL from the raw results - do NOT make up URLs. Each object must have: jobTitle, companyType, companyName, location, matchPercentage(50-95), matchedSkills(string[]), requiredSkills(string[]), jobDescription(200+ words), salaryRange(INR), applyUrl(MUST be the real URL from the scraped result).

RAW RESULTS: ${JSON.stringify(sortedJobs, null, 2)}`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "Job matching expert. Return only valid JSON array." },
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
          
          if (resumeId && userId && Array.isArray(enhancedJobs)) {
            // Delete existing and insert new — using Neon
            await sql`DELETE FROM job_recommendations WHERE resume_id = ${resumeId}::uuid AND user_id = ${userId}`;

            for (const job of enhancedJobs) {
              await sql`INSERT INTO job_recommendations (resume_id, user_id, job_title, company_type, match_percentage, matched_skills, required_skills, job_description, salary_range, apply_url)
                VALUES (${resumeId}::uuid, ${userId}, ${job.jobTitle || "Unknown"}, ${job.companyType || job.companyName || "Company"}, ${job.matchPercentage || 70}, ${JSON.stringify(job.matchedSkills || [])}, ${JSON.stringify(job.requiredSkills || [])}, ${job.jobDescription || ""}, ${job.salaryRange || "Competitive"}, ${job.applyUrl || ""})`;
            }
          }

          return new Response(JSON.stringify({ success: true, jobs: enhancedJobs }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (parseError) {
          console.error("Parse error:", parseError);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, jobs: sortedJobs }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function extractCompany(text: string): string {
  const linkedinMatch = text.match(/linkedin\.com\/company\/([^\/\?]+)/i);
  if (linkedinMatch) return linkedinMatch[1].replace(/-/g, " ");
  const indeedMatch = text.match(/indeed\.co\.in\/cmp\/([^\/\?]+)/i);
  if (indeedMatch) return indeedMatch[1].replace(/-/g, " ");
  return "Tech Company";
}

function extractIndiaLocation(text: string): string {
  const lower = text.toLowerCase();
  const cities = ["Bangalore", "Bengaluru", "Mumbai", "Delhi", "Gurgaon", "Gurugram", "Hyderabad", "Chennai", "Pune", "Kolkata", "Noida", "Ahmedabad"];
  for (const city of cities) {
    if (lower.includes(city.toLowerCase())) return `${city}, India`;
  }
  if (lower.includes("remote") && lower.includes("india")) return "Remote, India";
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
