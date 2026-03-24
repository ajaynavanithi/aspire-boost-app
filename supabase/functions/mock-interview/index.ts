import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { messages, resumeContext, interviewType, difficulty } = await req.json();

    const systemPrompt = `You are an experienced technical interviewer conducting a real-time mock interview. Your role is to simulate a professional job interview experience.

CONTEXT ABOUT THE CANDIDATE:
${resumeContext || "No resume context provided."}

INTERVIEW SETTINGS:
- Type: ${interviewType || "mixed"} (technical, hr, or mixed)
- Difficulty: ${difficulty || "intermediate"}

RULES:
1. Ask ONE question at a time. Wait for the candidate's response before moving on.
2. After the candidate answers, provide brief, constructive feedback (2-3 sentences) with a rating out of 10, then ask the next question.
3. Format your feedback like this:
   **Feedback:** Your analysis of their answer.
   **Rating:** X/10
   Then ask the next question.
4. Start the interview with a warm greeting and your first question.
5. Mix question types naturally - technical, behavioral, situational.
6. If the candidate says "end interview" or similar, provide a summary with:
   - Overall performance rating
   - Key strengths observed
   - Areas for improvement
   - Tips for real interviews
7. Keep a professional but friendly tone.
8. Tailor questions to the candidate's skills and experience from their resume.
9. Ask follow-up questions when answers are vague or incomplete.
10. After about 8-10 questions, naturally wrap up the interview with a summary.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please wait a moment and try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("mock-interview error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
