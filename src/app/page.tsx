"use client";

import { useState } from "react";
import TextbookPanel from "@/components/TextbookPanel";
import GraphView from "@/components/GraphView";
import RagPanel from "@/components/RagPanel";
import ChatPanel from "@/components/ChatPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
  const [selectedTextbookId, setSelectedTextbookId] = useState<string | null>(null);
  const selectedIds = selectedTextbookId ? [selectedTextbookId] : [];

  return (
    <div className="flex flex-1 h-full">
      {/* Left Panel: Textbook Management (30%) */}
      <aside className="w-[30%] min-w-[280px] border-r border-border bg-card flex flex-col">
        <TextbookPanel onSelect={setSelectedTextbookId} />
      </aside>

      {/* Center Panel: Knowledge Graph (50%) */}
      <main className="flex-1 flex flex-col min-w-0">
        <GraphView textbookId={selectedTextbookId} />
      </main>

      {/* Right Panel: RAG & Chat (20%) */}
      <aside className="w-[20%] min-w-[240px] border-l border-border bg-card flex flex-col">
        <Tabs defaultValue="rag" className="flex flex-col h-full">
          <TabsList className="mx-3 mt-3 grid w-auto grid-cols-2">
            <TabsTrigger value="rag">RAG 问答</TabsTrigger>
            <TabsTrigger value="chat">对话</TabsTrigger>
          </TabsList>
          <TabsContent value="rag" className="flex-1 m-0 overflow-hidden">
            <RagPanel textbookIds={selectedIds} />
          </TabsContent>
          <TabsContent value="chat" className="flex-1 m-0 overflow-hidden">
            <ChatPanel />
          </TabsContent>
        </Tabs>
      </aside>
    </div>
  );
}
