import { Play, Code, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertSavedQuerySchema, type InsertSavedQuery } from "@shared/schema";
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
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const activeTab = tabs.find(tab => tab.isActive);
  
  if (!activeTab) return null;

  const form = useForm<InsertSavedQuery>({
    resolver: zodResolver(insertSavedQuerySchema),
    defaultValues: {
      queryName: "",
      queryText: activeTab.content,
    },
  });

  const saveQueryMutation = useMutation({
    mutationFn: async (data: InsertSavedQuery) => {
      return apiRequest("POST", "/api/saved-queries", data);
    },
    onSuccess: () => {
      toast({
        title: "Query saved successfully",
        description: "Your query has been saved and can be accessed later.",
      });
      setSaveDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/saved-queries'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save query",
        description: error?.message || "An error occurred while saving the query.",
        variant: "destructive",
      });
    },
  });

  const handleContentChange = (content: string) => {
    onContentChange(activeTab.id, content);
    // Update form when content changes
    form.setValue("queryText", content);
  };

  const formatQuery = () => {
    // Basic SQL formatting - in a real app, you'd use a proper SQL formatter
    const formatted = activeTab.content
      .replace(/\b(SELECT|FROM|WHERE|JOIN|INNER JOIN|LEFT JOIN|RIGHT JOIN|GROUP BY|ORDER BY|HAVING|LIMIT)\b/gi, '\n$1')
      .replace(/\s+/g, ' ')
      .trim();
    
    handleContentChange(formatted);
  };

  const handleSaveQuery = () => {
    // Update the form with current query content
    form.setValue("queryText", activeTab.content);
    setSaveDialogOpen(true);
  };

  const onSubmitSave = (data: InsertSavedQuery) => {
    if (!data.queryText.trim()) {
      toast({
        title: "Cannot save empty query",
        description: "Please enter a SQL query before saving.",
        variant: "destructive",
      });
      return;
    }
    saveQueryMutation.mutate(data);
  };

  return (
    <div className="h-full bg-background" data-testid="query-editor">
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
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="secondary"
                  onClick={handleSaveQuery}
                  data-testid="button-save-query"
                >
                  <Save className="h-3 w-3 mr-1" />
                  Save
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md" data-testid="dialog-save-query">
                <DialogHeader>
                  <DialogTitle>Save Query</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmitSave)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="queryName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Query Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter a name for your query"
                              {...field}
                              data-testid="input-query-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSaveDialogOpen(false)}
                        data-testid="button-cancel-save"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={saveQueryMutation.isPending}
                        data-testid="button-confirm-save"
                      >
                        {saveQueryMutation.isPending ? "Saving..." : "Save Query"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{activeConnection?.type?.toUpperCase() || 'No Database'}</span>
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
