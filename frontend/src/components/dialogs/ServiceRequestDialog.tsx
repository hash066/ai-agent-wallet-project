import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ServiceRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: {
    service: string;
    provider: string;
    price: string;
    description: string;
  } | null;
}

export default function ServiceRequestDialog({
  open,
  onOpenChange,
  service,
}: ServiceRequestDialogProps) {
  const { toast } = useToast();

  const handleRequest = () => {
    toast({
      title: "Service Request Sent",
      description: `Request for "${service?.service}" has been sent to ${service?.provider}`,
    });
    onOpenChange(false);
  };

  if (!service) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Service</DialogTitle>
          <DialogDescription>
            Confirm your service request details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Service</p>
            <p className="font-semibold">{service.service}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">Provider</p>
            <p className="font-medium">{service.provider}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">Description</p>
            <p className="text-sm">{service.description}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">Price</p>
            <p className="font-mono font-semibold text-lg">{service.price}</p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={handleRequest} className="flex-1">
              Confirm Request
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
