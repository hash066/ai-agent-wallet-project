import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, DollarSign, TrendingUp, Activity, AlertTriangle } from "lucide-react";

export default function Dashboard() {
  const stats = [
    {
      title: "Total Agents",
      value: "12",
      change: "+2 this week",
      icon: Bot,
      trend: "up",
    },
    {
      title: "Total Transactions",
      value: "1,247",
      change: "0 human approvals",
      icon: Activity,
      trend: "neutral",
    },
    {
      title: "Net Profit",
      value: "$45,231",
      change: "+12.5% from last month",
      icon: TrendingUp,
      trend: "up",
    },
    {
      title: "Ecosystem TVL",
      value: "$892,430",
      change: "+5.2% this week",
      icon: DollarSign,
      trend: "up",
    },
  ];

  const recentAgents = [
    {
      id: 1,
      name: "DataScout-Alpha",
      type: "Data Analysis",
      balance: "2.5 ETH",
      status: "active",
      transactions: 43,
      violations: 0,
    },
    {
      id: 2,
      name: "TradeBot-Pro",
      type: "Trading",
      balance: "5.8 ETH",
      status: "active",
      transactions: 127,
      violations: 0,
    },
    {
      id: 3,
      name: "ComputeNode-X1",
      type: "Compute",
      balance: "1.2 ETH",
      status: "active",
      transactions: 89,
      violations: 2,
    },
    {
      id: 4,
      name: "OracleAgent-Prime",
      type: "Oracle",
      balance: "3.7 ETH",
      status: "paused",
      transactions: 56,
      violations: 0,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">AI Agent Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor and manage your autonomous AI agents
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="hover:glow-primary transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className={`text-xs ${
                stat.trend === "up" ? "text-success" : "text-muted-foreground"
              }`}>
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Agents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentAgents.map((agent) => (
              <div
                key={agent.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Bot className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">{agent.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {agent.type}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-sm font-medium">{agent.balance}</div>
                    <div className="text-xs text-muted-foreground">Balance</div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm font-medium">{agent.transactions}</div>
                    <div className="text-xs text-muted-foreground">Transactions</div>
                  </div>

                  {agent.violations > 0 ? (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {agent.violations} violations
                    </Badge>
                  ) : (
                    <Badge
                      variant={agent.status === "active" ? "default" : "secondary"}
                      className={agent.status === "active" ? "bg-success" : ""}
                    >
                      {agent.status}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
