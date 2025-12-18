import { useState, useEffect } from "react";
import { Database, Server, History, Plus, ChevronRight, ChevronDown, Table, Eye, Package, ChevronUp, Edit, Trash2, X, Sun, Moon, HelpCircle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface Connection {
  id: string;
  name: string;
  fusionUrl: string;
  username: string;
  password: string;
  isConnected: boolean;
}

interface SidebarProps {
  onConnectionSelect: (connection: Connection) => void;
  onQueryHistorySelect: (query: string) => void;
  selectedConnection: Connection | null;
  onEditConnection?: (connection: Connection) => void;
  onDeleteConnection?: (connectionId: string) => void;
  onToggleSidebar?: () => void;
}

export default function Sidebar({ onConnectionSelect, onQueryHistorySelect, selectedConnection, onEditConnection, onDeleteConnection, onToggleSidebar }: SidebarProps) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    connections: true,
    history: false,
  });
  const [isNewConnectionOpen, setIsNewConnectionOpen] = useState(false);
  const [isEditConnectionOpen, setIsEditConnectionOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null);
  const [newConnection, setNewConnection] = useState({
    name: "",
    fusionUrl: "",
    username: "",
    password: "",
    saveCredentials: false,
  });
  const [editConnection, setEditConnection] = useState({
    name: "",
    fusionUrl: "",
    username: "",
    password: "",
    saveCredentials: false,
  });
  const [queryHistory, setQueryHistory] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Load saved connections
    const savedConnections = localStorage.getItem('fusionConnections');
    if (savedConnections) {
      try {
        setConnections(JSON.parse(savedConnections));
      } catch (e) {
        console.error('Failed to parse saved connections');
      }
    }
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const saveConnection = async () => {
    if (!newConnection.name || !newConnection.fusionUrl || !newConnection.username || !newConnection.password) {
      toast({
        title: "Missing Information",
        description: "Please fill in all connection fields",
        variant: "destructive",
      });
      return;
    }

    const connectionData = {
      id: Date.now().toString(),
      name: newConnection.name,
      fusionUrl: newConnection.fusionUrl,
      username: newConnection.username,
      password: newConnection.password,
      isConnected: false,
    };

    // Test connection first
    try {
      const response = await fetch("/api/test-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fusionUrl: connectionData.fusionUrl,
          username: connectionData.username,
          password: connectionData.password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        connectionData.isConnected = true;
        const updatedConnections = [...connections, connectionData];
        setConnections(updatedConnections);
        
        // Save connections based on user preference
        if (newConnection.saveCredentials) {
          // Save with credentials
          localStorage.setItem('fusionConnections', JSON.stringify(updatedConnections));
        } else {
          // Save without credentials (Level 1 security)
          const connectionsWithoutCredentials = updatedConnections.map(conn => ({
            ...conn,
            password: conn.id === connectionData.id ? '' : conn.password
          }));
          localStorage.setItem('fusionConnections', JSON.stringify(connectionsWithoutCredentials));
        }
        
        setIsNewConnectionOpen(false);
        setNewConnection({
          name: "",
          fusionUrl: "",
          username: "",
          password: "",
          saveCredentials: false,
        });
        
        toast({
          title: "Connection Added",
          description: "Successfully connected and saved to connections",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: data.error || "Failed to connect to Fusion Cloud",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Network error occurred while testing connection",
        variant: "destructive",
      });
    }
  };

  const updateConnection = async () => {
    if (!editingConnection || !editConnection.name || !editConnection.fusionUrl || !editConnection.username || !editConnection.password) {
      toast({
        title: "Missing Information",
        description: "Please fill in all connection fields",
        variant: "destructive",
      });
      return;
    }

    const connectionData = {
      ...editingConnection,
      name: editConnection.name,
      fusionUrl: editConnection.fusionUrl,
      username: editConnection.username,
      password: editConnection.password,
    };

    // Test connection first
    try {
      const response = await fetch("/api/test-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fusionUrl: connectionData.fusionUrl,
          username: connectionData.username,
          password: connectionData.password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        connectionData.isConnected = true;
        const updatedConnections = connections.map(c => 
          c.id === editingConnection.id ? connectionData : c
        );
        setConnections(updatedConnections);
        
        // Save connections based on user preference
        if (editConnection.saveCredentials) {
          // Save with credentials
          localStorage.setItem('fusionConnections', JSON.stringify(updatedConnections));
        } else {
          // Save without credentials (Level 1 security)
          const connectionsWithoutCredentials = updatedConnections.map(conn => ({
            ...conn,
            password: conn.id === connectionData.id ? '' : conn.password
          }));
          localStorage.setItem('fusionConnections', JSON.stringify(connectionsWithoutCredentials));
        }
        
        setIsEditConnectionOpen(false);
        setEditingConnection(null);
        setEditConnection({
          name: "",
          fusionUrl: "",
          username: "",
          password: "",
          saveCredentials: false,
        });
        
        // Update parent component if this is the selected connection
        if (selectedConnection?.id === editingConnection.id) {
          onConnectionSelect(connectionData);
        }
        
        toast({
          title: "Connection Updated",
          description: "Successfully updated and tested connection",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: data.error || "Failed to connect to Fusion Cloud",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Network error occurred while testing connection",
        variant: "destructive",
      });
    }
  };

  const selectConnection = (connection: Connection) => {
    onConnectionSelect(connection);
    
    // Load query history for this connection
    if (connection.username) {
      fetch(`/api/query-history/${connection.username}`)
        .then(res => res.json())
        .then(history => setQueryHistory(history))
        .catch(err => console.error('Failed to load query history:', err));
    }
  };

  return (
    <div className="w-64 bg-background dark:bg-background border-r border-border dark:border-border h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border dark:border-border flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground dark:text-foreground flex items-center">
          <Database className="w-5 h-5 text-fusion-blue mr-2" />
          FusionSQL
        </h2>
        {onToggleSidebar && (
          <Button
            onClick={onToggleSidebar}
            variant="ghost"
            size="sm"
            className="p-1 h-6 w-6"
            title="Hide Sidebar"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 p-2">
        {/* Connections Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between p-2 hover:bg-muted dark:hover:bg-muted rounded cursor-pointer"
               onClick={() => toggleSection('connections')}>
            <div className="flex items-center">
              {expandedSections.connections ? 
                <ChevronDown className="w-4 h-4 text-fusion-light-gray mr-1" /> :
                <ChevronRight className="w-4 h-4 text-fusion-light-gray mr-1" />
              }
              <Server className="w-4 h-4 text-fusion-blue mr-2" />
              <span className="text-sm text-foreground dark:text-foreground font-medium">Connections</span>
            </div>
            <Dialog open={isNewConnectionOpen} onOpenChange={setIsNewConnectionOpen}>
              <DialogTrigger asChild>
                <div
                  className="p-1 h-6 w-6 text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-foreground cursor-pointer flex items-center justify-center rounded"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Plus className="w-4 h-4" />
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-background dark:bg-background text-foreground dark:text-foreground border-border dark:border-border">
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-2">
                    <Server className="w-5 h-5 text-fusion-blue" />
                    <span>New Connection</span>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="connectionName" className="text-sm text-fusion-light-gray">
                      Connection Name
                    </Label>
                    <Input
                      id="connectionName"
                      value={newConnection.name}
                      onChange={(e) => setNewConnection({...newConnection, name: e.target.value})}
                      placeholder="My Fusion Instance"
                      className="bg-fusion-gray border-gray-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="connectionUrl" className="text-sm text-fusion-light-gray">
                      Fusion URL
                    </Label>
                    <Input
                      id="connectionUrl"
                      value={newConnection.fusionUrl}
                      onChange={(e) => setNewConnection({...newConnection, fusionUrl: e.target.value})}
                      placeholder="https://your-instance.oraclecloud.com"
                      className="bg-fusion-gray border-gray-600 text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="connectionUser" className="text-sm text-fusion-light-gray">
                        Username
                      </Label>
                      <Input
                        id="connectionUser"
                        value={newConnection.username}
                        onChange={(e) => setNewConnection({...newConnection, username: e.target.value})}
                        placeholder="username"
                        className="bg-fusion-gray border-gray-600 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="connectionPass" className="text-sm text-fusion-light-gray">
                        Password
                      </Label>
                      <Input
                        id="connectionPass"
                        type="password"
                        value={newConnection.password}
                        onChange={(e) => setNewConnection({...newConnection, password: e.target.value})}
                        placeholder="••••••••"
                        className="bg-fusion-gray border-gray-600 text-white"
                      />
                    </div>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <Checkbox
                        id="saveConn"
                        checked={newConnection.saveCredentials}
                        onCheckedChange={(checked) => setNewConnection({...newConnection, saveCredentials: !!checked})}
                        className="border-gray-600 data-[state=checked]:bg-fusion-blue"
                      />
                      <Label htmlFor="saveConn" className="text-sm text-white font-medium">
                        Save credentials to browser storage
                      </Label>
                    </div>
                    <div className="text-xs text-amber-200 ml-6">
                      <div className="mb-1">
                        <strong>Unchecked (Level 1):</strong> Memory only - credentials cleared when browser closes
                      </div>
                      <div>
                        <strong>Checked (Level 2):</strong> Browser storage - credentials saved locally for convenience
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="ghost"
                      onClick={() => setIsNewConnectionOpen(false)}
                      className="text-fusion-light-gray hover:text-white"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={saveConnection}
                      className="bg-fusion-blue hover:bg-blue-600 text-white"
                    >
                      Test & Save
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            {/* Edit Connection Dialog */}
            <Dialog open={isEditConnectionOpen} onOpenChange={setIsEditConnectionOpen}>
              <DialogContent className="max-w-md bg-background dark:bg-background text-foreground dark:text-foreground border-border dark:border-border">
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-2">
                    <Edit className="w-5 h-5 text-fusion-blue" />
                    <span>Edit Connection</span>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="editConnectionName" className="text-sm text-fusion-light-gray">
                      Connection Name
                    </Label>
                    <Input
                      id="editConnectionName"
                      value={editConnection.name}
                      onChange={(e) => setEditConnection({...editConnection, name: e.target.value})}
                      placeholder="My Fusion Instance"
                      className="bg-fusion-gray border-gray-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editConnectionUrl" className="text-sm text-fusion-light-gray">
                      Fusion URL
                    </Label>
                    <Input
                      id="editConnectionUrl"
                      value={editConnection.fusionUrl}
                      onChange={(e) => setEditConnection({...editConnection, fusionUrl: e.target.value})}
                      placeholder="https://your-instance.oraclecloud.com"
                      className="bg-fusion-gray border-gray-600 text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="editConnectionUser" className="text-sm text-fusion-light-gray">
                        Username
                      </Label>
                      <Input
                        id="editConnectionUser"
                        value={editConnection.username}
                        onChange={(e) => setEditConnection({...editConnection, username: e.target.value})}
                        placeholder="username"
                        className="bg-fusion-gray border-gray-600 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editConnectionPassword" className="text-sm text-fusion-light-gray">
                        Password
                      </Label>
                      <Input
                        id="editConnectionPassword"
                        type="password"
                        value={editConnection.password}
                        onChange={(e) => setEditConnection({...editConnection, password: e.target.value})}
                        placeholder="password"
                        className="bg-fusion-gray border-gray-600 text-white"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="editSaveCredentials"
                        checked={editConnection.saveCredentials}
                        onCheckedChange={(checked) => 
                          setEditConnection({...editConnection, saveCredentials: checked as boolean})
                        }
                        className="border-gray-600"
                      />
                      <Label htmlFor="editSaveCredentials" className="text-sm text-fusion-light-gray cursor-pointer">
                        Save credentials to browser storage (Security Level 2)
                      </Label>
                    </div>
                    <div className="text-xs text-amber-200 ml-6">
                      <div className="mb-1">
                        <strong>Unchecked (Level 1):</strong> Memory only - credentials cleared when browser closes
                      </div>
                      <div>
                        <strong>Checked (Level 2):</strong> Browser storage - credentials saved locally for convenience
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setIsEditConnectionOpen(false);
                        setEditingConnection(null);
                      }}
                      className="text-fusion-light-gray hover:text-white"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={updateConnection}
                      className="bg-fusion-blue hover:bg-blue-600 text-white"
                    >
                      Update & Test
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          {expandedSections.connections && (
            <div className="ml-6 space-y-1">
              {connections.length === 0 ? (
                <p className="text-xs text-muted-foreground dark:text-muted-foreground px-2 py-1">No connections</p>
              ) : (
                connections.map((conn) => (
                  <div
                    key={conn.id}
                    className={`group flex items-center p-2 rounded hover:bg-muted dark:hover:bg-muted ${
                      selectedConnection?.id === conn.id ? 'bg-accent dark:bg-accent border-l-2 border-primary' : ''
                    }`}
                  >
                    <div 
                      className="flex items-center flex-1 cursor-pointer"
                      onClick={() => {
                        // Only allow selection if connection is powered on
                        if (conn.isConnected) {
                          onConnectionSelect(conn);
                        } else {
                          toast({
                            title: "Connection Offline",
                            description: "Please power on the connection first using the power button",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <div className={`w-2 h-2 rounded-full mr-2 ${
                        conn.isConnected ? 'bg-green-400' : 'bg-gray-400'
                      }`} />
                      <span className={`text-sm truncate ${
                        conn.isConnected 
                          ? 'text-foreground dark:text-foreground' 
                          : 'text-muted-foreground dark:text-muted-foreground'
                      }`}>
                        {conn.name}
                        {!conn.isConnected && <span className="ml-1 text-xs">(offline)</span>}
                      </span>
                    </div>
                    
                    {/* Connection Management Buttons */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                      {/* Power Toggle Button - Always visible */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-6 w-6 p-0 ${conn.isConnected ? 'hover:bg-red-500/50' : 'hover:bg-green-500/50'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          // Toggle connection power state
                          const updatedConnection = { ...conn, isConnected: !conn.isConnected };
                          const updatedConnections = connections.map(c => 
                            c.id === conn.id ? updatedConnection : c
                          );
                          setConnections(updatedConnections);
                          localStorage.setItem('fusionConnections', JSON.stringify(updatedConnections));
                          
                          // If turning off the currently selected connection, disconnect it
                          if (!updatedConnection.isConnected && selectedConnection?.id === conn.id) {
                            onConnectionSelect(null as any);
                          }
                        }}
                        title={conn.isConnected ? "Power Off Connection" : "Power On Connection"}
                      >
                        {conn.isConnected ? (
                          <div className="w-3 h-3 bg-green-400 rounded-full" />
                        ) : (
                          <div className="w-3 h-3 bg-gray-400 rounded-full" />
                        )}
                      </Button>
                      
                      {/* Edit Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-muted dark:hover:bg-muted"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingConnection(conn);
                          setEditConnection({
                            name: conn.name,
                            fusionUrl: conn.fusionUrl,
                            username: conn.username,
                            password: conn.password,
                            saveCredentials: true, // Default to saving when editing
                          });
                          setIsEditConnectionOpen(true);
                        }}
                        title="Edit Connection"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      
                      {/* Delete Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-red-500/50"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete connection "${conn.name}"?`)) {
                            onDeleteConnection?.(conn.id);
                          }
                        }}
                        title="Delete Connection"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Query History Section */}
        <div className="mb-4">
          <div className="flex items-center p-2 hover:bg-muted dark:hover:bg-muted rounded cursor-pointer"
               onClick={() => toggleSection('history')}>
            {expandedSections.history ? 
              <ChevronDown className="w-4 h-4 text-fusion-light-gray mr-1" /> :
              <ChevronRight className="w-4 h-4 text-fusion-light-gray mr-1" />
            }
            <History className="w-4 h-4 text-fusion-blue mr-2" />
            <span className="text-sm text-foreground dark:text-foreground font-medium">Recent Queries</span>
          </div>
          
          {expandedSections.history && (
            <div className="ml-6 space-y-1">
              {queryHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground dark:text-muted-foreground px-2 py-1">No query history</p>
              ) : (
                queryHistory.slice(0, 10).map((query) => (
                  <div
                    key={query.id}
                    onClick={() => onQueryHistorySelect(query.sql)}
                    className="p-2 rounded cursor-pointer hover:bg-muted dark:hover:bg-muted"
                  >
                    <code className="text-xs text-foreground dark:text-foreground font-mono block truncate">
                      {query.sql.replace(/\s+/g, ' ').trim()}
                    </code>
                    <span className="text-xs text-muted-foreground dark:text-muted-foreground">
                      {new Date(query.executedAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Schema Browser (placeholder for future) */}
        <div className="mb-4">
          <div className="flex items-center p-2 text-muted-foreground dark:text-muted-foreground">
            <Table className="w-4 h-4 mr-2" />
            <span className="text-sm font-medium">Schema Browser</span>
          </div>
          <div className="ml-6">
            <p className="text-xs text-muted-foreground dark:text-muted-foreground px-2 py-1">
              {selectedConnection ? 'Connect to browse tables' : 'Select a connection'}
            </p>
          </div>
        </div>
      </ScrollArea>

      {/* Bottom Settings Section */}
      <div className="border-t border-border dark:border-border p-3">
        <div className="flex items-center justify-center space-x-2">
          {/* Theme Toggle */}
          <Button
            onClick={() => {
              const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
              const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
              
              if (newTheme === 'dark') {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
              
              localStorage.setItem('theme', newTheme);
            }}
            variant="ghost"
            size="sm"
            className="p-2 h-8 w-8"
            title="Toggle Theme"
          >
            {document.documentElement.classList.contains('dark') ? 
              <Sun className="w-4 h-4" /> : 
              <Moon className="w-4 h-4" />
            }
          </Button>

          {/* Help Documentation */}
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="p-2 h-8 w-8 text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-foreground"
                title="Help & Documentation"
              >
                <HelpCircle className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-background dark:bg-background text-foreground dark:text-foreground border-border dark:border-border">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <HelpCircle className="w-5 h-5 text-fusion-blue" />
                  <span>Help & Documentation</span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-foreground dark:text-foreground mb-2">Getting Started</h3>
                  <p className="text-muted-foreground dark:text-muted-foreground text-sm">
                    FusionSQL allows you to execute SQL queries against Oracle Fusion Cloud using the BI Publisher SOAP API.
                    Create connections in the sidebar and run queries using the tabbed SQL editor.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground dark:text-foreground mb-2">Interface Layout</h3>
                  <ul className="text-muted-foreground dark:text-muted-foreground text-sm space-y-1">
                    <li>• <strong>Left Sidebar:</strong> Database connections and query history</li>
                    <li>• <strong>Main Area:</strong> Tabbed SQL editor with syntax highlighting</li>
                    <li>• <strong>Bottom Panel:</strong> Query results and execution details</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground dark:text-foreground mb-2">Features</h3>
                  <ul className="text-muted-foreground dark:text-muted-foreground text-sm space-y-1">
                    <li>• Multiple SQL tabs with individual editors</li>
                    <li>• Saved connection management</li>
                    <li>• Query history and results export</li>
                    <li>• Raw XML and formatted data views</li>
                    <li>• Professional dark/light theme support</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground dark:text-foreground mb-2">Tips & Shortcuts</h3>
                  <ul className="text-muted-foreground dark:text-muted-foreground text-sm space-y-1">
                    <li>• <strong>Ctrl+Enter:</strong> Execute selected SQL text only (or entire query if nothing selected)</li>
                    <li>• <strong>Format SQL:</strong> Beautifies and auto-indents your SQL code for better readability</li>
                    <li>• <strong>Auto-save:</strong> All SQL content automatically saved every 3 seconds to prevent data loss</li>
                    <li>• <strong>Tab Management:</strong> Orange dots indicate unsaved changes in tabs</li>
                    <li>• <strong>Security Levels:</strong> Choose between memory-only (Level 1) or browser storage (Level 2)</li>
                  </ul>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}