import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, ExternalLink, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Intent {
  intent_id: string;
  agent_id: string;
  src_chain_id: number;
  dest_chain_id: number;
  action_hash: string;
  status: string;
  value: string;
  recipient: string;
  created_at: string;
  executed_at?: string;
  agent_name?: string;
}

export default function Transactions() {
  const [intents, setIntents] = useState<Intent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const { toast } = useToast();

  const loadIntents = async () => {
    try {
      setLoading(true);
      const response = await api.intents.list({
        page,
        limit: 20,
        status: undefined // Show all statuses
      });

      setIntents(response.intents);
      setTotal(response.pagination.total);
    } catch (error) {
      console.error('Failed to load intents:', error);
      toast({
        title: "Error",
        description: "Failed to load transaction data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntents();
  }, [page]);

  const handleTransactionClick = (intentId: string) => {
    // For now, just show intent details in console
    // In production, this could open a detailed view
    console.log('Intent details:', intentId);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      submitted: "outline",
      executed: "default",
      disputed: "destructive",
      failed: "destructive"
    };

    return (
      <Badge variant={variants[status] || "secondary"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatValue = (value: string) => {
    if (!value || value === '0') return '0 ETH';
    // Convert wei to ETH (rough approximation)
    const ethValue = parseFloat(value) / 1e18;
    return `${ethValue.toFixed(6)} ETH`;
  };

  const getChainName = (chainId: number) => {
    const chains: Record<number, string> = {
      1: 'Ethereum',
      137: 'Polygon',
      11155111: 'Sepolia',
      80002: 'Amoy'
    };
    return chains[chainId] || `Chain ${chainId}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Cross-Chain Intents</h1>
          <p className="text-muted-foreground">
            Complete history of all cross-chain intent executions
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadIntents}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Intents",
            value: total.toString(),
            change: intents.filter(i => i.status === 'executed').length + " executed"
          },
          {
            label: "Success Rate",
            value: total > 0 ? `${Math.round((intents.filter(i => i.status === 'executed').length / total) * 100)}%` : "0%",
            change: "Last 24h"
          },
          {
            label: "Active Chains",
            value: [...new Set(intents.flatMap(i => [i.src_chain_id, i.dest_chain_id]))].length.toString(),
            change: "Networks"
          },
          {
            label: "Pending Intents",
            value: intents.filter(i => i.status === 'pending').length.toString(),
            change: "Awaiting execution"
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Intents</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              Loading intents...
            </div>
          ) : intents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No intents found. Create your first cross-chain intent to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Intent ID</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Chains</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {intents.map((intent) => (
                  <TableRow
                    key={intent.intent_id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleTransactionClick(intent.intent_id)}
                  >
                    <TableCell className="font-mono text-sm">
                      {intent.intent_id.substring(0, 10)}...
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(intent.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium">
                      {intent.agent_name || intent.agent_id.substring(0, 8) + '...'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getChainName(intent.src_chain_id)} → {getChainName(intent.dest_chain_id)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {intent.action_hash.startsWith('0x6b') ? 'Transfer' :
                         intent.action_hash.startsWith('0x6c') ? 'Call' : 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatValue(intent.value)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(intent.status)}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleTransactionClick(intent.intent_id)}
                        title="View intent details"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
