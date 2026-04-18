import React from "react";
import { useApp } from "../context/AppContext";
import Avatar from "../components/Avatar";
import { useNavigate } from "react-router-dom";

const Notifications = () => {
  const {
    notifications,
    users,
    tasks,
    tracks,
    currentUser,
    approveTask,
    rejectTask,
    markNotificationRead,
    markAllNotificationsReadForUser,
  } = useApp();
  const navigate = useNavigate();
  const isAdmin = currentUser.role === "ADMIN";

  const visible = isAdmin
    ? notifications
    : notifications.filter(
        (n) =>
          n.requesterId === currentUser.id || n.recipientId === currentUser.id
      );

  const sorted = visible.slice().sort((a, b) => {
    const ta = Date.parse(a.createdAt);
    const tb = Date.parse(b.createdAt);
    return tb - ta;
  });

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-brand">
          Notifications
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Mentions, reactions, assignments and approval requests.
        </p>
      </div>
      {sorted.length > 0 && (
        <div className="mb-4 flex justify-end">
          <button
            className="px-3 py-2 text-xs rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
            onClick={() => {
              markAllNotificationsReadForUser(currentUser.id).catch(() => {});
            }}
            title="Mark all as read"
          >
            Mark all as read
          </button>
        </div>
      )}
      {sorted.length === 0 ? (
        <div className="glass-panel rounded-2xl p-10 text-center">
          <p className="text-slate-700 dark:text-slate-200 font-medium">
            You're all caught up
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            New mentions, reactions, task assignments and approval requests will
            show up here.
          </p>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl shadow-sm">
          <ul className="divide-y divide-slate-100/70 dark:divide-white/5">
            {sorted.map((n) => {
              const task = n.taskId
                ? tasks.find((t) => t.id === n.taskId)
                : undefined;
              const requester = users.find((u) => u.id === n.requesterId);
              const statusColor =
                n.status === "PENDING"
                  ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-200 dark:border-amber-500/30"
                  : n.status === "APPROVED"
                  ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-200 dark:border-green-500/30"
                  : n.status === "REJECTED"
                  ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-200 dark:border-red-500/30"
                  : "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700";

              return (
                <li key={n.id} className="p-4 flex items-center gap-3">
                  <div
                    className={`text-xs px-2 py-0.5 rounded border ${statusColor}`}
                  >
                    {n.status.toLowerCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-800 dark:text-slate-100">
                      {n.type === "ASSIGNED" ? (
                        <>
                          {isAdmin ? (
                            <>
                              Assigned{" "}
                              <span className="font-semibold">
                                {task?.title || "Task"}
                              </span>{" "}
                              to{" "}
                              <span className="font-semibold">
                                {users.find((u) => u.id === n.recipientId)
                                  ?.name || "Member"}
                              </span>
                            </>
                          ) : (
                            <>
                              You were assigned{" "}
                              <span className="font-semibold">
                                {task?.title || "Task"}
                              </span>
                              {requester ? (
                                <>
                                  {" "}
                                  by{" "}
                                  <span className="font-semibold">
                                    {requester.name}
                                  </span>
                                </>
                              ) : null}
                            </>
                          )}
                        </>
                      ) : n.type === "MENTION" ? (
                        <>
                          {n.recipientId === currentUser.id ? (
                            <>
                              You were mentioned in
                              {n.trackId ? (
                                <>
                                  {" "}
                                  <span className="font-semibold">
                                    #
                                    {tracks.find((t) => t.id === n.trackId)
                                      ?.name || "general"}
                                  </span>
                                </>
                              ) : null}{" "}
                              by{" "}
                              <span className="font-semibold">
                                {requester?.name || "Someone"}
                              </span>
                            </>
                          ) : (
                            <>
                              {requester?.name || "Someone"} mentioned a track
                              you follow
                            </>
                          )}
                        </>
                      ) : n.type === "REACTION" ? (
                        <>
                          <span className="font-semibold">
                            {users.find((u) => u.id === n.requesterId)?.name ||
                              "Someone"}
                          </span>{" "}
                          reacted to your message
                          {n.trackId ? (
                            <>
                              {" "}
                              in{" "}
                              <span className="font-semibold">
                                #
                                {tracks.find((t) => t.id === n.trackId)?.name ||
                                  "general"}
                              </span>
                            </>
                          ) : null}
                          {n.emoji ? (
                            <>
                              {" "}
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs align-middle">
                                {n.emoji}
                              </span>
                            </>
                          ) : null}
                        </>
                      ) : (
                        <>
                          {isAdmin ? (
                            <>
                              <span className="font-semibold">
                                {requester?.name || "Unknown"}
                              </span>{" "}
                              requested approval for{" "}
                              <span className="font-semibold">
                                {task?.title || "Task"}
                              </span>
                            </>
                          ) : (
                            <>
                              Your request for{" "}
                              <span className="font-semibold">
                                {task?.title || "Task"}
                              </span>{" "}
                              is{" "}
                              <span className="font-semibold">
                                {n.status.toLowerCase()}
                              </span>
                            </>
                          )}
                        </>
                      )}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="text-[10px] px-2 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-200 dark:border-indigo-500/30">
                      Unread
                    </span>
                  )}
                  {(n.type === "MENTION" || n.type === "REACTION") &&
                    n.messageId && (
                      <button
                        className="ml-2 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-xs"
                        onClick={() => {
                          markNotificationRead(n.id).catch(() => {});
                          navigate({
                            pathname: "/chat",
                            search: `?trackId=${encodeURIComponent(
                              n.trackId || "track-general"
                            )}&messageId=${encodeURIComponent(n.messageId)}`,
                          });
                        }}
                      >
                        View
                      </button>
                    )}
                  {!n.read && (
                    <button
                      className="ml-2 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-xs"
                      onClick={() => {
                        markNotificationRead(n.id).catch(() => {});
                      }}
                    >
                      Mark read
                    </button>
                  )}
                  {isAdmin &&
                    n.status === "PENDING" &&
                    n.type !== "ASSIGNED" && (
                      <div className="flex items-center gap-2">
                        <button
                          className="px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700 text-xs"
                          onClick={() => {
                            approveTask(n.taskId).catch(() => {});
                          }}
                        >
                          Approve
                        </button>
                        <button
                          className="px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 text-xs"
                          onClick={() => {
                            rejectTask(n.taskId).catch(() => {});
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Notifications;
