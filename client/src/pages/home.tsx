import { useState, useEffect, useRef } from "react";
import { Database } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import Sidebar from "@/components/sidebar";
import SqlWorkspace from "@/components/sql-workspace";
import ResultsPanelBottom from "@/components/results-panel-bottom";

export default function Home() {

  const [selectedConnection, setSelectedConnection] = useState<any>(null);
  const [savedConnections, setSavedConnections] = useState<any[]>([]);
  const [rowLimit, setRowLimit] = useState(5);
  const [queryResults, setQueryResults] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queryExecutionTime, setQueryExecutionTime] = useState<number | undefined>();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load saved connections on component mount
  useEffect(() => {
    // Load connections
    const saved = localStorage.getItem('fusionConnections');
    if (saved) {
      const connections = JSON.parse(saved);
      setSavedConnections(connections);
      if (connections.length > 0) {
        setSelectedConnection(connections[0]);
      }
    }
  }, []); // Empty dependency array - only run on mount

  const handleQueryExecute = async (sqlQuery: string, queryRowLimit?: number, bindVariables?: Record<string, string>) => {
    if (!selectedConnection || !sqlQuery.trim()) {
      setError("Please select a connection and enter a SQL query");
      return;
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    setIsExecuting(true);
    setError(null);
    setQueryResults(null);
    const startTime = Date.now();

    try {
      const response = await fetch("/api/run-fusion-query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fusionUrl: selectedConnection.fusionUrl,
          username: selectedConnection.username,
          password: selectedConnection.password,
          sql: sqlQuery,
          rows: queryRowLimit || rowLimit,
          bindVariables: bindVariables,
        }),
        signal: abortControllerRef.current.signal,
      });

      const data = await response.json();
      const executionTime = Date.now() - startTime;
      setQueryExecutionTime(executionTime);

      if (data.success) {
        setQueryResults(data);
      } else {
        setError(data.error || "Query execution failed");
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError("Query was cancelled by user");
        setQueryExecutionTime(Date.now() - startTime);
      } else {
        setError(err.message || "Network error occurred");
        setQueryExecutionTime(Date.now() - startTime);
      }
    } finally {
      setIsExecuting(false);
      abortControllerRef.current = null;
    }
  };

  const handleQueryCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleQueryHistorySelect = (query: string) => {
    // This would need to be passed to the SQL workspace to set the active tab content
    console.log('Selected query from history:', query);
  };

  return (
    <div className="h-screen bg-background dark:bg-fusion-darker flex flex-col">




      {/* Main Layout */}
      <div className="flex-1 min-h-0 flex">
        {/* Collapsible Sidebar */}
        {!sidebarCollapsed && (
          <div className="w-64 bg-white dark:bg-background border-r border-gray-200 dark:border-border">
            <Sidebar
              onConnectionSelect={(connection) => {
                setSelectedConnection(connection);
                // Update saved connections list
                const saved = localStorage.getItem('fusionConnections');
                if (saved) {
                  setSavedConnections(JSON.parse(saved));
                }
              }}
              onQueryHistorySelect={handleQueryHistorySelect}
              selectedConnection={selectedConnection}
              onToggleSidebar={() => setSidebarCollapsed(true)}
              onEditConnection={(connection) => {
                const updatedConnections = savedConnections.map(c => 
                  c.id === connection.id ? connection : c
                );
                setSavedConnections(updatedConnections);
                localStorage.setItem('fusionConnections', JSON.stringify(updatedConnections));
                if (selectedConnection?.id === connection.id) {
                  setSelectedConnection(connection);
                }
              }}
              onDeleteConnection={(connectionId) => {
                const updatedConnections = savedConnections.filter(c => c.id !== connectionId);
                setSavedConnections(updatedConnections);
                localStorage.setItem('fusionConnections', JSON.stringify(updatedConnections));
                if (selectedConnection?.id === connectionId) {
                  setSelectedConnection(updatedConnections.length > 0 ? updatedConnections[0] : null);
                }
              }}
            />
          </div>
        )}
        
        {/* Main Content Area */}
        <div className="flex-1">
          <ResizablePanelGroup direction="vertical">
            {/* SQL Editor */}
            <ResizablePanel defaultSize={60} minSize={40}>
              <SqlWorkspace
                selectedConnection={selectedConnection}
                onQueryExecute={handleQueryExecute}
                onQueryCancel={handleQueryCancel}
                isExecuting={isExecuting}
                savedConnections={savedConnections}
                onConnectionChange={setSelectedConnection}
                sidebarCollapsed={sidebarCollapsed}
                onToggleSidebar={() => setSidebarCollapsed(false)}
              />
            </ResizablePanel>
            
            <ResizableHandle className="h-1 bg-fusion-gray hover:bg-fusion-light-gray" />
            
            {/* Results Panel */}
            <ResizablePanel defaultSize={40} minSize={25}>
              <ResultsPanelBottom
                results={queryResults}
                error={error}
                isExecuting={isExecuting}
                queryExecutionTime={queryExecutionTime}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </div>
  );
}
