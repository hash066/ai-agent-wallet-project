import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Settings, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CreateAgentDialog from "@/components/dialogs/CreateAgentDialog";
import AgentSettingsDialog from "@/components/dialogs/AgentSettingsDialog";

export default function Agents() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [settingsAgent, setSettingsAgent] = useState<{ id: number; name: string } | null>(null);
  const [agents, setAgents] = useState<Array<{ id: number; name: string }>>([
    { id: 1, name: "Agent-1" },
    { id: 2, name: "Agent-2" },
    { id: 3, name: "Agent-3" },
    { id: 4, name: "Agent-4" },
    { id: 5, name: "Agent-5" },
    { id: 6, name: "Agent-6" },
  ]);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAgentCreated = (agentName: string) => {
    // Add new agent to list with the actual name
    const maxId = Math.max(...agents.map(a => a.id));
    const newAgent = { id: maxId + 1, name: agentName };
    setAgents([...agents, newAgent]);
    setRefreshKey(prev => prev + 1);
    
    // Show confirmation
    toast({
      title: "🎉 New Agent Added!",
      description: `"${agentName}" has been added to your agents list below.`,
      duration: 4000,
    });
  };

  const handleDeleteAgent = (agentId: number) => {
    const agent = agents.find(a => a.id === agentId);
    setAgents(agents.filter(a => a.id !== agentId));
    toast({
      title: "Agent Deleted",
      description: `"${agent?.name || 'Agent'}" has been successfully deleted.`,
      variant: "destructive",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Agent Management</h1>
          <p className="text-muted-foreground">
            Register and configure your AI agents
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="w-4 h-4" />
          Register New Agent
        </Button>
      </div>

      <CreateAgentDialog open={showForm} onOpenChange={setShowForm} onAgentCreated={handleAgentCreated} />
      
      <AgentSettingsDialog
        open={!!settingsAgent}
        onOpenChange={(open) => !open && setSettingsAgent(null)}
        agentId={settingsAgent?.id.toString()}
        agentName={settingsAgent?.name}
      />

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4" key={refreshKey}>
        {agents.map((agent) => (
          <Card key={agent.id} className="hover:border-primary/50 transition-all">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{agent.name}</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSettingsAgent({ id: agent.id, name: agent.name })}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteAgent(agent.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <CardDescription>Trading Agent</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Balance</span>
                <span className="font-mono font-medium">{(agent.id * 1.2).toFixed(2)} ETH</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Transactions Today</span>
                <span className="font-medium">{agent.id * 15}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="text-success font-medium">Active</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Violations</span>
                <span className="font-medium">0</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
