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
    color,
  }: {
    title: string;
    value: string | number;
    icon: any;
    color: string;
  }) => (
    <div className="bg-white dark:bg-surface p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">
          {title}
        </p>
        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          {value}
        </h3>
      </div>
      <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
        <Icon className={`w-6 h-6 ${color.replace("bg-", "text-")}`} />
      </div>
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">
        Project Overview
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Tasks"
          value={totalTasks}
          icon={Briefcase}
          color="bg-indigo-600 text-indigo-600"
        />
        <StatCard
          title="In Progress"
          value={inProgressTasks}
          icon={Clock}
          color="bg-blue-500 text-blue-500"
        />
        <StatCard
          title="Completed"
          value={completedTasks}
          icon={CheckCircle2}
          color="bg-green-500 text-green-500"
        />
        <StatCard
          title="Pending Review"
          value={tasks.filter((t) => t.status === TaskStatus.REVIEW).length}
          icon={AlertCircle}
          color="bg-amber-500 text-amber-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-surface p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm h-96">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
            Task Distribution
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-surface p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm h-96">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
            Team Workload
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <XAxis
                dataKey="name"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip cursor={{ fill: "#f1f5f9" }} />
              <Legend />
              <Bar dataKey="Tasks" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Completed" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
