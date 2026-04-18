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

const Dashboard = () => {
  const { tasks, users } = useApp();

  // Calculate Stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(
    (t) => t.status === TaskStatus.DONE
  ).length;
  const inProgressTasks = tasks.filter(
    (t) => t.status === TaskStatus.IN_PROGRESS
  ).length;
  const todoTasks = tasks.filter((t) => t.status === TaskStatus.TODO).length;

  const pieData = [
    { name: "To Do", value: todoTasks, color: "#94a3b8" },
    { name: "In Progress", value: inProgressTasks, color: "#3b82f6" },
    {
      name: "Review",
      value: tasks.filter((t) => t.status === TaskStatus.REVIEW).length,
      color: "#eab308",
    },
    { name: "Done", value: completedTasks, color: "#22c55e" },
  ].filter((d) => d.value > 0);

  // Tasks by Assignee
  const barData = users.map((user) => {
    const userTasks = tasks.filter((t) => t.assigneeId === user.id);
    return {
      name: user.name.split(" ")[0], // First name
      Tasks: userTasks.length,
      Completed: userTasks.filter((t) => t.status === TaskStatus.DONE).length,
    };
  });

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
    <div className="glass-panel p-5 rounded-2xl shadow-sm flex items-center justify-between overflow-hidden relative group hover:border-indigo-500/30 transition-colors">
      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity bg-indigo-500 pointer-events-none" />
      <div className="relative">
        <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold mb-1">
          {title}
        </p>
        <h3 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white">
          {value}
        </h3>
      </div>
      <div
        className={`relative w-12 h-12 rounded-xl flex items-center justify-center border border-white/10 ${iconBg} ${iconColor}`}
      >
        <Icon size={22} />
      </div>
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-brand">
          Project Overview
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
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
          iconBg="bg-blue-500/10"
          iconColor="text-blue-500 dark:text-blue-300"
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
          value={tasks.filter((t) => t.status === TaskStatus.REVIEW).length}
          icon={AlertCircle}
          iconBg="bg-amber-500/10"
          iconColor="text-amber-500 dark:text-amber-300"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-2xl shadow-sm h-96">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-indigo-400 to-purple-400" />
            Task Distribution
          </h3>
          <ResponsiveContainer width="100%" height="88%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "rgba(15,23,42,0.9)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  color: "#fff",
                }}
                itemStyle={{ color: "#fff" }}
              />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-panel p-6 rounded-2xl shadow-sm h-96">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-purple-400 to-pink-400" />
            Team Workload
          </h3>
          <ResponsiveContainer width="100%" height="88%">
            <BarChart data={barData}>
              <XAxis
                dataKey="name"
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(99,102,241,0.08)" }}
                contentStyle={{
                  background: "rgba(15,23,42,0.9)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  color: "#fff",
                }}
                itemStyle={{ color: "#fff" }}
              />
              <Legend />
              <Bar dataKey="Tasks" fill="#818cf8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Completed" fill="#34d399" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
