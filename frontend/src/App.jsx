import ChatHistory from "./components/ChatHistory";
import { useRef, useState, useEffect } from "react";
import {
FileText,
MessageSquare,
Search,
Settings,
Plus,
Database,
Sparkles,
Activity,
Upload,
ChevronRight,
CheckCircle2,
Loader2,
X,
Send,
User,
Bot,
RefreshCw,
FileSearch,
Trash2,
MoreHorizontal,
} from "lucide-react";
const API_URL = "http://localhost:5050";
/* ============================================================
SIDEBAR
============================================================ */
function Sidebar({
sidebarOpen,
setSidebarOpen,
activePage,
navigate,
startNewChat,
uploadResult,
conversations,
activeConversationId,
selectConversation,
deleteConversation,
documents,
loadingDocuments,
selectDocument,
deleteDocument,
renameDocument,
}) {
return (
<>
<div
className={`fixed inset-0 z-30 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 md:hidden ${
          sidebarOpen
            ? "opacity-100"
            : "pointer-events-none opacity-0"
        }`}
onClick={() => setSidebarOpen(false)}
/>

  <aside
    className={`fixed left-0 top-0 z-40 flex h-screen w-[260px] shrink-0 flex-col overflow-hidden border-r border-white/[0.06] bg-[#0d0d0f] transition-transform duration-300 ease-in-out ${
      sidebarOpen
        ? "translate-x-0"
        : "-translate-x-full"
    }`}
  >
    {/* BRAND */}

    <div className="flex h-20 items-center gap-3 border-b border-white/[0.06] px-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-black shadow-lg">
        <Sparkles size={19} strokeWidth={2.2} />
      </div>

      <div>
        <div className="text-sm font-semibold tracking-tight">
          RAG Intelligence
        </div>

        <div className="text-[11px] text-zinc-500">
          Document Intelligence
        </div>
      </div>

      <button
        onClick={() => setSidebarOpen(false)}
        title="Close sidebar"
        className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/[0.06] hover:text-white"
      >
        <X size={18} />
      </button>
    </div>

    {/* NEW CHAT */}

    <div className="px-4 pt-5">
      <button
        onClick={startNewChat}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
      >
        <Plus size={17} />
        New Chat
      </button>
    </div>

    {/* NAVIGATION */}

    <nav className="px-3 pt-7">
      <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
        Workspace
      </div>

      <button
        onClick={() => navigate("chat")}
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
          activePage === "chat"
            ? "bg-white/[0.07] text-white"
            : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"
        }`}
      >
        <MessageSquare size={17} />
        Ask Documents
      </button>

      <button
        onClick={() => navigate("documents")}
        className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
          activePage === "documents"
            ? "bg-white/[0.07] text-white"
            : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"
        }`}
      >
        <FileText size={17} />
        Documents
      </button>

      <button
        onClick={() => navigate("search")}
        className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
          activePage === "search"
            ? "bg-white/[0.07] text-white"
            : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"
        }`}
      >
        <Search size={17} />
        Search
      </button>
    </nav>

    {/* SIDEBAR CONTENT */}

    <div className="min-h-0 flex-1 overflow-y-auto">

      {/* RECENT CHATS */}

      <ChatHistory
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelect={selectConversation}
        onDelete={deleteConversation}
      />

      {/* COMMON DOCUMENTS */}

      <div className="px-3 pt-6">
        <div className="mb-2 flex items-center justify-between px-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
            Documents
          </div>

          <button
            onClick={() => navigate("documents")}
            title="Open documents"
            className="rounded-md p-1 text-zinc-700 transition hover:bg-white/[0.06] hover:text-zinc-400"
          >
            <ChevronRight size={13} />
          </button>
        </div>

        {loadingDocuments && (
          <div className="flex items-center gap-2 px-3 py-4 text-xs text-zinc-600">
            <Loader2
              size={13}
              className="animate-spin"
            />
            Loading documents...
          </div>
        )}

        {!loadingDocuments &&
          documents.length === 0 && (
            <div className="px-3 py-4 text-xs text-zinc-700">
              No documents
            </div>
          )}

        {!loadingDocuments &&
          documents.length > 0 && (
            <div className="space-y-1">
              {documents.map(
                (document, index) => {
                  const filename =
                    document.filename ||
                    document.name ||
                    `Document ${index + 1}`;

                  const isActive =
                    uploadResult?.filename ===
                    filename;

                  return (
                    <div
                      key={`${filename}-${index}`}
                      className={`group flex items-center rounded-xl transition ${
                        isActive
                          ? "bg-emerald-400/[0.06]"
                          : "hover:bg-white/[0.04]"
                      }`}
                    >
                      <button
                        onClick={() =>
                          selectDocument(document)
                        }
                        className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left"
                      >
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                            isActive
                              ? "bg-emerald-400/10"
                              : "bg-white/[0.04]"
                          }`}
                        >
                          <FileText
                            size={14}
                            className={
                              isActive
                                ? "text-emerald-400"
                                : "text-zinc-600"
                            }
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div
                            className={`truncate text-xs ${
                              isActive
                                ? "text-emerald-300"
                                : "text-zinc-500"
                            }`}
                          >
                            {filename}
                          </div>

                          {isActive && (
                            <div className="mt-0.5 text-[9px] text-emerald-500/70">
                              Active
                            </div>
                          )}
                        </div>
                      </button>

                      <div className="mr-2 hidden shrink-0 items-center gap-1 group-hover:flex">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            renameDocument(filename);
                          }}
                          title={`Rename ${filename}`}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-700 transition hover:bg-white/[0.08] hover:text-zinc-300"
                        >
                          <MoreHorizontal size={13} />
                        </button>

                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteDocument(filename);
                          }}
                          title={`Delete ${filename}`}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-700 transition hover:bg-red-400/10 hover:text-red-400"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
      </div>
    </div>

    {/* SYSTEM STATUS */}

    <div className="mt-auto shrink-0 p-4">
      <div className="mb-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-400">
            System Status
          </span>

          <Activity
            size={15}
            className="text-emerald-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]" />

          <span className="text-xs text-zinc-300">
            API Connected
          </span>
        </div>

        <div className="mt-2 text-[11px] text-zinc-600">
          localhost:5050
        </div>
      </div>

      <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-zinc-400 transition hover:bg-white/[0.04] hover:text-white">
        <Settings size={17} />
        Settings
      </button>
    </div>
  </aside>
