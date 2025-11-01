import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, DollarSign, Activity } from "lucide-react";

export default function Analytics() {
  const topAgents = [
    { name: "TradeBot-Pro", revenue: 12.5, expenses: 3.2, profit: 9.3, jobs: 127, success: 94 },
    { name: "DataScout-Alpha", revenue: 8.7, expenses: 2.1, profit: 6.6, jobs: 89, success: 98 },
    { name: "ComputeNode-X1", revenue: 15.3, expenses: 8.9, profit: 6.4, jobs: 234, success: 91 },
    { name: "OracleAgent-Prime", revenue: 7.2, expenses: 1.8, profit: 5.4, jobs: 156, success: 99 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          Insights and performance metrics for your AI agents
        </p>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        {[
          { label: "Total Agents", value: "12", icon: Activity, color: "text-primary" },
          { label: "Transactions Today", value: "1,247", icon: TrendingUp, color: "text-success" },
          { label: "Net Profit", value: "$45,231", icon: DollarSign, color: "text-success" },
          { label: "Ecosystem TVL", value: "$892,430", icon: BarChart3, color: "text-accent" },
        ].map((stat) => (
          <Card key={stat.label} className="hover:glow-primary transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agent Performance Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topAgents.map((agent) => (
              <div key={agent.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{agent.name}</span>
                  <span className="text-sm text-success font-mono">
                    +{agent.profit.toFixed(1)} ETH profit
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2 text-sm">
                  <div className="text-center p-2 bg-muted rounded">
                    <div className="text-xs text-muted-foreground mb-1">Revenue</div>
                    <div className="font-mono">{agent.revenue} ETH</div>
                  </div>
                  <div className="text-center p-2 bg-muted rounded">
                    <div className="text-xs text-muted-foreground mb-1">Expenses</div>
                    <div className="font-mono">{agent.expenses} ETH</div>
                  </div>
                  <div className="text-center p-2 bg-success/10 rounded">
                    <div className="text-xs text-muted-foreground mb-1">Net Profit</div>
                    <div className="font-mono text-success">{agent.profit} ETH</div>
                  </div>
                  <div className="text-center p-2 bg-muted rounded">
                    <div className="text-xs text-muted-foreground mb-1">Jobs</div>
                    <div className="font-medium">{agent.jobs}</div>
                  </div>
                  <div className="text-center p-2 bg-muted rounded">
                    <div className="text-xs text-muted-foreground mb-1">Success</div>
                    <div className="font-medium">{agent.success}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { category: "Compute", amount: 15.2, percentage: 42 },
              { category: "Data Services", amount: 8.7, percentage: 24 },
              { category: "Oracle Feeds", amount: 7.3, percentage: 20 },
              { category: "Other", amount: 5.1, percentage: 14 },
            ].map((item) => (
              <div key={item.category} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{item.category}</span>
                  <span className="font-mono">{item.amount} ETH</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => (
                <div key={day} className="flex items-center gap-3">
                  <span className="text-sm w-12">{day}</span>
                  <div className="flex-1 h-8 bg-muted rounded overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${Math.random() * 80 + 20}%` }}
                    />
                  </div>
                  <span className="text-sm font-mono w-12 text-right">
                    {Math.floor(Math.random() * 200 + 50)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
