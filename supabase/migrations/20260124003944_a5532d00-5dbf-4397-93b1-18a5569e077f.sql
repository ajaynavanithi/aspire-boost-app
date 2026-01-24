-- Enable realtime for job_recommendations table to support live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_recommendations;