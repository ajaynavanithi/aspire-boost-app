import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format } from 'date-fns';

interface Resume {
  created_at: string;
  resume_analysis?: Array<{ ats_score: number }>;
}

interface ScoreTrendChartProps {
  resumes: Resume[];
}

export const ScoreTrendChart: React.FC<ScoreTrendChartProps> = ({ resumes }) => {
  const data = resumes
    .filter(r => r.resume_analysis?.[0]?.ats_score)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((resume, index) => ({
      name: `Resume ${index + 1}`,
      date: format(new Date(resume.created_at), 'MMM d'),
      score: resume.resume_analysis?.[0]?.ats_score || 0,
    }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-sm text-primary">ATS Score: {payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground">
        Upload more resumes to see score trends
      </div>
    );
  }

  // If only one data point, show a simple display
  if (data.length === 1) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px]">
        <div className="text-4xl font-display font-bold text-primary mb-2">
          {data[0].score}
        </div>
        <p className="text-sm text-muted-foreground">
          Current ATS Score • Upload more resumes to see trends
        </p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis 
          dataKey="date" 
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          tickLine={false}
        />
        <YAxis 
          domain={[0, 100]} 
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          tickLine={false}
          width={40}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area 
          type="monotone" 
          dataKey="score" 
          stroke="hsl(var(--primary))" 
          strokeWidth={2}
          fill="url(#scoreGradient)" 
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default ScoreTrendChart;
