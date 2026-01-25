import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FileText, ArrowRight, Upload, Target, Briefcase } from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Simple Navbar */}
      <nav className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-[hsl(200,85%,50%)] flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl text-foreground">
              Resume<span className="text-primary">AI</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section - Simplified */}
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            Transform Your Resume into{' '}
            <span className="gradient-text">Career Success</span>
          </h1>
          
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Get instant ATS scores, personalized job matches, and AI-powered interview prep.
          </p>

          {/* Key Features - Simple Icons */}
          <div className="flex flex-wrap justify-center gap-6 mb-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" />
              <span>Upload Resume</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <span>ATS Score</span>
            </div>
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary" />
              <span>Job Matches</span>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/signup">
              <Button variant="hero" size="xl">
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg">
                Sign In
              </Button>
            </Link>
          </div>

          <p className="mt-6 text-sm text-muted-foreground">
            No credit card required • Free forever
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-border">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} ResumeAI. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
