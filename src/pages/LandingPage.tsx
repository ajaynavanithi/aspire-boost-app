import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/Navbar';
import { 
  FileText, 
  Target, 
  Briefcase, 
  MessageSquare, 
  CheckCircle, 
  ArrowRight,
  Sparkles,
  TrendingUp,
  Users,
  Award
} from 'lucide-react';

const features = [
  {
    icon: FileText,
    title: 'Smart Resume Analysis',
    description: 'AI-powered parsing extracts skills, education, experience, and projects from your resume.',
  },
  {
    icon: Target,
    title: 'ATS Score Calculator',
    description: 'Get a detailed ATS compatibility score with actionable improvement suggestions.',
  },
  {
    icon: Briefcase,
    title: 'Job Recommendations',
    description: 'Receive personalized job matches based on your skills with match percentages.',
  },
  {
    icon: MessageSquare,
    title: 'Interview Preparation',
    description: 'Practice with AI-generated questions tailored to your target roles.',
  },
];

const stats = [
  { value: '50K+', label: 'Resumes Analyzed' },
  { value: '95%', label: 'User Satisfaction' },
  { value: '10K+', label: 'Jobs Matched' },
  { value: '85%', label: 'Interview Success' },
];

const benefits = [
  'Instant ATS compatibility scoring',
  'Personalized skill gap analysis',
  'AI-powered job matching',
  'Interview question practice',
  'Resume improvement tips',
  'Career path guidance',
];

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 animate-fade-in">
              <Sparkles className="w-4 h-4" />
              AI-Powered Career Acceleration
            </div>
            
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 animate-slide-up">
              Transform Your Resume into{' '}
              <span className="gradient-text">Career Success</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
              Upload your resume and get instant ATS scores, personalized job recommendations, 
              skill gap analysis, and AI-generated interview questions.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
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
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 max-w-3xl mx-auto">
            {stats.map((stat, index) => (
              <div 
                key={stat.label}
                className="text-center p-4 rounded-2xl bg-card/50 backdrop-blur border border-border/50 animate-scale-in"
                style={{ animationDelay: `${0.3 + index * 0.1}s` }}
              >
                <div className="text-2xl md:text-3xl font-display font-bold gradient-text">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything You Need to Land Your Dream Job
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our AI-powered platform provides comprehensive tools to analyze, improve, and optimize your job search.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-xl transition-all duration-300 hover-lift"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-[hsl(200,85%,50%)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground">
              Three simple steps to accelerate your career
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: '01', title: 'Upload Resume', description: 'Simply upload your resume in PDF or Word format' },
              { step: '02', title: 'Get Analysis', description: 'Our AI analyzes your resume and provides insights' },
              { step: '03', title: 'Improve & Apply', description: 'Use recommendations to optimize and apply confidently' },
            ].map((item, index) => (
              <div key={item.step} className="text-center relative">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-display font-bold text-primary">{item.step}</span>
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-muted-foreground">{item.description}</p>
                
                {index < 2 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] border-t-2 border-dashed border-border" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-sidebar text-sidebar-foreground">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">
                Stand Out From the Competition
              </h2>
              <p className="text-sidebar-foreground/70 text-lg mb-8">
                In today's competitive job market, you need every advantage. Our AI-powered platform 
                helps you optimize your resume, identify skill gaps, and prepare for interviews.
              </p>
              
              <div className="grid sm:grid-cols-2 gap-3">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-sidebar-primary flex-shrink-0" />
                    <span className="text-sidebar-foreground/80">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: TrendingUp, label: 'Career Growth', value: '+45%' },
                { icon: Award, label: 'Success Rate', value: '92%' },
                { icon: Users, label: 'Active Users', value: '50K+' },
                { icon: Sparkles, label: 'AI Accuracy', value: '98%' },
              ].map((stat) => (
                <div 
                  key={stat.label}
                  className="p-6 rounded-2xl bg-sidebar-accent border border-sidebar-border text-center"
                >
                  <stat.icon className="w-8 h-8 text-sidebar-primary mx-auto mb-3" />
                  <div className="text-2xl font-display font-bold text-sidebar-primary">
                    {stat.value}
                  </div>
                  <div className="text-sm text-sidebar-foreground/60">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
              Ready to Boost Your Career?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join thousands of job seekers who have transformed their career prospects with our AI-powered platform.
            </p>
            <Link to="/signup">
              <Button variant="hero" size="xl">
                Start Your Free Analysis
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-[hsl(200,85%,50%)] flex items-center justify-center">
                <FileText className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-foreground">
                Resume<span className="text-primary">AI</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} ResumeAI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
