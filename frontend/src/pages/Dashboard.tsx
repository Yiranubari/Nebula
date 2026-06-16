import React from "react";
import { useApp } from "../context/AppContext";
import { TaskStatus } from "../types";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { CheckCircle2, Clock, AlertCircle, Briefcase } from "lucide-react";

const SOFT_TOOLTIP = {
  background: "rgba(15,23,42,0.78)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 14,
  color: "#f8fafc",
  backdropFilter: "blur(10px)",
  boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
  padding: "10px 14px",
  fontSize: 12,
};

const Dashboard = () => {
  const { tasks, users } = useApp();

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(
    (t) => t.status === TaskStatus.DONE
  ).length;
  const inProgressTasks = tasks.filter(
    (t) => t.status === TaskStatus.IN_PROGRESS
  ).length;
  const todoTasks = tasks.filter((t) => t.status === TaskStatus.TODO).length;
  const reviewTasks = tasks.filter((t) => t.status === TaskStatus.REVIEW).length;

  const pieData = [
    { name: "To Do", value: todoTasks, color: "#cbd5e1" },
    { name: "In Progress", value: inProgressTasks, color: "#a5b4fc" },
    { name: "Review", value: reviewTasks, color: "#fcd34d" },
    { name: "Done", value: completedTasks, color: "#86efac" },
  ].filter((d) => d.value > 0);

  const barData = users.map((user) => {
    const userTasks = tasks.filter((t) => t.assigneeId === user.id);
    return {
      name: user.name.split(" ")[0],
      Tasks: userTasks.length,
      Completed: userTasks.filter((t) => t.status === TaskStatus.DONE).length,
    };
  });

  const completionRate = totalTasks
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0;

  const StatCard = ({
    title,
    value,
    icon: Icon,
    iconBg,
    iconColor,
  }: {
    title: string;
    value: string | number;
    icon: any;
    iconBg: string;
    iconColor: string;
  }) => (
    <div className="glass-panel p-5 rounded-2xl flex items-center justify-between overflow-hidden relative group transition-all hover:-translate-y-0.5">
      <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl opacity-15 group-hover:opacity-25 transition-opacity bg-indigo-400 pointer-events-none" />
      <div className="relative">
        <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 font-medium mb-1.5">
          {title}
        </p>
        <h3 className="text-3xl font-semibold tracking-tight text-slate-800 dark:text-white">
          {value}
        </h3>
      </div>
      <div
        className={`relative w-12 h-12 rounded-2xl flex items-center justify-center ${iconBg} ${iconColor}`}
      >
        <Icon size={22} strokeWidth={1.75} />
      </div>
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-brand">
          Project Overview
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-light">
          Live snapshot of your team's workload and progress.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 mb-8">
        <StatCard
          title="Total Tasks"
          value={totalTasks}
          icon={Briefcase}
          iconBg="bg-indigo-500/10"
          iconColor="text-indigo-500 dark:text-indigo-300"
        />
        <StatCard
          title="In Progress"
          value={inProgressTasks}
          icon={Clock}
          iconBg="bg-sky-500/10"
          iconColor="text-sky-500 dark:text-sky-300"
        />
        <StatCard
          title="Completed"
          value={completedTasks}
          icon={CheckCircle2}
          iconBg="bg-emerald-500/10"
          iconColor="text-emerald-500 dark:text-emerald-300"
        />
        <StatCard
          title="Pending Review"
          value={reviewTasks}
          icon={AlertCircle}
          iconBg="bg-amber-500/10"
          iconColor="text-amber-500 dark:text-amber-300"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-2xl h-96 relative">
          <h3 className="text-base font-medium text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2 tracking-tight">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            Task Distribution
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 font-light">
            {completionRate}% complete overall
          </p>
          <ResponsiveContainer width="100%" height="82%">
            <PieChart>
              <defs>
                {pieData.map((entry, i) => (
                  <linearGradient
                    key={`g-${i}`}
                    id={`pie-grad-${i}`}
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={entry.color} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={entry.color} stopOpacity={0.7} />
                  </linearGradient>
                ))}
              </defs>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={68}
                outerRadius={96}
                paddingAngle={3}
                dataKey="value"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth={1}
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={`url(#pie-grad-${index})`} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={SOFT_TOOLTIP}
                itemStyle={{ color: "#f8fafc" }}
              />
              <Legend
                verticalAlign="bottom"
                height={32}
                iconType="circle"
                wrapperStyle={{ fontSize: 12, color: "#94a3b8" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-[58%] flex flex-col items-center">
            <span className="text-3xl font-semibold tracking-tight text-slate-800 dark:text-white">
              {totalTasks}
            </span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 font-medium">
              Total
            </span>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl h-96">
          <h3 className="text-base font-medium text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2 tracking-tight">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            Team Workload
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 font-light">
            Assigned vs. completed per member
          </p>
          <ResponsiveContainer width="100%" height="86%">
            <BarChart
              data={barData}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
              barCategoryGap="30%"
            >
              <defs>
                <linearGradient id="bar-tasks" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#a5b4fc" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#c4b5fd" stopOpacity={0.7} />
                </linearGradient>
                <linearGradient id="bar-done" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#86efac" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#6ee7b7" stopOpacity={0.7} />
                </linearGradient>
              </defs>
              <XAxis
                type="number"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={70}
              />
              <Tooltip
                cursor={{ fill: "rgba(165,180,252,0.06)" }}
                contentStyle={SOFT_TOOLTIP}
                itemStyle={{ color: "#f8fafc" }}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: 12, color: "#94a3b8" }}
              />
              <Bar
                dataKey="Tasks"
                fill="url(#bar-tasks)"
                radius={[10, 10, 10, 10]}
                barSize={12}
              />
              <Bar
                dataKey="Completed"
                fill="url(#bar-done)"
                radius={[10, 10, 10, 10]}
                barSize={12}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
