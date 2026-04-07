import React, { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { useCall } from "../context/CallContext";
import HuddleCall from "../components/HuddleCall";
import { Hash, Users, PhoneCall } from "lucide-react";

const Huddles = () => {
  const { tracks, users, currentUser } = useApp();
  const { isInHuddle, roomId, joinHuddle, leaveHuddle } = useCall();
  const [openId, setOpenId] = useState<string | null>(null);
  const [activeRoomsExternal, setActiveRoomsExternal] = useState<string[]>(
    () => {
      try {
        return JSON.parse(
          localStorage.getItem("nebula.huddleActiveRooms") || "[]"
        );
      } catch {
        return [];
      }
    }
  );

  useEffect(() => {
    const key = "nebula.huddleActiveRooms";
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) {
        try {
          setActiveRoomsExternal(JSON.parse(e.newValue || "[]") || []);
        } catch {
          setActiveRoomsExternal([]);
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const isMember = (trackId: string) =>
    (tracks.find((t) => t.id === trackId)?.members || []).includes(
      currentUser.id
    );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">
        Huddles
      </h1>
      <p className="text-slate-600 dark:text-slate-300 mb-4">
        Start or join a track huddle. You can be in only one huddle at a time.
      </p>
      <div className="bg-white dark:bg-surface border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {tracks.map((t) => {
            const members = t.members || [];
            const active = isInHuddle && roomId === t.id;
            const externallyActive = activeRoomsExternal.includes(t.id);
            const inOther = isInHuddle && roomId !== t.id;
            return (
              <li key={t.id} className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-200 rounded-lg flex items-center justify-center">
                  <Hash size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                    #{t.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1">
                      <Users size={12} /> {members.length} members
                    </span>
                    {active ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-green-50 text-green-700 border border-green-200">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
                        Idle
                      </span>
                    )}
                  </p>
                </div>
                <button
                  className={`px-3 py-2 rounded-lg border text-sm inline-flex items-center gap-2 ${
                    isMember(t.id) && !inOther
                      ? "bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700"
                      : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 cursor-not-allowed"
                  }`}
                  disabled={!isMember(t.id) || inOther}
                  onClick={() => {
                    if (inOther) return;
                    setOpenId(t.id);
                    joinHuddle(t.id);
                  }}
                  title={
                    !isMember(t.id)
                      ? "You’re not a member of this track"
                      : inOther
                      ? "Leave your current huddle to join another"
                      : externallyActive
                      ? "Join huddle"
                      : "Start huddle"
                  }
                >
                  <PhoneCall size={16} />{" "}
                  {active ? "Rejoin" : externallyActive ? "Join" : "Start"}
                </button>
                {active && (
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
