import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";

interface CreateAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAgentCreated?: (agentName: string) => void;
}

export default function CreateAgentDialog({ open, onOpenChange, onAgentCreated }: CreateAgentDialogProps) {
  const { toast } = useToast();
  const [agentName, setAgentName] = useState("");
  const [agentType, setAgentType] = useState("");
  const [funding, setFunding] = useState("");
  const [autonomous, setAutonomous] = useState(false);
  const [dailyLimit, setDailyLimit] = useState([1]);
  const [maxTransaction, setMaxTransaction] = useState([0.5]);
  const [maxPerHour, setMaxPerHour] = useState([10]);
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async () => {
    if (!agentName || !agentType || !funding) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Show prominent success notification
    toast({
      title: "✅ Agent Created Successfully!",
      description: `${agentName} has been successfully registered and deployed! You can see it in your agents list.`,
      duration: 5000,
    });
    
    // Notify parent to refresh agents list
    if (onAgentCreated) {
      onAgentCreated(agentName);
    }
    
    // Reset form
    setAgentName("");
    setAgentType("");
    setFunding("");
    setAutonomous(false);
    setIsCreating(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New AI Agent</DialogTitle>
          <DialogDescription>
            Configure your agent's parameters and policies
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="agentName">Agent Name *</Label>
              <Input
                id="agentName"
                placeholder="DataScout-Alpha"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agentType">Agent Type *</Label>
              <Select value={agentType} onValueChange={setAgentType}>
                <SelectTrigger id="agentType">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trading">Trading</SelectItem>
                  <SelectItem value="data-analysis">Data Analysis</SelectItem>
                  <SelectItem value="compute">Compute</SelectItem>
                  <SelectItem value="oracle">Oracle</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="funding">Initial Funding (ETH) *</Label>
              <Input
                id="funding"
                type="number"
                placeholder="1.0"
                step="0.01"
                value={funding}
                onChange={(e) => setFunding(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="autonomous">Autonomous Mode</Label>
              <Switch
                id="autonomous"
                checked={autonomous}
                onCheckedChange={setAutonomous}
              />
            </div>
          </div>

          <div className="space-y-6 p-4 border border-border rounded-lg">
            <h3 className="font-semibold">Policy Configuration</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Daily Spending Limit</Label>
                <span className="text-sm font-mono">{dailyLimit[0]} ETH</span>
              </div>
              <Slider
                value={dailyLimit}
                onValueChange={setDailyLimit}
                max={10}
                step={0.1}
                className="w-full"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Max Transaction Amount</Label>
                <span className="text-sm font-mono">{maxTransaction[0]} ETH</span>
              </div>
              <Slider
                value={maxTransaction}
                onValueChange={setMaxTransaction}
                max={5}
                step={0.1}
                className="w-full"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Max Transactions per Hour</Label>
                <span className="text-sm font-mono">{maxPerHour[0]} txns</span>
              </div>
              <Slider
                value={maxPerHour}
                onValueChange={setMaxPerHour}
                max={100}
                step={5}
                className="w-full"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSubmit} className="flex-1" disabled={isCreating}>
              {isCreating ? "Creating..." : "Create Agent"}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
