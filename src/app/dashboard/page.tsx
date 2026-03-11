import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

const mockData = [
  { date: 'Oct 12', score: 45 },
  { date: 'Oct 14', score: 55 },
  { date: 'Oct 18', score: 48 },
  { date: 'Oct 22', score: 78 },
  { date: 'Today', score: 92 },
];

export default function Dashboard() {
  return (
    <div className="p-8 space-y-8 bg-black min-h-screen text-white">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, Alex.</h1>
          <p className="text-emerald-400">Your interview readiness is up 12% this week.</p>
        </div>
        <Button className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold">
          <Play className="mr-2 h-4 w-4 fill-current" /> Start Mock Interview
        </Button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Readiness Trend Chart */}
        <Card className="lg:col-span-2 bg-[#121212] border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <span className="text-emerald-500">📈</span> Readiness Trend (Last 5 Sessions)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockData}>
                <XAxis dataKey="date" stroke="#52525b" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: 'none' }} />
                <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Skill Breakdown */}
        <Card className="bg-[#121212] border-zinc-800">
          <CardHeader><CardTitle className="text-sm font-medium">Skill Breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <SkillProgress label="Technical Accuracy" value={88} color="bg-blue-500" />
            <SkillProgress label="Communication Clarity" value={75} color="bg-purple-500" />
            <SkillProgress label="Confidence Metrics" value={92} color="bg-emerald-500" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SkillProgress({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className="text-zinc-400">{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
