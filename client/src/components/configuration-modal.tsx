import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TriangleAlert, InfoIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { InsertConnection } from "@shared/schema";

interface ConfigurationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ConfigurationModal({ open, onOpenChange }: ConfigurationModalProps) {
  const [formData, setFormData] = useState<InsertConnection>({
    name: "",
    type: "mysql",
    host: "",
    port: 3306,
    database: "",
    username: "",
    password: "",
    ssl: false,
    isActive: false,
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createConnectionMutation = useMutation({
    mutationFn: async (data: InsertConnection) => {
      const response = await apiRequest('POST', '/api/connections', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Connection created",
        description: "Database connection has been added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/connections'] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Failed to create connection",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      // First create the connection, then test it
      const response = await apiRequest('POST', '/api/connections', formData);
      const connection = await response.json();
      
      const testResponse = await apiRequest('POST', `/api/connections/${connection.id}/test`);
      const result = await testResponse.json();
      
      return { connection, success: result.success };
    },
    onSuccess: ({ success }) => {
      toast({
        title: success ? "Connection successful" : "Connection failed",
        description: success 
          ? "Successfully connected to the database" 
          : "Could not connect to the database",
        variant: success ? "default" : "destructive",
      });
    },
    onError: (error) => {
      toast({
        title: "Connection test failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      type: "mysql",
      host: "",
      port: 3306,
      database: "",
      username: "",
      password: "",
      ssl: false,
      isActive: false,
    });
  };

  const handleTypeChange = (type: string) => {
    setFormData(prev => ({
      ...prev,
      type,
      port: type === "postgresql" ? 5432 : 3306,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createConnectionMutation.mutate(formData);
  };

  const handleTestConnection = () => {
    testConnectionMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="configuration-modal">
        <DialogHeader>
          <DialogTitle>Database Configuration</DialogTitle>
          <DialogDescription>
            Add a new database connection to start querying your data.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4">
          <Alert>
            <TriangleAlert className="h-4 w-4" />
            <AlertDescription>
              Please configure your database credentials. You can also use environment variables 
              (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD) for secure credential management.
            </AlertDescription>
          </Alert>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Connection Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Production Database"
                  required
                  data-testid="input-connection-name"
                />
              </div>
              <div>
                <Label htmlFor="type">Database Type</Label>
                <Select value={formData.type} onValueChange={handleTypeChange}>
                  <SelectTrigger data-testid="select-database-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mysql">MySQL</SelectItem>
                    <SelectItem value="postgresql">PostgreSQL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="host">Host</Label>
                <Input
                  id="host"
                  value={formData.host}
                  onChange={(e) => setFormData(prev => ({ ...prev, host: e.target.value }))}
                  placeholder="your-rds-instance.amazonaws.com"
                  required
                  data-testid="input-host"
                />
                <div className="text-xs text-muted-foreground mt-1">Environment: DB_HOST</div>
              </div>
              <div>
                <Label htmlFor="port">Port</Label>
                <Input
                  id="port"
                  type="number"
                  value={formData.port}
                  onChange={(e) => setFormData(prev => ({ ...prev, port: parseInt(e.target.value) }))}
                  placeholder="3306"
                  required
                  data-testid="input-port"
                />
                <div className="text-xs text-muted-foreground mt-1">Environment: DB_PORT</div>
              </div>
            </div>
            
            <div>
              <Label htmlFor="database">Database Name</Label>
              <Input
                id="database"
                value={formData.database}
                onChange={(e) => setFormData(prev => ({ ...prev, database: e.target.value }))}
                placeholder="your_database_name"
                required
                data-testid="input-database"
              />
              <div className="text-xs text-muted-foreground mt-1">Environment: DB_NAME</div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="db_username"
                  required
                  data-testid="input-username"
                />
                <div className="text-xs text-muted-foreground mt-1">Environment: DB_USER</div>
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="••••••••"
                  required
                  data-testid="input-password"
                />
                <div className="text-xs text-muted-foreground mt-1">Environment: DB_PASSWORD</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="ssl"
                checked={formData.ssl}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ssl: checked as boolean }))}
                data-testid="checkbox-ssl"
              />
              <Label htmlFor="ssl">Enable SSL</Label>
            </div>
            
            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertDescription>
                <strong>Replit Environment Setup:</strong><br />
                1. Go to your Replit project settings<br />
                2. Add environment variables in the "Secrets" section<br />
                3. Use the variable names shown above (DB_HOST, DB_PORT, etc.)<br />
                4. Restart your Replit app after adding variables
              </AlertDescription>
            </Alert>
            
            <div className="flex justify-end gap-3">
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleTestConnection}
                disabled={testConnectionMutation.isPending}
                data-testid="button-test-connection"
              >
                {testConnectionMutation.isPending ? "Testing..." : "Test Connection"}
              </Button>
              <Button 
                type="submit" 
                disabled={createConnectionMutation.isPending}
                data-testid="button-create-connection"
              >
                {createConnectionMutation.isPending ? "Creating..." : "Create Connection"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
