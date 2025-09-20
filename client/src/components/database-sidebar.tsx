import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Database, 
  Server, 
  Table, 
  Plus, 
  ChevronRight, 
  ChevronDown,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useUser } from "@/contexts/user-context";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import SavedQueries from "@/components/saved-queries";
import type { Connection, SavedQuery } from "@shared/schema";

interface DatabaseSidebarProps {
  connections: Connection[];
  activeConnection: Connection | null;
  onConnectionSelect: (connection: Connection) => void;
  onAddConnection: () => void;
  onLoadSavedQuery: (query: SavedQuery) => void;
}

export default function DatabaseSidebar({ 
  connections, 
  activeConnection, 
  onConnectionSelect, 
  onAddConnection,
  onLoadSavedQuery
}: DatabaseSidebarProps) {
  const [expandedConnections, setExpandedConnections] = useState<Set<string>>(new Set());
  const { hasPermission, isAdmin } = useUser();
  const { toast } = useToast();

  const { data: schema } = useQuery<{ tables: any[] }>({
    queryKey: ['/api/connections', activeConnection?.id, 'schema'],
    enabled: !!activeConnection,
  });

  const toggleConnectionExpansion = (connectionId: string) => {
    setExpandedConnections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(connectionId)) {
        newSet.delete(connectionId);
      } else {
        newSet.add(connectionId);
      }
      return newSet;
    });
  };

  const handleConnectionActivate = async (connection: Connection) => {
    try {
      await fetch(`/api/connections/${connection.id}/activate`, {
        method: 'POST',
      });
      onConnectionSelect(connection);
    } catch (error) {
      console.error('Failed to activate connection:', error);
    }
  };

  const handleDeleteConnection = async (connectionId: string, connectionName: string) => {
    try {
      const response = await apiRequest('DELETE', `/api/connections/${connectionId}`);
      
      if (response.ok) {
        // Invalidate connections query to refresh the list
        queryClient.invalidateQueries({ queryKey: ['/api/connections'] });
        
        toast({
          title: "Connection deleted",
          description: `Database connection "${connectionName}" has been deleted successfully.`,
        });
      } else {
        throw new Error('Failed to delete connection');
      }
    } catch (error) {
      console.error('Failed to delete connection:', error);
      toast({
        title: "Delete failed", 
        description: "Could not delete the database connection. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <aside className="bg-card border-r border-border w-80 flex flex-col" data-testid="database-sidebar">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm">Database Connections</h2>
          {hasPermission('MANAGE_CONNECTIONS') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onAddConnection}
              className="text-primary hover:text-primary/80 text-sm"
              data-testid="button-add-connection"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          )}
        </div>
        
        {/* Connection List */}
        <div className="space-y-2">
          {connections.map((connection) => (
            <div key={connection.id} className="space-y-1">
              <div 
                className={`p-3 rounded-md border transition-colors ${
                  connection.isActive 
                    ? 'bg-primary/10 border-primary/20' 
                    : 'bg-secondary/50 border-border hover:bg-secondary/70'
                }`}
                data-testid={`connection-${connection.id}`}
              >
                <div 
                  className="cursor-pointer"
                  onClick={() => handleConnectionActivate(connection)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Server className={`text-sm ${connection.isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="font-medium text-sm">{connection.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div 
                        className={`w-2 h-2 rounded-full ${
                          connection.isActive ? 'bg-emerald-500' : 'bg-gray-500'
                        }`} 
                        title={connection.isActive ? 'Connected' : 'Disconnected'}
                      />
                      {isAdmin && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => e.stopPropagation()}
                              data-testid={`button-delete-connection-${connection.id}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent data-testid="delete-connection-dialog">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Database Connection</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete the connection "{connection.name}"? 
                                This action cannot be undone and will remove the connection from all users.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteConnection(connection.id, connection.name)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                data-testid="button-confirm-delete"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {connection.type} • {connection.host}:{connection.port}
                  </div>
                </div>
              </div>
              
              {connection.isActive && (
                <div className="ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2 p-2 hover:bg-accent rounded-md w-full justify-start"
                    onClick={() => toggleConnectionExpansion(connection.id)}
                    data-testid={`button-expand-schema-${connection.id}`}
                  >
                    {expandedConnections.has(connection.id) ? 
                      <ChevronDown className="h-3 w-3" /> : 
                      <ChevronRight className="h-3 w-3" />
                    }
                    <Database className="h-4 w-4 text-primary" />
                    <span className="text-sm">Schema</span>
                  </Button>
                </div>
              )}
            </div>
          ))}
          
          {connections.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No database connections</p>
              <p className="text-xs">Click "Add" to create your first connection</p>
            </div>
          )}
        </div>
      </div>

      {/* Schema Explorer */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {activeConnection && expandedConnections.has(activeConnection.id) && (
            <>
              <h3 className="font-semibold text-sm mb-3">Schema Explorer</h3>
              {schema?.tables && schema.tables.length > 0 ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 p-2 hover:bg-accent rounded-md cursor-pointer">
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    <Table className="h-4 w-4 text-blue-400" />
                    <span className="text-sm">Tables ({schema.tables.length})</span>
                  </div>
                  
                  <div className="ml-4 space-y-1 text-sm">
                    {schema.tables.slice(0, 10).map((table: any, index: number) => (
                      <div 
                        key={index}
                        className="flex items-center gap-2 p-1 hover:bg-accent rounded-sm cursor-pointer"
                        data-testid={`table-${table.TABLE_NAME || table.table_name}`}
                      >
                        <Table className="h-3 w-3 text-muted-foreground" />
                        <span>{table.TABLE_NAME || table.table_name}</span>
                        {table.TABLE_ROWS && (
                          <span className="text-xs text-muted-foreground">
                            ({table.TABLE_ROWS})
                          </span>
                        )}
                      </div>
                    ))}
                    {schema.tables.length > 10 && (
                      <div className="text-xs text-muted-foreground pl-5">
                        ... and {schema.tables.length - 10} more tables
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No tables found or schema not loaded
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
      
      {/* Saved Queries Section */}
      <SavedQueries onLoadQuery={onLoadSavedQuery} />
    </aside>
  );
}