</>

);
}
/* ============================================================
SIDEBAR CONTROLS
============================================================ */
function SidebarControls({
sidebarOpen,
setSidebarOpen,
setActivePage,
}) {
return (
<div
className={`fixed top-4 z-50 flex items-center gap-1 rounded-xl border border-white/[0.08] bg-[#0f0f12]/95 p-1 shadow-2xl backdrop-blur-xl transition-all duration-300 ${
        sidebarOpen
          ? "left-[272px]"
          : "left-4"
      }`}
>
<button
onClick={() =>
setSidebarOpen((open) => !open)
}
title={
sidebarOpen
? "Close sidebar"
: "Open sidebar"
}
className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition hover/[0.07] hover"
>
{sidebarOpen ? (
<X size={18} />
) : (
<MessageSquare size={18} />
)}
</button>

  <button
    onClick={() => {
      setActivePage("search");
      setSidebarOpen(true);
    }}
    title="Search"
    className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-white/[0.07] hover:text-white"
  >
    <Search size={18} />
  </button>
</div>

);
}
/* ============================================================
HEADER
============================================================ */
function Header({
title,
subtitle,
onUpload,
}) {
return (
<header className="relative z-20 flex h-20 items-center justify-between border-b border-white/[0.06] px-6 lg\:px-10">
<div>
<div className="text-sm font-medium text-zinc-300">
{title}
</div>

    <div className="mt-0.5 text-xs text-zinc-600">
      {subtitle}
    </div>
  </div>

  <div className="flex items-center gap-3">
    <div className="hidden items-center gap-2 rounded-full border border-emerald-400/10 bg-emerald-400/[0.05] px-3 py-1.5 sm:flex">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

      <span className="text-[11px] text-emerald-300">
        System online
      </span>
    </div>

    <button
      onClick={onUpload}
      className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
    >
      <Upload size={15} />
      Upload PDF
    </button>
  </div>
</header>

);
}
/* ============================================================
UPLOAD AREA
============================================================ */
function UploadArea({
fileInputRef,
selectedFile,
uploading,
uploadResult,
uploadError,
dragActive,
handleInputChange,
handleDragOver,
handleDragLeave,
handleDrop,
uploadPDF,
clearSelection,
openFilePicker,
}) {
return (
<>
<div
onDragOver={handleDragOver}
onDragLeave={handleDragLeave}
onDrop={handleDrop}
onClick={openFilePicker}
className={`group cursor-pointer rounded-3xl border border-dashed p-8 text-left transition duration-300 sm:p-10 ${
          dragActive
            ? "border-white/40 bg-white/[0.07]"
            : "border-white/[0.12] bg-white/[0.025] hover:border-white/[0.22] hover:bg-white/[0.04]"
        }`}
>
<div className="flex flex-col items-center justify-center text-center">
<div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06] text-zinc-300 transition duration-300 group-hover\:scale-105 group-hover\:bg-white/[0.09]">
{uploading ? (
<Loader2
  size={23}
  className="animate-spin"
/>
) : (
<Upload size={23} />
)}
</div>

      {!selectedFile && !uploading && (
        <>
          <div className="text-sm font-medium text-zinc-200">
            Drop a PDF here
          </div>

          <div className="mt-2 text-xs text-zinc-600">
            or click to browse your files
          </div>
        </>
      )}

      {selectedFile && !uploading && (
        <>
          <div className="flex items-center gap-3">
            <FileText
              size={18}
              className="text-zinc-300"
            />

            <span className="max-w-[300px] truncate text-sm font-medium text-zinc-200">
              {selectedFile.name}
            </span>

            <button
              onClick={(event) => {
                event.stopPropagation();
                clearSelection();
              }}
              className="rounded-full p-1 text-zinc-500 transition hover:bg-white/[0.08] hover:text-white"
            >
              <X size={15} />
            </button>
          </div>

          <div className="mt-2 text-xs text-zinc-600">
            {(
              selectedFile.size /
              (1024 * 1024)
            ).toFixed(2)}{" "}
            MB
          </div>

          <button
            onClick={(event) => {
              event.stopPropagation();
              uploadPDF();
            }}
            className="mt-5 rounded-xl bg-white px-5 py-2.5 text-xs font-semibold text-black transition hover:bg-zinc-200"
          >
            Process PDF
          </button>
        </>
      )}

      {uploading && (
        <>
          <div className="text-sm font-medium text-zinc-200">
            Processing document...
          </div>

          <div className="mt-2 text-xs text-zinc-600">
            Extracting text, generating embeddings and storing chunks
          </div>
        </>
      )}

      {!selectedFile && !uploading && (
        <div className="mt-5 rounded-full border border-white/[0.06] bg-black/20 px-3 py-1 text-[10px] uppercase tracking-wider text-zinc-600">
          PDF documents
        </div>
      )}
    </div>
  </div>

  <input
    ref={fileInputRef}
    type="file"
    accept=".pdf,application/pdf"
    onChange={handleInputChange}
    className="hidden"
  />

  {uploadError && (
    <div className="mt-4 rounded-2xl border border-red-400/10 bg-red-400/[0.05] px-4 py-3 text-xs text-red-300">
      {uploadError}
    </div>
  )}

  {uploadResult && (
    <div className="mt-4 rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.05] p-4">
      <div className="flex items-start gap-3">
        <CheckCircle2
          size={18}
          className="mt-0.5 shrink-0 text-emerald-400"
        />

        <div>
          <div className="text-sm font-medium text-emerald-200">
            Active document:
          </div>

          <div className="mt-1 text-xs text-zinc-500">
            {uploadResult.filename}
          </div>

          <div className="mt-1 text-[11px] text-zinc-600">
            Questions will be answered using this document only.
          </div>
        </div>
      </div>
    </div>
  )}
</>

);
}
/* ============================================================
CHAT PAGE
============================================================ */
function ChatPage({
sidebarOpen,
uploadResult,
fileInputRef,
selectedFile,
uploading,
uploadError,
dragActive,
handleInputChange,
handleDragOver,
handleDragLeave,
handleDrop,
uploadPDF,
clearSelection,
openFilePicker,
messages,
asking,
question,
setQuestion,
askQuestion,
handleKeyDown,
queryError,
messagesEndRef,
}) {

return (
<main
className={`relative min-h-screen flex-1 overflow-hidden transition-[margin] duration-300 ${
        sidebarOpen
          ? "md:ml-[260px]"
          : "md:ml-0"
      }`}
>
<div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-violet-500/[0.05] blur-[120px]" />

  <Header
    title="Document Workspace"
    subtitle={
      uploadResult?.filename
        ? `Active: ${uploadResult.filename}`
        : "AI-powered retrieval and analysis"
    }
    onUpload={openFilePicker}
  />

  <div className="relative z-10 h-[calc(100vh-80px)] overflow-y-auto pb-48">
    <section className="px-6 py-12 lg:px-10">
      <div className="mx-auto w-full max-w-5xl">
        {messages.length === 0 && (
          <div className="mb-10 text-center">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] shadow-2xl">
              <Database
                size={24}
                className="text-zinc-200"
              />
            </div>

            <h1 className="text-4xl font-semibold tracking-[-0.035em] text-white sm:text-5xl">
              Ask anything about
              <span className="block bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
                your documents.
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-zinc-500 sm:text-base">
              Upload a PDF and ask questions using grounded semantic retrieval and document intelligence.
            </p>
          </div>
        )}

        <UploadArea
          fileInputRef={fileInputRef}
          selectedFile={selectedFile}
          uploading={uploading}
          uploadResult={uploadResult}
          uploadError={uploadError}
          dragActive={dragActive}
          handleInputChange={handleInputChange}
          handleDragOver={handleDragOver}
          handleDragLeave={handleDragLeave}
          handleDrop={handleDrop}
          uploadPDF={uploadPDF}
          clearSelection={clearSelection}
          openFilePicker={openFilePicker}
        />

        {messages.length > 0 && (
          <div className="mt-10 space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] ${
                    message.role === "user"
                      ? "sm:max-w-[70%]"
                      : "w-full"
                  }`}
                >
                  {message.role === "user" && (
                    <div className="rounded-2xl rounded-br-md bg-white px-5 py-4 text-sm leading-6 text-black shadow-lg">
                      <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                        <User size={13} />
                        You
                      </div>

                      {message.content}
                    </div>
                  )}

                  {message.role === "assistant" && (
                    <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6">
                      <div className="mb-4 flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06]">
                          <Bot
                            size={16}
                            className="text-zinc-300"
                          />
                        </div>

                        <div className="text-xs font-medium text-zinc-400">
                          RAG Intelligence
                        </div>
                      </div>

                      <div
                        className={`whitespace-pre-wrap text-sm leading-7 ${
                          message.error
                            ? "text-red-300"
                            : "text-zinc-200"
                        }`}
                      >
                        {message.content}
                      </div>

                      {message.sources &&
                        message.sources.length > 0 && (
                          <div className="mt-6">
                            <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                              Sources
                            </div>

                            <div className="space-y-2">
                              {message.sources.map(
                                (
                                  source,
                                  index
                                ) => (
                                  <div
                                    key={`${source.filename}-${source.chunkIndex}-${index}`}
                                    className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-black/20 px-4 py-3"
                                  >
                                    <div className="flex min-w-0 items-center gap-3">
                                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
                                        <FileText
                                          size={14}
                                          className="text-zinc-500"
                                        />
                                      </div>

                                      <div className="min-w-0">
                                        <div className="truncate text-xs font-medium text-zinc-400">
                                          {source.filename}
                                        </div>

                                        <div className="mt-0.5 text-[10px] text-zinc-600">
                                          Chunk{" "}
                                          {
                                            source.chunkIndex
                                          }
                                        </div>
                                      </div>
                                    </div>

                                    <div className="ml-4 shrink-0 text-right">
                                      <div className="text-[9px] uppercase tracking-wider text-zinc-700">
                                        Match
                                      </div>

                                      <div className="text-xs font-medium text-zinc-500">
                                        {source.similarity
                                          ? `${(
                                              source.similarity *
                                              100
                                            ).toFixed(1)}%`
                                          : "—"}
                                      </div>
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {asking && (
              <div className="flex justify-start">
                <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] px-6 py-5">
                  <div className="flex items-center gap-3">
                    <Loader2
                      size={16}
                      className="animate-spin text-zinc-500"
                    />

                    <span className="text-xs text-zinc-500">
                      Searching the selected document and generating an answer...
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

      </div>
    </section>
  </div>

  {/* FIXED CHAT BOX */}

  <div
    className={`fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06] bg-[#09090b]/90 px-4 py-4 backdrop-blur-xl transition-[left] duration-300 ${
      sidebarOpen
        ? "md:left-[260px]"
        : "md:left-0"
    } lg:px-10`}
  >
    <div className="mx-auto w-full max-w-5xl">
      {queryError && (
        <div className="mb-3 rounded-xl border border-red-400/10 bg-red-400/[0.05] px-4 py-2.5 text-xs text-red-300">
          {queryError}
        </div>
      )}

      <div className="relative rounded-2xl border border-white/[0.08] bg-[#0f0f12] shadow-2xl">
        <textarea
          value={question}
          onChange={(event) =>
            setQuestion(
              event.target.value
            )
          }
          onKeyDown={handleKeyDown}
          disabled={asking}
          rows={3}
          placeholder="Ask a question about your document..."
          className="w-full resize-none bg-transparent px-5 py-4 pr-16 text-sm leading-6 text-white outline-none placeholder:text-zinc-600 disabled:cursor-not-allowed"
        />

        <button
          onClick={() =>
            askQuestion()
          }
          disabled={
            !question.trim() ||
            asking
          }
          className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {asking ? (
            <Loader2
              size={18}
              className="animate-spin"
            />
          ) : (
            <Send size={18} />
          )}
        </button>

        <div className="px-5 pb-3 text-[10px] text-zinc-600">
          Enter to send · Shift + Enter for a new line
        </div>
      </div>
    </div>
  </div>
</main>

);
}
/* ============================================================
DOCUMENTS PAGE
============================================================ */
function DocumentsPage({
sidebarOpen,
loadDocuments,
loadingDocuments,
documents,
documentsError,
uploadResult,
selectDocument,
deleteDocument,
renameDocument,
navigate,
openFilePicker,
}) {
return (
<main
className={`relative min-h-screen flex-1 overflow-hidden transition-[margin] duration-300 ${
        sidebarOpen
          ? "md:ml-[260px]"
          : "md:ml-0"
      }`}
>
<div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-violet-500/[0.05] blur-[120px]" />

  <Header
    title="Documents"
    subtitle="Manage indexed documents"
    onUpload={openFilePicker}
  />

  <div className="relative z-10 h-[calc(100vh-80px)] overflow-y-auto">
    <section className="px-6 py-10 lg:px-10">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Your documents
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              Click a document to make it active for RAG queries.
            </p>
          </div>

          <button
            onClick={loadDocuments}
            className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-xs text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
          >
            <RefreshCw
              size={14}
              className={
                loadingDocuments
                  ? "animate-spin"
                  : ""
              }
            />
            Refresh
          </button>
        </div>

        {documentsError && (
          <div className="rounded-2xl border border-red-400/10 bg-red-400/[0.05] p-5 text-sm text-red-300">
            {documentsError}
          </div>
        )}

        {loadingDocuments && (
          <div className="flex items-center justify-center rounded-3xl border border-white/[0.06] bg-white/[0.02] py-20">
            <div className="flex items-center gap-3 text-sm text-zinc-500">
              <Loader2
                size={18}
                className="animate-spin"
              />
              Loading documents...
            </div>
          </div>
        )}

        {!loadingDocuments &&
          !documentsError &&
          documents.length === 0 && (
            <div className="rounded-3xl border border-dashed border-white/[0.08] bg-white/[0.02] px-6 py-20 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04]">
                <FileText
                  size={24}
                  className="text-zinc-500"
                />
              </div>

              <div className="text-sm font-medium text-zinc-300">
                No documents found
              </div>

              <div className="mx-auto mt-2 max-w-md text-xs leading-5 text-zinc-600">
                Upload a PDF from the Ask Documents page to start building your document knowledge base.
              </div>

              <button
                onClick={() =>
                  navigate("chat")
                }
                className="mt-6 rounded-xl bg-white px-5 py-2.5 text-xs font-semibold text-black transition hover:bg-zinc-200"
              >
                Upload a document
              </button>
            </div>
          )}

        {!loadingDocuments &&
          documents.length > 0 && (
            <div className="grid gap-3">
              {documents.map(
                (
                  document,
                  index
                ) => {
                  const filename =
                    document.filename ||
                    document.name ||
                    `Document ${index + 1}`;

                  const pages =
                    document.pages ||
                    document.pageCount ||
                    "—";

                  const chunks =
                    document.chunks ||
                    document.chunkCount ||
                    "—";

                  const isActive =
                    uploadResult?.filename ===
                    filename;

                  return (
                    <div
                      key={
                        document.id ||
                        `${filename}-${index}`
                      }
                      className={`group rounded-2xl border p-5 transition ${
                        isActive
                          ? "border-emerald-400/20 bg-emerald-400/[0.04]"
                          : "border-white/[0.06] bg-white/[0.025] hover:border-white/[0.12] hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-5">
                        <button
                          onClick={() =>
                            selectDocument(
                              document
                            )
                          }
                          className="flex min-w-0 flex-1 items-center gap-4 text-left"
                        >
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/[0.05]">
                            <FileText
                              size={21}
                              className={
                                isActive
                                  ? "text-emerald-400"
                                  : "text-zinc-400"
                              }
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="truncate text-sm font-medium text-zinc-200">
                                {filename}
                              </div>

                              {isActive && (
                                <span className="shrink-0 rounded-full bg-emerald-400/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-emerald-400">
                                  Active
                                </span>
                              )}
                            </div>

                            <div className="mt-1 text-xs text-zinc-600">
                              {pages} pages ·{" "}
                              {chunks} chunks
                            </div>

                            {document.uploadDate && (
                              <div className="mt-1 text-[10px] text-zinc-700">
                                Uploaded{" "}
                                {new Date(
                                  document.uploadDate
                                ).toLocaleDateString(
                                  undefined,
                                  {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  }
                                )}
                              </div>
                            )}
                          </div>
                        </button>

                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            onClick={() =>
                              renameDocument(filename)
                            }
                            title="Rename document"
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 transition hover:bg-white/[0.06] hover:text-zinc-300"
                          >
                            <MoreHorizontal size={16} />
                          </button>

                          <button
                            onClick={() =>
                              deleteDocument(filename)
                            }
                            title="Delete document"
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 transition hover:bg-red-400/10 hover:text-red-400"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
      </div>
    </section>
  </div>
</main>

);
}
/* ============================================================
SEARCH PAGE
============================================================ */
function SearchPage({
sidebarOpen,
uploadResult,
searchQuery,
setSearchQuery,
searching,
searchDocuments,
handleSearchKeyDown,
searchError,
searchResults,
openFilePicker,
}) {
return (
<main
className={`relative min-h-screen flex-1 overflow-hidden transition-[margin] duration-300 ${
        sidebarOpen
          ? "md:ml-[260px]"
          : "md:ml-0"
      }`}
>
<div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-violet-500/[0.05] blur-[120px]" />

  <Header
    title="Search"
    subtitle="Find information across indexed documents"
    onUpload={openFilePicker}
  />

  <div className="relative z-10 h-[calc(100vh-80px)] overflow-y-auto">
    <section className="px-6 py-12 lg:px-10">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]">
            <FileSearch
              size={24}
              className="text-zinc-300"
            />
          </div>

          <h1 className="text-3xl font-semibold tracking-tight">
            Search your knowledge base
          </h1>

          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-zinc-500">
            Search indexed document content using the same retrieval pipeline used by the RAG assistant.
          </p>
        </div>

        <div className="relative">
          <Search
            size={18}
            className="absolute left-5 top-5 text-zinc-600"
          />

          <input
            value={searchQuery}
            onChange={(event) =>
              setSearchQuery(
                event.target.value
              )
            }
            onKeyDown={
              handleSearchKeyDown
            }
            placeholder={
              uploadResult?.filename
                ? `Search ${uploadResult.filename}...`
                : "Search for something in your documents..."
            }
            className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.025] py-4 pl-12 pr-32 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-white/[0.16]"
          />

          <button
            onClick={searchDocuments}
            disabled={
              !searchQuery.trim() ||
              searching
            }
            className="absolute right-2 top-2 flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-xs font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {searching ? (
              <Loader2
                size={14}
                className="animate-spin"
              />
            ) : (
              <Search size={14} />
            )}
            Search
          </button>
        </div>

        {searchError && (
          <div className="mt-4 rounded-2xl border border-red-400/10 bg-red-400/[0.05] p-4 text-xs text-red-300">
            {searchError}
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="mt-8 space-y-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
              Search result
            </div>

            {searchResults.map(
              (
                result,
                index
              ) => (
                <div
                  key={index}
                  className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6"
                >
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06]">
                      <Bot
                        size={16}
                        className="text-zinc-400"
                      />
                    </div>

                    <span className="text-xs text-zinc-500">
                      Retrieved answer
                    </span>
                  </div>

                  <div className="whitespace-pre-wrap text-sm leading-7 text-zinc-200">
                    {result.answer}
                  </div>

                  {result.sources?.length >
                    0 && (
                    <div className="mt-6">
                      <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                        Relevant chunks
                      </div>

                      <div className="space-y-2">
                        {result.sources.map(
                          (
                            source,
                            sourceIndex
                          ) => (
                            <div
                              key={
                                sourceIndex
                              }
                              className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-black/20 px-4 py-3"
                            >
                              <div className="flex items-center gap-3">
                                <FileText
                                  size={15}
                                  className="text-zinc-600"
                                />

                                <div>
                                  <div className="text-xs text-zinc-400">
                                    {
                                      source.filename
                                    }
                                  </div>

                                  <div className="mt-0.5 text-[10px] text-zinc-700">
                                    Chunk{" "}
                                    {
                                      source.chunkIndex
                                    }
                                  </div>
                                </div>
                              </div>

                              <div className="text-xs text-zinc-600">
                                {source.similarity
                                  ? `${(
                                      source.similarity *
                                      100
                                    ).toFixed(
                                      1
                                    )}% match`
                                  : "Match unavailable"}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </div>
    </section>
  </div>
</main>

);
}
/* ============================================================
MAIN APP
============================================================ */
function App() {
const fileInputRef =
useRef(null);
const messagesEndRef =
useRef(null);
/* ============================================================
PAGE
============================================================ */
const [activePage, setActivePage] =
useState("chat");
const [sidebarOpen, setSidebarOpen] =
useState(true);
/* ============================================================
UPLOAD
============================================================ */
const [selectedFile, setSelectedFile] =
useState(null);
const [uploading, setUploading] =
useState(false);
const [uploadResult, setUploadResult] =
useState(null);
const [uploadError, setUploadError] =
useState("");
const [dragActive, setDragActive] =
useState(false);
/* ============================================================
CHAT
============================================================ */
const [question, setQuestion] =
useState("");
const [asking, setAsking] =
useState(false);
const [queryError, setQueryError] =
useState("");
const [messages, setMessages] =
useState([]);
/* ============================================================
CHAT HISTORY
============================================================ */
const [conversations, setConversations] =
useState(() => {
try {
const saved =
localStorage.getItem(
"rag_conversations"
);

    return saved
      ? JSON.parse(saved)
      : [];
  } catch {
    return [];
  }
});

const [
activeConversationId,
setActiveConversationId,
] = useState(null);
/* ============================================================
DOCUMENTS
============================================================ */
const [documents, setDocuments] =
useState([]);
const [
loadingDocuments,
setLoadingDocuments,
] = useState(false);
const [
documentsError,
setDocumentsError,
] = useState("");
/* ============================================================
DELETE MODAL
============================================================ */
const [
deleteTarget,
setDeleteTarget,
] = useState(null);
const [
deletingDocument,
setDeletingDocument,
] = useState(false);

/* ============================================================
RENAME DOCUMENT
============================================================ */
const [
renameTarget,
setRenameTarget,
] = useState(null);

const [
renameValue,
setRenameValue,
] = useState("");

const [
renamingDocument,
setRenamingDocument,
] = useState(false);

/* ============================================================
SEARCH
============================================================ */
const [searchQuery, setSearchQuery] =
useState("");
const [searching, setSearching] =
useState(false);
const [searchResults, setSearchResults] =
useState([]);
const [searchError, setSearchError] =
useState("");
/* ============================================================
SAVE CHAT HISTORY
============================================================ */
useEffect(() => {
try {
localStorage.setItem(
"rag_conversations",
JSON.stringify(
conversations
)
);
} catch (error) {
console.error(
"Failed to save chat history:",
error
);
}
}, [conversations]);
/* ============================================================
LOAD DOCUMENTS
============================================================ */
const loadDocuments =
async () => {
setLoadingDocuments(true);
setDocumentsError("");

  try {
    const response =
      await fetch(
        `${API_URL}/api/documents`
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          "Unable to load documents."
      );
    }

    const list =
      data.documents ||
      data.data ||
      data.results ||
      [];

    setDocuments(
      Array.isArray(list)
        ? list
        : []
    );
  } catch (error) {
    console.error(
      "Documents load failed:",
      error
    );

    setDocumentsError(
      error.message ||
        "Unable to load documents."
    );
  } finally {
    setLoadingDocuments(
      false
    );
  }
};

/* ============================================================
LOAD DOCUMENTS ON START
============================================================ */
useEffect(() => {
loadDocuments();
}, []);
/* ============================================================
FILE HANDLING
============================================================ */
const openFilePicker = () => {
fileInputRef.current?.click();
};
const handleFileSelect = (
file
) => {
setUploadError("");
setUploadResult(null);

if (!file) return;

if (
  file.type !==
    "application/pdf" &&
  !file.name
    .toLowerCase()
    .endsWith(".pdf")
) {
  setUploadError(
    "Only PDF files are allowed."
  );

  return;
}

setSelectedFile(file);

};
const handleInputChange = (
event
) => {
const file =
event.target.files?.[0];

if (file) {
  handleFileSelect(file);
}

event.target.value = "";

};
const handleDragOver = (
event
) => {
event.preventDefault();
setDragActive(true);
};
const handleDragLeave = (
event
) => {
event.preventDefault();
setDragActive(false);
};
const handleDrop = (
event
) => {
event.preventDefault();
setDragActive(false);

const file =
  event.dataTransfer.files?.[0];

if (file) {
  handleFileSelect(file);
}

};
/* ============================================================
UPLOAD PDF
============================================================ */
const uploadPDF = async () => {
if (
!selectedFile ||
uploading
) {
return;
}

setUploading(true);
setUploadError("");
setUploadResult(null);
setQueryError("");

try {
  const formData =
    new FormData();

  formData.append(
    "pdf",
    selectedFile
  );

  const response =
    await fetch(
      `${API_URL}/api/documents/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

  const data =
    await response.json();

  if (
    !response.ok ||
    data.status !== "OK"
  ) {
    throw new Error(
      data.message ||
        "PDF upload failed."
    );
  }

  setUploadResult(data);
  setSelectedFile(null);
  setMessages([]);

  await loadDocuments();

} catch (error) {
  console.error(
    "Upload failed:",
    error
  );

  setUploadError(
    error.message ||
      "Unable to connect to the backend."
  );
} finally {
  setUploading(false);
}

};
const clearSelection = () => {
if (uploading) return;

setSelectedFile(null);
setUploadResult(null);
setUploadError("");

};
/* ============================================================
OPEN DELETE MODAL
============================================================ */
const deleteDocument = (
filename
) => {
if (!filename) return;

setDeleteTarget(filename);

};
/* ============================================================
CONFIRM DELETE DOCUMENT
============================================================ */
const confirmDeleteDocument =
async () => {
if (
!deleteTarget ||
deletingDocument
) {
return;
}

  const filename =
    deleteTarget;

  setDeletingDocument(true);

  try {
    const response =
      await fetch(
        `${API_URL}/api/documents/${encodeURIComponent(
          filename
        )}`,
        {
          method: "DELETE",
        }
      );

    const data =
      await response.json();

    if (
      !response.ok ||
      data.status !== "OK"
    ) {
      throw new Error(
        data.message ||
          "Failed to delete document."
      );
    }

    /* Remove immediately from UI */

    setDocuments((prev) =>
      prev.filter(
        (document) =>
          (document.filename ||
            document.name) !==
          filename
      )
    );

    /* Clear active document */

    if (
      uploadResult?.filename ===
      filename
    ) {
      setUploadResult(null);
      setMessages([]);
      setQuestion("");
      setQueryError("");
      setActiveConversationId(
        null
      );
    }

    /* Close modal */

    setDeleteTarget(null);

    /* Refresh from backend */

    await loadDocuments();

  } catch (error) {
    console.error(
      "Delete document failed:",
      error
    );

    alert(
      error.message ||
        "Failed to delete document."
    );

  } finally {
    setDeletingDocument(
      false
    );
  }
};

/* ============================================================
RENAME DOCUMENT
============================================================ */

const renameDocument = (
filename
) => {
if (!filename) return;

const baseName =
filename.toLowerCase().endsWith(".pdf")
? filename.slice(0, -4)
: filename;

setRenameTarget(filename);
setRenameValue(baseName);
};

const confirmRenameDocument =
async () => {
if (
!renameTarget ||
!renameValue.trim() ||
renamingDocument
) {
return;
}

let newFilename =
renameValue.trim();

if (
!newFilename
.toLowerCase()
.endsWith(".pdf")
) {
newFilename += ".pdf";
}

if (
newFilename ===
renameTarget
) {
setRenameTarget(null);
setRenameValue("");
return;
}

setRenamingDocument(true);

try {
const response =
await fetch(
`${API_URL}/api/documents/${encodeURIComponent(
renameTarget
)}`,
{
method: "PUT",
headers: {
"Content-Type":
"application/json",
},
body: JSON.stringify({
newFilename,
}),
}
);

const data =
await response.json();

if (
!response.ok ||
data.status !== "OK"
) {
throw new Error(
data.message ||
"Failed to rename document."
);
}

setDocuments((prev) =>
prev.map((document) => {
const currentFilename =
document.filename ||
document.name;

if (
currentFilename !==
renameTarget
) {
return document;
}

return {
...document,
filename:
newFilename,
};
})
);

if (
uploadResult?.filename ===
renameTarget
) {
setUploadResult(
(previous) => ({
...previous,
filename:
newFilename,
})
);
}

setConversations((prev) =>
prev.map((conversation) => {
if (
conversation.uploadResult
?.filename !==
renameTarget
) {
return conversation;
}

return {
...conversation,
uploadResult: {
...conversation.uploadResult,
filename:
newFilename,
},
};
})
);

setRenameTarget(null);
setRenameValue("");

await loadDocuments();

} catch (error) {
console.error(
"Rename document failed:",
error
);

alert(
error.message ||
"Failed to rename document."
);
} finally {
setRenamingDocument(
false
);
}
};

/* ============================================================
SAVE CONVERSATION
============================================================ */
const saveConversation = (
conversationId,
newMessages,
documentInfo
) => {
if (
!conversationId ||
!newMessages ||
newMessages.length === 0
) {
return;
}

const firstUserMessage =
  newMessages.find(
    (message) =>
      message.role ===
      "user"
  );

const title =
  firstUserMessage?.content ||
  "New Chat";

setConversations((prev) => {
  const exists =
    prev.some(
      (conversation) =>
        conversation.id ===
        conversationId
    );

  if (exists) {
    return prev.map(
      (conversation) =>
        conversation.id ===
        conversationId
          ? {
              ...conversation,
              title:
                conversation.title ===
                  "New Chat"
                  ? title
                  : conversation.title,
              messages:
                newMessages,
              uploadResult:
                documentInfo ||
                conversation.uploadResult ||
                null,
              updatedAt:
                Date.now(),
            }
          : conversation
    );
  }

  return [
    {
      id: conversationId,
      title,
      messages: newMessages,
      uploadResult:
        documentInfo ||
        null,
      updatedAt:
        Date.now(),
    },
    ...prev,
  ];
});

};
/* ============================================================
ASK QUESTION
============================================================ */
const askQuestion = async (
questionText = question
) => {
const trimmedQuestion =
questionText.trim();

if (
  !trimmedQuestion ||
  asking
) {
  return;
}

if (
  !uploadResult?.filename
) {
  setQueryError(
    "Please upload or select a PDF before asking a question."
  );

  return;
}

setQuestion("");
setQueryError("");
setAsking(true);

const conversationId =
  activeConversationId ||
  `chat-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

if (
  !activeConversationId
) {
  setActiveConversationId(
    conversationId
  );
}

const userMessage = {
  id: `user-${Date.now()}`,
  role: "user",
  content:
    trimmedQuestion,
};

const messagesAfterUser = [
  ...messages,
  userMessage,
];

setMessages(
  messagesAfterUser
);

try {
  const response =
    await fetch(
      `${API_URL}/api/query`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          question:
            trimmedQuestion,

          filename:
            uploadResult.filename,

          history: messages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      }
    );

  const data =
    await response.json();

  if (
    !response.ok ||
    data.status !== "OK"
  ) {
    throw new Error(
      data.message ||
        "Unable to get an answer."
    );
  }

  const assistantMessage = {
    id: `assistant-${Date.now()}`,
    role: "assistant",

    content:
      data.answer ||
      "I could not find an answer in the selected document.",

    sources:
      data.sources || [],

    filename:
      data.filename ||
      uploadResult.filename,
  };

  const updatedMessages = [
    ...messagesAfterUser,
    assistantMessage,
  ];

  setMessages(
    updatedMessages
  );

  saveConversation(
    conversationId,
    updatedMessages,
    uploadResult
  );

} catch (error) {
  console.error(
    "Query failed:",
    error
  );

  setQueryError(
    error.message ||
      "Unable to connect to the backend."
  );

  const errorMessage = {
    id: `error-${Date.now()}`,
    role: "assistant",
    content:
      "I couldn't process that question. Please make sure the backend is running and try again.",
    error: true,
  };

  const updatedMessages = [
    ...messagesAfterUser,
    errorMessage,
  ];

  setMessages(
    updatedMessages
  );

  saveConversation(
    conversationId,
    updatedMessages,
    uploadResult
  );

} finally {
  setAsking(false);
}

};
const handleKeyDown = (
event
) => {
if (
event.key === "Enter" &&
!event.shiftKey
) {
event.preventDefault();
askQuestion();
}
};
/* ============================================================
NEW CHAT
============================================================ */
const startNewChat = () => {
setMessages([]);
setQuestion("");
setQueryError("");
setActiveConversationId(
null
);
setUploadResult(null);
setSelectedFile(null);
setUploadError("");
setActivePage("chat");
};
/* ============================================================
SELECT CHAT
============================================================ */
const selectConversation = (
conversationId
) => {
const conversation =
conversations.find(
(item) =>
item.id ===
conversationId
);

if (!conversation)
  return;

setActiveConversationId(
  conversationId
);

setMessages(
  conversation.messages ||
    []
);

setQuestion("");
setQueryError("");

if (
  conversation.uploadResult
) {
  setUploadResult(
    conversation.uploadResult
  );
} else {
  setUploadResult(null);
}

setActivePage("chat");

};
/* ============================================================
DELETE CHAT
============================================================ */
const deleteConversation = (
conversationId
) => {
setConversations((prev) =>
prev.filter(
(conversation) =>
conversation.id !==
conversationId
)
);

if (
  activeConversationId ===
  conversationId
) {
  setActiveConversationId(
    null
  );

  setMessages([]);
  setQuestion("");
  setQueryError("");
}

};
/* ============================================================
SELECT DOCUMENT
============================================================ */
const selectDocument = (
document
) => {
const filename =
document.filename ||
document.name;

if (!filename) return;

setUploadResult({
  filename,

  pages:
    document.pages ||
    document.pageCount ||
    0,

  chunks:
    document.chunks ||
    document.chunkCount ||
    0,

  uploadDate:
    document.uploadDate ||
    document.upload_date ||
    null,
});

setMessages([]);
setQuestion("");
setQueryError("");
setActiveConversationId(
  null
);

setActivePage("chat");

};
/* ============================================================
SEARCH
============================================================ */
const searchDocuments =
async () => {
const trimmedQuery =
searchQuery.trim();

  if (
    !trimmedQuery ||
    searching
  ) {
    return;
  }

  setSearching(true);
  setSearchError("");
  setSearchResults([]);

  try {
    const response =
      await fetch(
        `${API_URL}/api/query`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            question:
              trimmedQuery,

            filename:
              uploadResult?.filename ||
              null,
          }),
        }
      );

    const data =
      await response.json();

    if (
      !response.ok ||
      data.status !== "OK"
    ) {
      throw new Error(
        data.message ||
          "Search failed."
      );
    }

    setSearchResults([
      {
        answer:
          data.answer,

        sources:
          data.sources || [],
      },
    ]);

  } catch (error) {
    console.error(
      "Search failed:",
      error
    );

    setSearchError(
      error.message ||
        "Search failed."
    );

  } finally {
    setSearching(false);
  }
};

const handleSearchKeyDown = (
event
) => {
if (
event.key === "Enter"
) {
event.preventDefault();
searchDocuments();
}
};
/* ============================================================
CHAT AUTO SCROLL
============================================================ */
useEffect(() => {
messagesEndRef.current?.scrollIntoView(
{
behavior: "smooth",
block: "end",
}
);
}, [messages, asking]);
/* ============================================================
NAVIGATION
============================================================ */
const navigate = (page) => {
setActivePage(page);

if (
  page === "documents"
) {
  loadDocuments();
}

};
/* ============================================================
RENDER
============================================================ */
return (
<div className="min-h-screen overflow-x-hidden bg-[#09090b] text-white">

  <Sidebar
    sidebarOpen={
      sidebarOpen
    }
    setSidebarOpen={
      setSidebarOpen
    }
    activePage={
      activePage
    }
    navigate={navigate}
    startNewChat={
      startNewChat
    }
    uploadResult={
      uploadResult
    }
    conversations={
      conversations
    }
    activeConversationId={
      activeConversationId
    }
    selectConversation={
      selectConversation
    }
    deleteConversation={
      deleteConversation
    }
    documents={
      documents
    }
    loadingDocuments={
      loadingDocuments
    }
    selectDocument={
      selectDocument
    }
    deleteDocument={
      deleteDocument
    }
    renameDocument={
      renameDocument
    }
  />

  <SidebarControls
    sidebarOpen={
      sidebarOpen
    }
    setSidebarOpen={
      setSidebarOpen
    }
    setActivePage={
      setActivePage
    }
  />

  {activePage === "chat" && (
    <ChatPage
      sidebarOpen={
        sidebarOpen
      }
      uploadResult={
        uploadResult
      }
      fileInputRef={
        fileInputRef
      }
      selectedFile={
        selectedFile
      }
      uploading={
        uploading
      }
      uploadError={
        uploadError
      }
      dragActive={
        dragActive
      }
      handleInputChange={
        handleInputChange
      }
      handleDragOver={
        handleDragOver
      }
      handleDragLeave={
        handleDragLeave
      }
      handleDrop={
        handleDrop
      }
      uploadPDF={
        uploadPDF
      }
      clearSelection={
        clearSelection
      }
      openFilePicker={
        openFilePicker
      }
      messages={
        messages
      }
      asking={
        asking
      }
      question={
        question
      }
      setQuestion={
        setQuestion
      }
      askQuestion={
        askQuestion
      }
      handleKeyDown={
        handleKeyDown
      }
      queryError={
        queryError
      }
      messagesEndRef={
        messagesEndRef
      }
    />
  )}

  {activePage ===
    "documents" && (
    <DocumentsPage
      sidebarOpen={
        sidebarOpen
      }
      loadDocuments={
        loadDocuments
      }
      loadingDocuments={
        loadingDocuments
      }
      documents={
        documents
      }
      documentsError={
        documentsError
      }
      uploadResult={
        uploadResult
      }
      selectDocument={
        selectDocument
      }
      deleteDocument={
        deleteDocument
      }
      renameDocument={
        renameDocument
      }
      navigate={
        navigate
      }
      openFilePicker={
        openFilePicker
      }
    />
  )}

  {activePage ===
    "search" && (
    <SearchPage
      sidebarOpen={
        sidebarOpen
      }
      uploadResult={
        uploadResult
      }
      searchQuery={
        searchQuery
      }
      setSearchQuery={
        setSearchQuery
      }
      searching={
        searching
      }
      searchDocuments={
        searchDocuments
      }
      handleSearchKeyDown={
        handleSearchKeyDown
      }
      searchError={
        searchError
      }
      searchResults={
        searchResults
      }
      openFilePicker={
        openFilePicker
      }
    />
  )}

  {/* ========================================================
      DELETE DOCUMENT MODAL
  ======================================================== */}

  {deleteTarget && (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (
          event.target ===
            event.currentTarget &&
          !deletingDocument
        ) {
          setDeleteTarget(null);
        }
      }}
    >
      <div className="w-full max-w-md rounded-3xl border border-white/[0.08] bg-[#111113] p-6 shadow-2xl">

        <div className="flex items-start gap-4">

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-400/10">
            <Trash2
              size={19}
              className="text-red-400"
            />
          </div>

          <div className="min-w-0">
            <h2 className="text-base font-semibold text-white">
              Delete document?
            </h2>

            <p className="mt-2 break-words text-sm leading-6 text-zinc-400">
              Are you sure you want to delete{" "}
              <span className="font-medium text-zinc-200">
                {deleteTarget}
              </span>
              ?
            </p>

            <p className="mt-2 text-xs leading-5 text-zinc-600">
              This will permanently remove the
              document and all of its indexed
              chunks.
            </p>
          </div>

        </div>

        <div className="mt-7 flex justify-end gap-3">

          <button
            onClick={() => {
              if (
                !deletingDocument
              ) {
                setDeleteTarget(
                  null
                );
              }
            }}
            disabled={
              deletingDocument
            }
            className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-xs font-medium text-zinc-400 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Cancel
          </button>

          <button
            onClick={
              confirmDeleteDocument
            }
            disabled={
              deletingDocument
            }
            className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deletingDocument ? (
              <>
                <Loader2
                  size={14}
                  className="animate-spin"
                />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 size={14} />
                Delete
              </>
            )}
          </button>

        </div>
      </div>
    </div>
  )}

  {/* ========================================================
      RENAME DOCUMENT MODAL
  ======================================================== */}

  {renameTarget && (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (
          event.target ===
            event.currentTarget &&
          !renamingDocument
        ) {
          setRenameTarget(null);
          setRenameValue("");
        }
      }}
    >
      <div className="w-full max-w-md rounded-3xl border border-white/[0.08] bg-[#111113] p-6 shadow-2xl">

        <div className="flex items-start gap-4">

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
            <FileText
              size={19}
              className="text-zinc-300"
            />
          </div>

          <div className="min-w-0">
            <h2 className="text-base font-semibold text-white">
              Rename document
            </h2>

            <p className="mt-2 text-xs leading-5 text-zinc-600">
              Choose a new name for this document.
            </p>
          </div>

        </div>

        <div className="mt-6">

          <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
            Document name
          </label>

          <div className="flex items-center rounded-xl border border-white/[0.08] bg-black/20 px-4 focus-within:border-white/[0.16]">

            <input
              autoFocus
              value={renameValue}
              onChange={(event) =>
                setRenameValue(
                  event.target.value
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter"
                ) {
                  event.preventDefault();
                  confirmRenameDocument();
                }

                if (
                  event.key === "Escape"
                ) {
                  if (
                    !renamingDocument
                  ) {
                    setRenameTarget(
                      null
                    );
                    setRenameValue("");
                  }
                }
              }}
              disabled={
                renamingDocument
              }
              className="min-w-0 flex-1 bg-transparent py-3 text-sm text-white outline-none placeholder:text-zinc-700 disabled:opacity-50"
              placeholder="Document name"
            />

            <span className="text-xs text-zinc-700">
              .pdf
            </span>

          </div>

        </div>

        <div className="mt-7 flex justify-end gap-3">

          <button
            onClick={() => {
              if (
                !renamingDocument
              ) {
                setRenameTarget(
                  null
                );
                setRenameValue("");
              }
            }}
            disabled={
              renamingDocument
            }
            className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-xs font-medium text-zinc-400 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Cancel
          </button>

          <button
            onClick={
              confirmRenameDocument
            }
            disabled={
              renamingDocument ||
              !renameValue.trim()
            }
            className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {renamingDocument ? (
              <>
                <Loader2
                  size={14}
                  className="animate-spin"
                />
                Renaming...
              </>
            ) : (
              <>
                <CheckCircle2
                  size={14}
                />
                Rename
              </>
            )}
          </button>

        </div>
      </div>
    </div>
  )}

</div>

);
}
export default App;