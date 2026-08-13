import type { Metadata } from "next";
import { requireWorkspace } from "@/server/auth/session";
import { query as sharedQuery } from "@/lib/db";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { ChatsClient } from "@/components/chat/chats-client";

export const metadata: Metadata = {
  title: "Chats from AiAgent - Project",
};

async function ChatsListFetch({
  productKey,
  userEmail,
  projectIdParam,
}: {
  productKey: string | null;
  userEmail: string;
  projectIdParam: string;
}) {
  let query = `
    SELECT t.id, t.title, t.updated_at as "updatedAt", t.created_at as "createdAt", t.project_id as "projectId" 
    FROM threads t
    JOIN users u ON t.user_id = u.id
    WHERE u.email = $1 AND t.project_id = $2
  `;
  const params: any[] = [userEmail, projectIdParam];

  if (productKey) {
    query += ` AND t.project_id = $3`;
    params.push(productKey);
  }

  query += ` ORDER BY updated_at DESC`;

  let threads: any[] = [];
  try {
    const result = await sharedQuery(query, params);
    threads = result.rows;
  } catch (err) {
    console.error("Failed to fetch threads:", err);
  }

  return (
    <ChatsClient
      threads={threads}
      productKey={productKey}
      initialProjectFilter={projectIdParam}
    />
  );
}

function ChatsLoading() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <Skeleton className="h-10 flex-1 w-full max-w-sm" />
        <Skeleton className="h-10 w-[180px]" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="flex flex-col h-full">
            <CardHeader className="pb-3 flex-1">
              <Skeleton className="h-5 w-3/4 mb-1.5" />
              <Skeleton className="h-3 w-1/2" />
            </CardHeader>
            <CardContent className="pb-4">
              <Skeleton className="h-4 w-1/3" />
            </CardContent>
            <div className="pt-0 pb-3 border-t px-6 pt-3 mt-auto bg-muted/20">
              <Skeleton className="h-3 w-1/4" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default async function ProjectChatsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const decodedProjectId = decodeURIComponent(projectId);
  const { productKey, email } = await requireWorkspace();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Chats from AiAgent
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Viewing AI conversations for project:{" "}
          <span className="font-medium text-foreground">
            {decodedProjectId}
          </span>
        </p>
      </div>

      <Suspense fallback={<ChatsLoading />}>
        <ChatsListFetch
          productKey={productKey}
          userEmail={email}
          projectIdParam={decodedProjectId}
        />
      </Suspense>
    </div>
  );
}
