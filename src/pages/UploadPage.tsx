import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ResumeUploader } from '@/components/upload/ResumeUploader';
import { useAuth } from '@/contexts/AuthContext';
import { uploadResume, createResumeRecord, updateResumeStatus } from '@/lib/supabase';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sparkles, FileText, Target, Briefcase } from 'lucide-react';

export const UploadPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (file: File) => {
    if (!user) {
      toast.error('Please sign in to upload a resume');
      return;
    }

    setIsUploading(true);

    try {
      // 1. Upload file to storage
      const { path, url } = await uploadResume(file, user.id);
      toast.success('Resume uploaded successfully!');

      // 2. Create resume record
      const resume = await createResumeRecord(user.id, file.name, url);
      toast.info('Starting AI analysis...');

      // 3. Call edge function for analysis
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-resume', {
        body: { 
          resumeId: resume.id, 
          userId: user.id,
          fileName: file.name,
          filePath: path 
        }
      });

      if (analysisError) {
        console.error('Analysis error:', analysisError);
        await updateResumeStatus(resume.id, 'failed');
        toast.error('Analysis failed. Please try again.');
        return;
      }

      await updateResumeStatus(resume.id, 'completed');
      toast.success('Resume analyzed successfully!');
      navigate('/analysis');

    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload resume. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            AI-Powered Analysis
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Upload Your Resume
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Our AI will analyze your resume and provide personalized insights to help you land your dream job.
          </p>
        </div>

        {/* Upload Component */}
        <ResumeUploader onUpload={handleUpload} isUploading={isUploading} />

        {/* What You'll Get */}
        <div className="mt-16">
          <h2 className="font-display text-xl font-semibold text-foreground text-center mb-8">
            What You'll Get
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Target,
                title: 'ATS Score',
                description: 'Get a detailed compatibility score with improvement tips'
              },
              {
                icon: Briefcase,
                title: 'Job Matches',
                description: 'Receive personalized job recommendations based on your skills'
              },
              {
                icon: FileText,
                title: 'Skill Analysis',
                description: 'Identify skill gaps and get learning resources'
              }
            ].map((item) => (
              <div key={item.title} className="text-center p-6 rounded-2xl bg-card border border-border">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UploadPage;
