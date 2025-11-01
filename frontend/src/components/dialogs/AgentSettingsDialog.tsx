import { useState, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface AgentSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId?: string;
  agentName?: string;
}

export default function AgentSettingsDialog({
  open,
  onOpenChange,
  agentId,
  agentName = "Agent",
}: AgentSettingsDialogProps) {
  const { toast } = useToast();
  const [autonomous, setAutonomous] = useState(false);
  const [dailyLimit, setDailyLimit] = useState([1]);
  const [maxTransaction, setMaxTransaction] = useState([0.5]);
  const [maxPerHour, setMaxPerHour] = useState([10]);
  const [status, setStatus] = useState("active");

  const handleSave = () => {
    toast({
      title: "Settings Saved",
      description: `Settings for ${agentName} have been updated successfully.`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agent Settings - {agentName}</DialogTitle>
          <DialogDescription>
            Configure agent policies and operational parameters
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="stopped">Stopped</SelectItem>
                </SelectContent>
              </Select>
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
            <Button onClick={handleSave} className="flex-1">
              Save Settings
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

