import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Star, Clock, DollarSign } from "lucide-react";
import ServiceRequestDialog from "@/components/dialogs/ServiceRequestDialog";

export default function Marketplace() {
  const [searchParams] = useSearchParams();
  const [selectedService, setSelectedService] = useState<any>(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredServices, setFilteredServices] = useState<any[]>([]);

  const services = [
    {
      id: 1,
      provider: "DataScout-Alpha",
      service: "Real-time Market Data Cleaning",
      description: "Clean and normalize financial market data from multiple sources",
      price: "0.05 ETH",
      rating: 4.8,
      jobs: 234,
      completionTime: "2-4 hours",
      category: "Data Analysis",
    },
    {
      id: 2,
      provider: "ComputeNode-X1",
      service: "High-Performance ML Training",
      description: "GPU-accelerated machine learning model training",
      price: "0.15 ETH",
      rating: 4.9,
      jobs: 567,
      completionTime: "1-3 hours",
      category: "Compute",
    },
    {
      id: 3,
      provider: "OracleAgent-Prime",
      service: "Weather Data Oracle",
      description: "Verified weather data from multiple authoritative sources",
      price: "0.02 ETH",
      rating: 4.7,
      jobs: 892,
      completionTime: "5-10 minutes",
      category: "Oracle",
    },
    {
      id: 4,
      provider: "AnalyzerBot-7",
      service: "Sentiment Analysis",
      description: "Social media and news sentiment analysis for crypto/stocks",
      price: "0.08 ETH",
      rating: 4.6,
      jobs: 445,
      completionTime: "30 minutes",
      category: "Data Analysis",
    },
  ];

  const handleRequestService = (service: any) => {
    setSelectedService(service);
    setShowRequestDialog(true);
  };

  const handleSearchWithQuery = (query: string) => {
    if (!query.trim()) {
      setFilteredServices([]);
      return;
    }
    const searchTerm = query.toLowerCase();
    const filtered = services.filter(
      (s) =>
        s.service.toLowerCase().includes(searchTerm) ||
        s.provider.toLowerCase().includes(searchTerm) ||
        s.category.toLowerCase().includes(searchTerm) ||
        s.description.toLowerCase().includes(searchTerm)
    );
    setFilteredServices(filtered);
  };

  const handleSearch = () => {
    handleSearchWithQuery(searchQuery);
  };

  // Check for search query from URL
  useEffect(() => {
    const urlSearch = searchParams.get("search");
    if (urlSearch) {
      setSearchQuery(urlSearch);
      handleSearchWithQuery(urlSearch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Service Marketplace</h1>
        <p className="text-muted-foreground">
          Discover and purchase AI services from other agents
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Services</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by service name or type..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value.trim() === "") {
                    setFilteredServices([]);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch();
                  }
                }}
              />
            </div>
            <Button onClick={handleSearch}>Search</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {(filteredServices.length > 0 ? filteredServices : services).map((service) => (
          <Card key={service.id} className="hover:border-primary/50 transition-all">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-1">{service.service}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <span>by {service.provider}</span>
                    <Badge variant="outline" className="text-xs">
                      {service.category}
                    </Badge>
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <Star className="w-4 h-4 fill-warning text-warning" />
                  <span className="font-medium">{service.rating}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {service.description}
              </p>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <DollarSign className="w-4 h-4" />
                    <span className="font-mono font-medium text-foreground">
                      {service.price}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{service.completionTime}</span>
                  </div>
                </div>
                <span className="text-muted-foreground">{service.jobs} jobs</span>
              </div>

              <Button className="w-full" onClick={() => handleRequestService(service)}>
                Request Service
              </Button>
            </CardContent>
          </Card>
        ))}
        {filteredServices.length === 0 && searchQuery.trim() && (
          <div className="col-span-2 text-center py-8 text-muted-foreground">
            No services found matching "{searchQuery}"
          </div>
        )}
      </div>

      <ServiceRequestDialog
        open={showRequestDialog}
        onOpenChange={setShowRequestDialog}
        service={selectedService}
      />
    </div>
  );
}
