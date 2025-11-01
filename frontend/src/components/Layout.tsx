import { ReactNode, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Bot, 
  Store, 
  Receipt, 
  BarChart3, 
  Shield, 
  Bell,
  Wallet,
  Plus,
  Search,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/contexts/WalletContext";
import CreateAgentDialog from "@/components/dialogs/CreateAgentDialog";
import CreateTaskDialog from "@/components/dialogs/CreateTaskDialog";
import SearchServicesDialog from "@/components/dialogs/SearchServicesDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Agents", href: "/agents", icon: Bot },
  { name: "Marketplace", href: "/marketplace", icon: Store },
  { name: "Transactions", href: "/transactions", icon: Receipt },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Security", href: "/security", icon: Shield },
];

function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showSearchServices, setShowSearchServices] = useState(false);

  return (
    <Sidebar className={state === "collapsed" ? "w-16" : "w-64"} collapsible="icon">
      <SidebarContent>
        <div className="p-4">
          {state !== "collapsed" && (
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="font-bold text-lg">AgentWallet</h2>
                <p className="text-xs text-muted-foreground">AI Management</p>
              </div>
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.href}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        }`}
                      >
                        <item.icon className="w-5 h-5" />
                        {state !== "collapsed" && <span>{item.name}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {state !== "collapsed" && (
          <>
            <Separator className="my-4" />
            <div className="px-4 space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground mb-3">
                Quick Actions
              </h3>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => setShowCreateAgent(true)}
              >
                <Plus className="w-4 h-4" />
                Create Agent
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => setShowCreateTask(true)}
              >
                <Plus className="w-4 h-4" />
                Create Task
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => setShowSearchServices(true)}
              >
                <Search className="w-4 h-4" />
                Search Services
              </Button>
            </div>
            <CreateAgentDialog open={showCreateAgent} onOpenChange={setShowCreateAgent} />
            <CreateTaskDialog open={showCreateTask} onOpenChange={setShowCreateTask} />
            <SearchServicesDialog open={showSearchServices} onOpenChange={setShowSearchServices} />
          </>
        )}
      </SidebarContent>
    </Sidebar>
  );
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const { account, balance, isConnecting, connectWallet, disconnectWallet } = useWallet();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="h-full px-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
              </div>
              
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5" />
                  <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 bg-destructive">
                    3
                  </Badge>
                </Button>
                
                {/* User email display */}
                {user && (
                  <div className="hidden md:flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{user.email}</span>
                  </div>
                )}
                
                {account ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <Wallet className="w-4 h-4" />
                        <div className="hidden md:flex flex-col items-start">
                          <span className="text-xs font-mono">
                            {account.slice(0, 6)}...{account.slice(-4)}
                          </span>
                          {balance && (
                            <span className="text-xs text-muted-foreground">
                              {balance} ETH
                            </span>
                          )}
                        </div>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={disconnectWallet}>
                        <LogOut className="w-4 h-4 mr-2" />
                        Disconnect
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  user && (
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={connectWallet}
                      disabled={isConnecting}
                    >
                      <Wallet className="w-4 h-4" />
                      <span className="hidden md:inline">
                        {isConnecting ? "Connecting..." : "Connect Wallet"}
                      </span>
                    </Button>
                  )
                )}
                
                {/* Logout button */}
                {user && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <LogOut className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={logout}>
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </header>
          
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
