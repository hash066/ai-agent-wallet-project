import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Security() {
  const { toast } = useToast();
  const securityEvents = [
    {
      id: 1,
      event: "Policy Violation Prevented",
      agent: "ComputeNode-X1",
      amount: "2.5 ETH",
      reason: "Exceeded daily spending limit",
      timestamp: "2024-01-15 14:32:18",
      severity: "high",
    },
    {
      id: 2,
      event: "Unauthorized Transaction Blocked",
      agent: "DataScout-Alpha",
      amount: "0.5 ETH",
      reason: "Disallowed service category",
      timestamp: "2024-01-15 13:15:42",
      severity: "medium",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Security & Policies</h1>
        <p className="text-muted-foreground">
          Configure policies and monitor security events
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {[
          { label: "Attacks Prevented", value: "23", icon: Shield, color: "success" },
          { label: "Amount Protected", value: "$12,450", icon: CheckCircle2, color: "success" },
          { label: "Active Alerts", value: "2", icon: AlertTriangle, color: "warning" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 text-${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {[
          { name: "Conservative", desc: "Low limits, maximum security", limits: "Daily: 1 ETH, Per TX: 0.1 ETH" },
          { name: "Moderate", desc: "Balanced approach", limits: "Daily: 5 ETH, Per TX: 0.5 ETH" },
          { name: "Aggressive", desc: "High limits, more freedom", limits: "Daily: 10 ETH, Per TX: 2 ETH" },
        ].map((template) => (
          <Card key={template.name} className="hover:border-primary/50 transition-all cursor-pointer">
            <CardHeader>
              <CardTitle>{template.name}</CardTitle>
              <CardDescription>{template.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{template.limits}</p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  toast({
                    title: "Template Applied",
                    description: `"${template.name}" policy template has been applied to all active agents.`,
                  });
                }}
              >
                Apply Template
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Security Events Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {securityEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-4 p-4 border border-border rounded-lg"
              >
                <div className={`mt-1 ${event.severity === "high" ? "text-destructive" : "text-warning"}`}>
                  <XCircle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{event.event}</span>
                    <Badge variant={event.severity === "high" ? "destructive" : "secondary"}>
                      {event.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Agent: <span className="text-foreground font-medium">{event.agent}</span>
                  </p>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Amount Blocked: </span>
                      <span className="font-mono font-medium">{event.amount}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Reason: </span>
                      <span>{event.reason}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Time: </span>
                      <span>{event.timestamp}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
