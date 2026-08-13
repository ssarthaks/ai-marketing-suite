import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { CommandPalette } from "@/components/app-shell/command-palette";
import { Topbar } from "@/components/app-shell/topbar";
import { PageGuideModal } from "@/components/page-guide-modal";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { listUserWorkspaces, requireWorkspace } from "@/server/auth/session";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const scope = await requireWorkspace();
  const workspaces = await listUserWorkspaces(scope.userId);

  return (
    <SidebarProvider>
      <AppSidebar
        user={{ name: scope.name, email: scope.email }}
        workspaces={workspaces}
        activeWorkspaceId={scope.workspaceId}
      />
      <SidebarInset>
        <Topbar
          projectName={scope.workspaceName}
          isProject={Boolean(scope.productKey)}
        />
        <main className="min-w-0 flex-1 overflow-x-clip px-3 py-4 sm:px-4 sm:py-5 md:px-6 md:py-6 lg:px-8">
          <div className="min-w-0 max-w-full">{children}</div>
        </main>
      </SidebarInset>
      <CommandPalette />
    </SidebarProvider>
  );
}
