import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Database, Settings, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import DatabaseSidebar from "@/components/database-sidebar";
import QueryTabs from "@/components/query-tabs";
import QueryEditor from "@/components/query-editor";
import ResultsPanel from "@/components/results-panel";
import ConfigurationModal from "@/components/configuration-modal";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/user-context";
import type { Connection } from "@shared/schema";

export interface QueryTab {
  id: string;
  name: string;
  content: string;
  connectionId?: string;
  isActive: boolean;
  isUnsaved: boolean;
  results?: any;
}

export default function SQLClient() {
  const { hasPermission } = useUser();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isResultsMaximized, setIsResultsMaximized] = useState(false);
  const [queryTabs, setQueryTabs] = useState<QueryTab[]>([
    {
      id: "1",
      name: "Query 1",
      content: "-- Get top 10 customers by total order value\nSELECT \n    u.user_id,\n    u.email,\n    u.first_name,\n    u.last_name,\n    COUNT(o.order_id) AS total_orders,\n    SUM(o.total_amount) AS total_spent,\n    AVG(o.total_amount) AS avg_order_value\nFROM users u\nINNER JOIN orders o ON u.user_id = o.user_id\nWHERE o.status = 'completed'\n    AND o.created_at >= '2024-01-01'\nGROUP BY u.user_id, u.email, u.first_name, u.last_name\nHAVING total_spent > 1000\nORDER BY total_spent DESC\nLIMIT 10;",
      isActive: true,
      isUnsaved: false,
    }
  ]);
  
  const [activeConnection, setActiveConnection] = useState<Connection | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  
  const { toast } = useToast();

  const { data: connections = [], isLoading: connectionsLoading } = useQuery<Connection[]>({
    queryKey: ['/api/connections'],
  });

  useEffect(() => {
    if (connections.length > 0 && !activeConnection) {
      const active = connections.find((conn) => conn.isActive) || connections[0];
      setActiveConnection(active);
    }
  }, [connections, activeConnection]);

  const handleExecuteQuery = async () => {
    const activeTab = queryTabs.find(tab => tab.isActive);
    if (!activeTab || !activeConnection) {
      toast({
        title: "Cannot execute query",
        description: "No active query tab or database connection",
        variant: "destructive",
      });
      return;
    }

    setIsExecuting(true);
    try {
      const response = await fetch('/api/query/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId: activeConnection.id,
          query: activeTab.content,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Query execution failed');
      }

      const result = await response.json();
      
      // Update results for the specific tab
      setQueryTabs(prev => prev.map(tab => 
        tab.id === activeTab.id 
          ? { ...tab, results: result }
          : tab
      ));
      
      toast({
        title: "Query executed successfully",
        description: `${result.rowCount} rows returned in ${result.executionTime}ms`,
      });
    } catch (error) {
      console.error('Query execution error:', error);
      toast({
        title: "Query execution failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const addTab = () => {
    const newTabNumber = queryTabs.length + 1;
    const newTab: QueryTab = {
      id: Date.now().toString(),
      name: `Query ${newTabNumber}`,
      content: "-- Enter your SQL query here\nSELECT 1;",
      connectionId: activeConnection?.id,
      isActive: false,
      isUnsaved: false,
    };

    setQueryTabs(prev => prev.map(tab => ({ ...tab, isActive: false })).concat({ ...newTab, isActive: true }));
  };

  const closeTab = (tabId: string) => {
    if (queryTabs.length <= 1) return;
    
    const tabIndex = queryTabs.findIndex(tab => tab.id === tabId);
    const wasActive = queryTabs[tabIndex]?.isActive;
    
    const newTabs = queryTabs.filter(tab => tab.id !== tabId);
    
    if (wasActive && newTabs.length > 0) {
      const newActiveIndex = Math.max(0, Math.min(tabIndex, newTabs.length - 1));
      newTabs[newActiveIndex].isActive = true;
    }
    
    setQueryTabs(newTabs);
  };

  const selectTab = (tabId: string) => {
    setQueryTabs(prev => prev.map(tab => ({ ...tab, isActive: tab.id === tabId })));
  };

  const updateTabContent = (tabId: string, content: string) => {
    setQueryTabs(prev => prev.map(tab => 
      tab.id === tabId 
        ? { ...tab, content, isUnsaved: true }
        : tab
    ));
  };

  return (
    <div className="h-screen bg-background text-foreground overflow-hidden" data-testid="sql-client-container">
      {/* Header */}
      <header className="bg-card border-b border-border h-14 flex items-center justify-between px-4" data-testid="header">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Database className="text-primary text-xl" />
            <h1 className="text-xl font-bold text-primary">SQLPad</h1>
          </div>
          <div className="text-sm text-muted-foreground">Online Database Client</div>
        </div>
        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className="flex items-center gap-2 bg-secondary px-3 py-1 rounded-md" data-testid="connection-status">
            <div className={`w-2 h-2 rounded-full ${activeConnection ? 'bg-emerald-500' : 'bg-gray-500'}`}></div>
            <span className="text-sm">
              {activeConnection ? `Connected to ${activeConnection.name}` : 'No connection'}
            </span>
          </div>
          {/* Settings Button */}
          {hasPermission('MANAGE_CONNECTIONS') && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowConfigModal(true)}
              data-testid="button-settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
      </header>

      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Sidebar */}
        <div className={`flex transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-12' : 'w-80'}`}>
          {isSidebarCollapsed ? (
            // Collapsed Sidebar
            <div className="bg-card border-r border-border w-12 flex flex-col items-center py-4" data-testid="collapsed-sidebar">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarCollapsed(false)}
                className="mb-4"
                data-testid="button-expand-sidebar"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <div className="flex flex-col gap-2">
                {connections.map((connection) => (
                  <div
                    key={connection.id}
                    className={`w-8 h-8 rounded-md border cursor-pointer transition-colors flex items-center justify-center ${
                      connection.isActive 
                        ? 'bg-primary/10 border-primary/20' 
                        : 'bg-secondary/50 border-border hover:bg-secondary/70'
                    }`}
                    onClick={() => setActiveConnection(connection)}
                    title={connection.name}
                    data-testid={`collapsed-connection-${connection.id}`}
                  >
                    <Database className={`h-4 w-4 ${connection.isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Expanded Sidebar
            <div className="relative">
              <DatabaseSidebar 
                connections={connections}
                activeConnection={activeConnection}
                onConnectionSelect={setActiveConnection}
                onAddConnection={() => setShowConfigModal(true)}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarCollapsed(true)}
                className="absolute top-2 right-2 z-10"
                data-testid="button-collapse-sidebar"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col">
          {/* Query Tabs */}
          <QueryTabs
            tabs={queryTabs}
            onTabSelect={selectTab}
            onTabClose={closeTab}
            onAddTab={addTab}
          />

          {/* Query Editor & Results Split View */}
          <div className="flex-1">
            <ResizablePanelGroup direction="vertical" className="h-full">
              {/* Query Editor */}
              <ResizablePanel defaultSize={55} minSize={20} maxSize={80}>
                <QueryEditor
                  tabs={queryTabs}
                  onContentChange={updateTabContent}
                  onExecuteQuery={handleExecuteQuery}
                  isExecuting={isExecuting}
                  activeConnection={activeConnection}
                />
              </ResizablePanel>
              
              {/* Resizable Handle */}
              <ResizableHandle withHandle />
              
              {/* Results Panel */}
              <ResizablePanel defaultSize={45} minSize={20} maxSize={80}>
                <ResultsPanel 
                  results={queryTabs.find(tab => tab.isActive)?.results || null}
                  isLoading={isExecuting}
                  isMaximized={isResultsMaximized}
                  onToggleMaximize={() => setIsResultsMaximized(!isResultsMaximized)}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </main>
      </div>

      {/* Configuration Modal */}
      <ConfigurationModal 
        open={showConfigModal}
        onOpenChange={setShowConfigModal}
      />
    </div>
  );
}
