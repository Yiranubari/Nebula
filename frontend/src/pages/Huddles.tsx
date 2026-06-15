import React, { useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import { useCall } from "../context/CallContext";
import HuddleCall from "../components/HuddleCall";
import Avatar from "../components/Avatar";
import { Hash, Users, PhoneCall, Radio } from "lucide-react";

const Huddles = () => {
  const { tracks, users, currentUser, presence } = useApp();
  const { isInHuddle, roomId, joinHuddle, leaveHuddle } = useCall();
  const [openId, setOpenId] = useState<string | null>(null);

  const participantsByTrack = useMemo(() => {
    const map: Record<string, string[]> = {};
    const entries = Object.entries(presence) as Array<
      [string, { inHuddleTrackId?: string | null }]
    >;
    for (const [userId, info] of entries) {
      const tid = info?.inHuddleTrackId;
      if (!tid) continue;
      if (!map[tid]) map[tid] = [];
      map[tid].push(userId);
    }
    return map;
  }, [presence]);

  const isMember = (trackId: string) =>
    (tracks.find((t) => t.id === trackId)?.members || []).includes(
      currentUser.id
    );

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl text-indigo-600 dark:text-indigo-200 border border-indigo-500/20">
          <PhoneCall size={20} />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-brand">
            Huddles
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Start or join a track huddle. You can be in only one huddle at a time.
          </p>
        </div>
      </div>
      <div className="glass-panel rounded-2xl shadow-sm">
        <ul className="divide-y divide-slate-100/70 dark:divide-white/5">
          {tracks.map((t) => {
            const members = t.members || [];
            const occupants = participantsByTrack[t.id] ?? [];
            const liveCount = occupants.length;
            const isLive = liveCount > 0;
            const iAmHere = isInHuddle && roomId === t.id;
            const inOther = isInHuddle && roomId !== t.id;
            const otherOccupants = occupants
              .filter((id) => id !== currentUser.id)
              .slice(0, 4)
              .map((id) => users.find((u) => u.id === id))
              .filter(Boolean) as { id: string; name: string; avatar?: string }[];

            return (
              <li key={t.id} className="p-4 flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border ${
                    isLive
                      ? "bg-gradient-to-br from-emerald-500/25 to-green-500/20 text-emerald-500 dark:text-emerald-300 border-emerald-500/40"
                      : "bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-600 dark:text-indigo-200 border-indigo-500/20"
                  }`}
                >
                  <Hash size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                    #{t.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                    <span className="inline-flex items-center gap-1">
                      <Users size={12} /> {members.length}{" "}
                      {members.length === 1 ? "member" : "members"}
                    </span>
                    {isLive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                        <span className="relative inline-flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                        </span>
                        Live · {liveCount}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-600 border border-slate-200 dark:bg-white/5 dark:text-slate-300 dark:border-white/10">
                        <Radio size={10} />
                        Idle
                      </span>
                    )}
                  </p>
                  {otherOccupants.length > 0 && (
                    <div className="mt-2 flex items-center gap-1">
                      <div className="flex -space-x-2">
                        {otherOccupants.map((u) => (
                          <span key={u.id} className="inline-block">
                            <Avatar
                              src={u.avatar}
                              name={u.name}
                              size="sm"
                              className="border-2 border-white dark:border-[#0f172a]"
                            />
                          </span>
                        ))}
                      </div>
                      <span className="ml-1 text-[11px] text-slate-500 dark:text-slate-400">
                        {liveCount > otherOccupants.length
                          ? `+${liveCount - otherOccupants.length} more`
                          : otherOccupants.map((u) => u.name.split(" ")[0]).join(", ")}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  className={`px-3 py-2 rounded-lg border text-sm inline-flex items-center gap-2 ${
                    isMember(t.id) && !inOther
                      ? isLive
                        ? "bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700"
                        : "bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700"
                      : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/10 cursor-not-allowed"
                  }`}
                  disabled={!isMember(t.id) || inOther}
                  onClick={() => {
                    if (inOther) return;
                    setOpenId(t.id);
                    joinHuddle(t.id);
                  }}
                  title={
                    !isMember(t.id)
                      ? "You're not a member of this track"
                      : inOther
                      ? "Leave your current huddle to join another"
                      : isLive
                      ? "Join huddle"
                      : "Start huddle"
                  }
                >
                  <PhoneCall size={16} />
                  {iAmHere ? "Rejoin" : isLive ? "Join" : "Start"}
                </button>
                {iAmHere && (
                  <button
                    className="ml-2 px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm"
                    onClick={() => {
                      leaveHuddle();
                      setOpenId(null);
                    }}
                  >
                    Leave
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {openId && (
        <HuddleCall
          trackId={openId}
          trackName={tracks.find((x) => x.id === openId)?.name || "general"}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
};

export default Huddles;
