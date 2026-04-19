import React from "react";
import { useApp } from "../context/AppContext";
import Avatar from "../components/Avatar";
import { Link } from "react-router-dom";
import { Users } from "lucide-react";

const Members: React.FC = () => {
  const { users, currentUser, presence } = useApp();
  const others = users.filter((u) => u.id !== currentUser.id);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl text-indigo-600 dark:text-indigo-200 border border-indigo-500/20">
          <Users size={20} />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-brand">
            Members
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Browse team members and start conversations
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {others.map((u) => {
          const status = presence[u.id]?.inHuddleTrackId
            ? ("in-huddle" as any)
            : ((presence[u.id]?.status || "offline") as any);
          return (
            <div
              key={u.id}
              className="glass-panel rounded-2xl p-4 flex items-center gap-3 hover:border-indigo-500/30 transition-colors"
            >
              <Avatar
                src={u.avatar}
                name={u.name}
                size="lg"
                showStatusDot
                status={status}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                  {u.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {u.email}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Link
                    to={`/profile?userId=${u.id}`}
                    className="text-xs px-3 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-white/5"
                  >
                    View Profile
                  </Link>
                  <Link
                    to={`/inbox?with=${u.id}`}
                    className="text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-sm"
                  >
                    Message
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Members;
