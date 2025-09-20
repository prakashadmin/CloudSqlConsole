import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Bookmark, 
  ChevronRight, 
  ChevronDown, 
  Trash2,
  User,
  Code,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUser } from "@/contexts/user-context";
import type { SavedQuery } from "@shared/schema";

interface SavedQueriesProps {
  onLoadQuery: (query: SavedQuery) => void;
}

export default function SavedQueries({ onLoadQuery }: SavedQueriesProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { toast } = useToast();
  const { user } = useUser();

  const { data: savedQueries = [], isLoading } = useQuery<SavedQuery[]>({
    queryKey: ['/api/saved-queries'],
  });

  const deleteQueryMutation = useMutation({
    mutationFn: async (queryId: string) => {
      return apiRequest("DELETE", `/api/saved-queries/${queryId}`);
    },
    onSuccess: () => {
      toast({
        title: "Query deleted",
        description: "The saved query has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/saved-queries'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete query",
        description: error?.message || "An error occurred while deleting the query.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteQuery = (queryId: string) => {
    deleteQueryMutation.mutate(queryId);
  };

  const handleLoadQuery = (query: SavedQuery) => {
    onLoadQuery(query);
    toast({
      title: "Query loaded",
      description: `"${query.queryName}" has been loaded into the editor.`,
    });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-3 w-3 text-red-400" />;
      case 'developer':
        return <Code className="h-3 w-3 text-blue-400" />;
      case 'business_user':
        return <User className="h-3 w-3 text-green-400" />;
      default:
        return <User className="h-3 w-3 text-gray-400" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'developer':
        return 'Developer';
      case 'business_user':
        return 'User';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="border-t border-border" data-testid="saved-queries-section">
      <Button
        variant="ghost"
        className="w-full justify-start px-4 py-3 h-auto font-medium hover:bg-accent"
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid="button-toggle-saved-queries"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 mr-2" />
        ) : (
          <ChevronRight className="h-4 w-4 mr-2" />
        )}
        <Bookmark className="h-4 w-4 mr-2 text-orange-400" />
        <span className="flex-1 text-left">Saved Queries</span>
        {savedQueries.length > 0 && (
          <span className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-2 py-1 rounded-full text-xs">
            {savedQueries.length}
          </span>
        )}
      </Button>

      {isExpanded && (
        <div className="px-2 pb-2">
          <ScrollArea className="max-h-64">
            {isLoading ? (
              <div className="px-4 py-2 text-sm text-muted-foreground" data-testid="loading-saved-queries">
                Loading saved queries...
              </div>
            ) : savedQueries.length === 0 ? (
              <div className="px-4 py-2 text-sm text-muted-foreground" data-testid="no-saved-queries">
                No saved queries found
              </div>
            ) : (
              <div className="space-y-1">
                {savedQueries.map((query) => (
                  <div
                    key={query.id}
                    className="group relative"
                    data-testid={`saved-query-${query.id}`}
                  >
                    <Button
                      variant="ghost"
                      className="w-full justify-start px-3 py-2 h-auto text-sm hover:bg-accent"
                      onClick={() => handleLoadQuery(query)}
                      data-testid={`button-load-query-${query.id}`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {getRoleIcon(query.role)}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate" title={query.queryName}>
                            {query.queryName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            by {getRoleLabel(query.role)} • {new Date(query.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </Button>
                    
                    {/* Delete button - only show for user's own queries */}
                    {query.createdBy === user?.id && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                            data-testid={`button-delete-query-${query.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent data-testid={`dialog-delete-query-${query.id}`}>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Saved Query</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{query.queryName}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteQuery(query.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              data-testid={`button-confirm-delete-${query.id}`}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}