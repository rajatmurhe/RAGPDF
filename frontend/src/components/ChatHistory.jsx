import {
  MessageSquare,
  MoreHorizontal,
  Trash2,
} from "lucide-react";

function ChatHistory({
  conversations,
  activeConversationId,
  onSelect,
  onDelete,
}) {
  if (!conversations || conversations.length === 0) {
    return (
      <div className="px-4 py-5">
        <div className="text-center text-xs text-zinc-600">
          No previous chats
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 pt-5">
      <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
        Recent Chats
      </div>

      <div className="space-y-1">
        {conversations.map((conversation) => {
          const isActive =
            conversation.id ===
            activeConversationId;

          return (
            <div
              key={conversation.id}
              className={`group flex items-center rounded-xl transition ${
                isActive
                  ? "bg-white/[0.07]"
                  : "hover:bg-white/[0.04]"
              }`}
            >
              <button
                onClick={() =>
                  onSelect(conversation.id)
                }
                className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left"
              >
                <MessageSquare
                  size={15}
                  className={
                    isActive
                      ? "shrink-0 text-zinc-300"
                      : "shrink-0 text-zinc-600"
                  }
                />

                <span
                  className={`truncate text-xs ${
                    isActive
                      ? "text-zinc-200"
                      : "text-zinc-500"
                  }`}
                >
                  {conversation.title}
                </span>
              </button>

              <button
                onClick={() =>
                  onDelete(conversation.id)
                }
                title="Delete chat"
                className="mr-2 hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-600 transition hover:bg-white/[0.08] hover:text-red-400 group-hover:flex"
              >
                <Trash2 size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ChatHistory;