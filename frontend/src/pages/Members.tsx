import React from "react";
import { useApp } from "../context/AppContext";
import Avatar from "../components/Avatar";
import { Link } from "react-router-dom";
import { Users } from "lucide-react";

const Members: React.FC = () => {
  const { users, currentUser, presence } = useApp();
  const others = users.filter((u) => u.id !== currentUser.id);

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg text-indigo-600 dark:text-indigo-200">
          <Users size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
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
              className="bg-white dark:bg-surface border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-center gap-3"
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
                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  >
                    View Profile
                  </Link>
                  <Link
                    to={`/inbox?with=${u.id}`}
                    className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
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
