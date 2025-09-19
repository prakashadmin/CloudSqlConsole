import { FileText, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { QueryTab } from "@/pages/sql-client";

interface QueryTabsProps {
  tabs: QueryTab[];
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onAddTab: () => void;
}

export default function QueryTabs({ tabs, onTabSelect, onTabClose, onAddTab }: QueryTabsProps) {
  return (
    <div className="bg-card border-b border-border" data-testid="query-tabs">
      <div className="flex items-center">
        {tabs.map((tab) => (
          <div key={tab.id} className={`flex items-center ${
            tab.isActive 
              ? 'bg-primary/10 border-r border-border' 
              : 'bg-secondary/30 border-r border-border'
          }`}>
            <button
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                tab.isActive
                  ? 'text-primary hover:bg-primary/20'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
              onClick={() => onTabSelect(tab.id)}
              data-testid={`tab-${tab.id}`}
            >
              <FileText className="h-3 w-3" />
              {tab.name}
              {tab.isUnsaved && <span className="text-xs">•</span>}
            </button>
            <button
              className={`px-2 py-3 transition-colors ${
                tab.isActive
                  ? 'text-primary/60 hover:text-primary hover:bg-primary/20'
                  : 'text-muted-foreground/60 hover:text-foreground hover:bg-accent'
              }`}
              onClick={() => onTabClose(tab.id)}
              data-testid={`button-close-tab-${tab.id}`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        
        {/* Add Tab Button */}
        <Button
          variant="ghost"
          size="sm"
          className="px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-accent"
          onClick={onAddTab}
          data-testid="button-add-tab"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
