import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { neon } from "https://esm.sh/@neondatabase/serverless@0.9.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const NEON_DATABASE_URL = Deno.env.get("NEON_DATABASE_URL");
    if (!NEON_DATABASE_URL) {
      throw new Error("NEON_DATABASE_URL is not configured");
    }

    const sql = neon(NEON_DATABASE_URL);

    // Create enums
    await sql`DO $$ BEGIN
      CREATE TYPE analysis_status AS ENUM ('pending', 'processing', 'completed', 'failed');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$`;

    await sql`DO $$ BEGIN
      CREATE TYPE question_category AS ENUM ('technical', 'hr', 'coding_scenario');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$`;

    await sql`DO $$ BEGIN
      CREATE TYPE question_difficulty AS ENUM ('beginner', 'intermediate', 'advanced');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$`;

    await sql`DO $$ BEGIN
      CREATE TYPE skill_category AS ENUM ('technical', 'soft_skills', 'tools_frameworks');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$`;

    // Create profiles table
    await sql`CREATE TABLE IF NOT EXISTS profiles (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      email TEXT,
      full_name TEXT,
      avatar_url TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )`;

    // Create resumes table
    await sql`CREATE TABLE IF NOT EXISTS resumes (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_url TEXT NOT NULL,
      raw_text TEXT,
      status analysis_status DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )`;

    // Create resume_analysis table
    await sql`CREATE TABLE IF NOT EXISTS resume_analysis (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      resume_id UUID REFERENCES resumes(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      ats_score INTEGER,
      extracted_skills JSONB DEFAULT '[]',
      education JSONB DEFAULT '[]',
      experience JSONB DEFAULT '[]',
      projects JSONB DEFAULT '[]',
      certifications JSONB DEFAULT '[]',
      strengths JSONB DEFAULT '[]',
      weaknesses JSONB DEFAULT '[]',
      missing_keywords JSONB DEFAULT '[]',
      improvement_tips JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT now()
    )`;

    // Create job_recommendations table
    await sql`CREATE TABLE IF NOT EXISTS job_recommendations (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      resume_id UUID REFERENCES resumes(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      job_title TEXT NOT NULL,
      company_type TEXT,
      match_percentage INTEGER,
      matched_skills JSONB DEFAULT '[]',
      required_skills JSONB DEFAULT '[]',
      job_description TEXT,
      salary_range TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )`;

    // Create skill_gaps table
    await sql`CREATE TABLE IF NOT EXISTS skill_gaps (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      resume_id UUID REFERENCES resumes(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      skill_name TEXT NOT NULL,
      category skill_category NOT NULL,
      importance TEXT,
      learning_resources JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT now()
    )`;

    // Create interview_questions table
    await sql`CREATE TABLE IF NOT EXISTS interview_questions (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      resume_id UUID REFERENCES resumes(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      job_role TEXT NOT NULL,
      question TEXT NOT NULL,
      category question_category NOT NULL,
      difficulty question_difficulty NOT NULL,
      suggested_answer TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )`;

    return new Response(JSON.stringify({ success: true, message: "All tables created successfully" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Setup error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
