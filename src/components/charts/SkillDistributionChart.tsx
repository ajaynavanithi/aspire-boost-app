import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface SkillDistributionChartProps {
  skills: string[];
  skillGaps: Array<{ category: string; skill_name: string }>;
}

export const SkillDistributionChart: React.FC<SkillDistributionChartProps> = ({ 
  skills, 
  skillGaps 
}) => {
  // Categorize skills (simplified categorization)
  const categorizeSkill = (skill: string): string => {
    const techKeywords = ['react', 'javascript', 'python', 'java', 'node', 'typescript', 'sql', 'aws', 'docker', 'kubernetes', 'html', 'css', 'git', 'api', 'database', 'backend', 'frontend', 'c++', 'c#', 'go', 'rust', 'php', 'ruby', 'swift', 'kotlin'];
    const toolKeywords = ['figma', 'jira', 'slack', 'notion', 'vscode', 'postman', 'webpack', 'vite', 'npm', 'yarn', 'excel', 'tableau', 'power bi', 'adobe', 'sketch'];
    const softKeywords = ['communication', 'leadership', 'teamwork', 'problem solving', 'analytical', 'time management', 'collaboration', 'presentation', 'critical thinking', 'creativity'];
    
    const lowerSkill = skill.toLowerCase();
    
    if (techKeywords.some(k => lowerSkill.includes(k))) return 'Technical';
    if (toolKeywords.some(k => lowerSkill.includes(k))) return 'Tools & Frameworks';
    if (softKeywords.some(k => lowerSkill.includes(k))) return 'Soft Skills';
    return 'Technical'; // Default to technical
  };

  const skillCategories = skills.reduce((acc, skill) => {
    const category = categorizeSkill(skill);
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const data = Object.entries(skillCategories).map(([name, value]) => ({
    name,
    value,
  }));

  // Add skill gaps distribution
  const gapCategories = skillGaps.reduce((acc, gap) => {
    const category = gap.category === 'technical' ? 'Technical Gaps' 
      : gap.category === 'soft_skills' ? 'Soft Skill Gaps' 
      : 'Tool Gaps';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const gapData = Object.entries(gapCategories).map(([name, value]) => ({
    name,
    value,
  }));

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--accent))', 'hsl(var(--warning))'];
  const GAP_COLORS = ['hsl(var(--destructive))', 'hsl(var(--warning))', 'hsl(var(--muted-foreground))'];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
          <p className="text-sm font-medium text-foreground">{payload[0].name}</p>
          <p className="text-sm text-muted-foreground">{payload[0].value} skills</p>
        </div>
      );
    }
    return null;
  };

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground">
        No skill data available
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Your Skills Distribution */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-4 text-center">Your Skills</h4>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ fontSize: '12px' }}
              formatter={(value) => <span className="text-foreground">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Skill Gaps Distribution */}
      {gapData.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-4 text-center">Skill Gaps</h4>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={gapData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {gapData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={GAP_COLORS[index % GAP_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ fontSize: '12px' }}
                formatter={(value) => <span className="text-foreground">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default SkillDistributionChart;
