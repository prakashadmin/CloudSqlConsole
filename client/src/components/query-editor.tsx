import { Play, Code, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { QueryTab } from "@/pages/sql-client";
import type { Connection } from "@shared/schema";

interface QueryEditorProps {
  tabs: QueryTab[];
  onContentChange: (tabId: string, content: string) => void;
  onExecuteQuery: () => void;
  isExecuting: boolean;
  activeConnection: Connection | null;
}

export default function QueryEditor({ 
  tabs, 
  onContentChange, 
  onExecuteQuery, 
  isExecuting,
  activeConnection 
}: QueryEditorProps) {
  const activeTab = tabs.find(tab => tab.isActive);
  
  if (!activeTab) return null;

  const handleContentChange = (content: string) => {
    onContentChange(activeTab.id, content);
  };

  const formatQuery = () => {
    // Basic SQL formatting - in a real app, you'd use a proper SQL formatter
    const formatted = activeTab.content
      .replace(/\b(SELECT|FROM|WHERE|JOIN|INNER JOIN|LEFT JOIN|RIGHT JOIN|GROUP BY|ORDER BY|HAVING|LIMIT)\b/gi, '\n$1')
      .replace(/\s+/g, ' ')
      .trim();
    
    handleContentChange(formatted);
  };

  return (
    <div className="flex-1 min-h-0 bg-background" data-testid="query-editor">
      <div className="h-full flex flex-col">
        {/* Query Editor Toolbar */}
        <div className="bg-card border-b border-border p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              onClick={onExecuteQuery}
              disabled={isExecuting || !activeConnection}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              data-testid="button-execute-query"
            >
              <Play className={`h-3 w-3 mr-1 ${isExecuting ? 'animate-spin' : ''}`} />
              {isExecuting ? 'Executing...' : 'Execute Query'}
            </Button>
            <Button
              variant="secondary"
              onClick={formatQuery}
              data-testid="button-format-query"
            >
              <Code className="h-3 w-3 mr-1" />
              Format
            </Button>
            <Button
              variant="secondary"
              onClick={() => {/* TODO: Implement save functionality */}}
              data-testid="button-save-query"
            >
              <Save className="h-3 w-3 mr-1" />
              Save
            </Button>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>MySQL</span>
          </div>
        </div>
        
        {/* Code Editor Area */}
        <div className="flex-1 relative">
          <Textarea
            value={activeTab.content}
            onChange={(e) => handleContentChange(e.target.value)}
            className="absolute inset-0 resize-none border-0 bg-transparent font-mono text-sm leading-relaxed focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none p-4"
            placeholder="-- Enter your SQL query here"
            data-testid={`textarea-query-${activeTab.id}`}
          />
        </div>
      </div>
    </div>
  );
}
