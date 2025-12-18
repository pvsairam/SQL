import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Save, Copy, FileText, X, Plus, Hash, Menu, Download, HardDrive, Upload, Square } from "lucide-react";
import { BindVariablesDialog } from "./bind-variables-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

interface SqlTab {
  id: string;
  title: string;
  content: string;
  isModified: boolean;
}

interface SqlWorkspaceProps {
  selectedConnection: any;
  onQueryExecute: (sql: string, rowLimit?: number, bindVariables?: Record<string, string>) => void;
  onQueryCancel?: () => void;
  isExecuting: boolean;
  savedConnections?: any[];
  onConnectionChange?: (connection: any) => void;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export default function SqlWorkspace({ selectedConnection, onQueryExecute, onQueryCancel, isExecuting, savedConnections = [], onConnectionChange, sidebarCollapsed, onToggleSidebar }: SqlWorkspaceProps) {
  const [tabs, setTabs] = useState<SqlTab[]>([
    {
      id: '1',
      title: 'Untitled 1',
      content: '-- Oracle Fusion Cloud SQL Query\n-- Use bind variables with :variable_name syntax\n-- Press Ctrl+Enter to execute\n\nSELECT * FROM per_all_people_f;',
      isModified: false,
    }
  ]);
  const [activeTab, setActiveTab] = useState('1');
  const [editors, setEditors] = useState<{ [key: string]: any }>({});
  const [rowLimit, setRowLimit] = useState<number>(5);
  const editorRefs = useRef<{ [key: string]: HTMLDivElement }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showBindVariablesDialog, setShowBindVariablesDialog] = useState(false);
  const [pendingSQL, setPendingSQL] = useState<string>('');
  const [pendingBindVariables, setPendingBindVariables] = useState<string[]>([]);

  // Auto-save functionality
  const AUTO_SAVE_KEY = 'fusionsql_tabs_autosave';
  const [lastSaved, setLastSaved] = useState<Date>(new Date());

  // Auto-save tabs to localStorage
  const autoSaveTabs = useCallback(() => {
    const saveData = {
      tabs: tabs,
      activeTab: activeTab,
      lastSaved: new Date().toISOString(),
    };
    localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(saveData));
    setLastSaved(new Date());
  }, [tabs, activeTab]);

  // Load saved tabs on component mount
  useEffect(() => {
    const savedData = localStorage.getItem(AUTO_SAVE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.tabs && parsed.tabs.length > 0) {
          setTabs(parsed.tabs);
          setActiveTab(parsed.activeTab || parsed.tabs[0].id);
          setLastSaved(new Date(parsed.lastSaved));
        }
      } catch (e) {
        console.error('Failed to load saved tabs:', e);
      }
    }
  }, []);

  // Auto-save every 3 seconds when content changes
  useEffect(() => {
    const timer = setTimeout(() => {
      autoSaveTabs();
    }, 3000);

    return () => clearTimeout(timer);
  }, [tabs, autoSaveTabs]);

  // Download file to desktop
  const downloadFile = (filename: string, content: string, mimeType: string = 'text/plain') => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Save current tab to desktop
  const saveCurrentTabToDesktop = () => {
    const currentTab = tabs.find(tab => tab.id === activeTab);
    if (currentTab) {
      const filename = currentTab.title.endsWith('.sql') ? currentTab.title : `${currentTab.title}.sql`;
      downloadFile(filename, currentTab.content, 'text/sql');
      
      // Mark tab as saved
      setTabs(prev => prev.map(tab => 
        tab.id === activeTab ? { ...tab, isModified: false } : tab
      ));
    }
  };

  // Save all tabs as workspace
  const saveWorkspaceToDesktop = () => {
    const workspaceData = {
      tabs: tabs,
      activeTab: activeTab,
      savedAt: new Date().toISOString(),
      appVersion: '1.0.0'
    };
    const filename = 'fusionsql_workspace.json';
    downloadFile(filename, JSON.stringify(workspaceData, null, 2), 'application/json');
  }
  
  const handleWorkspaceRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!file.name.toLowerCase().endsWith('.json')) {
      alert('Please select a valid JSON workspace file');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const workspaceData = JSON.parse(content);
        
        // Validate the workspace structure
        if (!workspaceData.tabs || !Array.isArray(workspaceData.tabs)) {
          alert('Invalid workspace file format');
          return;
        }
        
        // Confirm before restoring (as it will replace current tabs)
        const confirmRestore = confirm(
          `This will replace your current ${tabs.length} tab(s) with ${workspaceData.tabs.length} tab(s) from the workspace file.\n\nCurrent work will be lost if not saved. Continue?`
        );
        
        if (confirmRestore) {
          setTabs(workspaceData.tabs);
          setActiveTab(workspaceData.activeTab || workspaceData.tabs[0]?.id || '1');
          
          // Clear the file input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          
          alert(`Successfully restored workspace with ${workspaceData.tabs.length} tabs`);
        }
      } catch (error) {
        alert('Error reading workspace file. Please ensure it\'s a valid FusionSQL workspace file.');
      }
    };
    
    reader.readAsText(file);
  };

  // Handle browser close/refresh with unsaved content
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasUnsavedContent = tabs.some(tab => tab.isModified && tab.content.trim().length > 0);
      
      if (hasUnsavedContent) {
        e.preventDefault();
        e.returnValue = 'You have unsaved SQL code. Would you like to save your work before leaving?';
        
        // Trigger download of all modified tabs
        tabs.forEach(tab => {
          if (tab.isModified && tab.content.trim().length > 0) {
            const filename = tab.title.endsWith('.sql') ? tab.title : `${tab.title}.sql`;
            downloadFile(filename, tab.content, 'text/sql');
          }
        });
        
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [tabs]);

  // Function to parse and execute SQL queries
  const executeCurrentQuery = useCallback((editor: any) => {
    if (!selectedConnection) {
      alert('Please select a connection first');
      return;
    }

    const selection = editor.getSelection();
    let sqlToExecute = '';

    if (selection && !selection.isEmpty()) {
      // Execute selected text
      sqlToExecute = editor.getModel().getValueInRange(selection);
    } else {
      // Execute current statement at cursor position
      const fullText = editor.getValue();
      const position = editor.getPosition();
      const currentStatement = getCurrentStatementAtPosition(fullText, position);
      sqlToExecute = currentStatement;
    }

    if (sqlToExecute.trim()) {
      // Remove SQL comments before checking for bind variables
      const sqlWithoutComments = sqlToExecute
        .replace(/--.*$/gm, '')  // Remove single line comments
        .replace(/\/\*[\s\S]*?\*\//g, '')  // Remove multi-line comments
        .trim();
      
      // Check for bind variables in the uncommented SQL
      const bindVariableMatches = sqlWithoutComments.match(/:(\w+)/g);
      if (bindVariableMatches) {
        const bindVariables = Array.from(new Set(bindVariableMatches.map(match => match.substring(1))));
        setPendingSQL(sqlToExecute.trim());
        setPendingBindVariables(bindVariables);
        setShowBindVariablesDialog(true);
      } else {
        onQueryExecute(sqlToExecute.trim(), rowLimit);
      }
    }
  }, [selectedConnection, onQueryExecute, rowLimit]);

  // Function to get the current SQL statement at cursor position
  const getCurrentStatementAtPosition = (text: string, position: any) => {
    const lines = text.split('\n');
    
    // Split by semicolon but be smarter about what constitutes a complete statement
    const statements = [];
    let currentStatement = '';
    let inComment = false;
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      
      // Check if this line starts a comment block or single line comment
      if (line.trim().startsWith('--')) {
        // Single line comment - include in current statement but don't split
        currentStatement += line + '\n';
        continue;
      }
      
      // Look for semicolons that aren't in comments
      if (line.includes(';') && !line.trim().startsWith('--')) {
        currentStatement += line;
        statements.push(currentStatement.trim());
        currentStatement = '';
      } else {
        currentStatement += line + '\n';
      }
    }
    
    // Add the last statement if there's any content
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }
    
    if (statements.length === 1) {
      return statements[0].trim();
    }

    // Find which statement the cursor is in by line number
    let currentLine = position.lineNumber - 1;
    let lineCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statementLines = statements[i].split('\n').length;
      if (currentLine >= lineCount && currentLine < lineCount + statementLines) {
        return statements[i].trim();
      }
      lineCount += statementLines;
    }

    return statements[0].trim(); // fallback
  };

  useEffect(() => {
    // Load Monaco Editor for each tab
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/monaco-editor@latest/min/vs/loader.js';
    script.onload = () => {
      (window as any).require.config({ 
        paths: { 'vs': 'https://unpkg.com/monaco-editor@latest/min/vs' }
      });
      
      (window as any).require(['vs/editor/editor.main'], () => {
        tabs.forEach(tab => {
          if (editorRefs.current[tab.id] && !editors[tab.id]) {
            const editor = (window as any).monaco.editor.create(editorRefs.current[tab.id], {
              value: tab.content,
              language: 'sql',
              theme: document.documentElement.classList.contains('dark') ? 'vs-dark' : 'vs',
              automaticLayout: true,
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              roundedSelection: false,
              scrollBeyondLastLine: false,
              readOnly: false,
              wordWrap: 'on',
              contextmenu: true,
              selectOnLineNumbers: true,
              glyphMargin: false,
              folding: true,
              lineDecorationsWidth: 0,
              lineNumbersMinChars: 3,
              renderLineHighlight: 'line',
            });

            // Update theme when dark mode changes
            const updateTheme = () => {
              const isDark = document.documentElement.classList.contains('dark');
              (window as any).monaco.editor.setTheme(isDark ? 'vs-dark' : 'vs');
            };
            
            // Listen for theme changes
            const observer = new MutationObserver(updateTheme);
            observer.observe(document.documentElement, { 
              attributes: true, 
              attributeFilter: ['class'] 
            });

            // Add Ctrl+Enter keyboard shortcut with immediate execution
            editor.addCommand((window as any).monaco.KeyMod.CtrlCmd | (window as any).monaco.KeyCode.Enter, () => {
              // Get the active editor's content
              const selection = editor.getSelection();
              let sqlToExecute = '';

              if (selection && !selection.isEmpty()) {
                // Execute selected text
                sqlToExecute = editor.getModel().getValueInRange(selection);
              } else {
                // Execute current statement at cursor position
                const fullText = editor.getValue();
                const position = editor.getPosition();
                const currentStatement = getCurrentStatementAtPosition(fullText, position);
                sqlToExecute = currentStatement;
              }

              if (sqlToExecute.trim()) {
                // Trigger the Run button click instead of using executeCurrentQuery
                const runButton = document.querySelector('[data-testid="run-button"]') as HTMLButtonElement;
                if (runButton) {
                  runButton.click();
                } else {
                  // Fallback to the direct execution
                  executeCurrentQuery(editor);
                }
              }
            });

            editor.onDidChangeModelContent(() => {
              const currentContent = editor.getValue();
              setTabs(prevTabs => 
                prevTabs.map(t => 
                  t.id === tab.id 
                    ? { ...t, content: currentContent, isModified: currentContent !== tab.content }
                    : t
                )
              );
            });

            setEditors(prev => ({ ...prev, [tab.id]: editor }));
          }
        });
      });
    };
    
    if (!document.querySelector('script[src*="monaco-editor"]')) {
      document.head.appendChild(script);
    }
  }, [tabs, executeCurrentQuery]);

  const addNewTab = () => {
    const newId = (tabs.length + 1).toString();
    const newTab: SqlTab = {
      id: newId,
      title: `Untitled ${newId}`,
      content: '-- Enter your SQL query here\n',
      isModified: false,
    };
    setTabs([...tabs, newTab]);
    setActiveTab(newId);
  };

  const closeTab = (tabId: string) => {
    if (tabs.length === 1) return; // Don't close the last tab
    
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);
    
    if (activeTab === tabId) {
      setActiveTab(newTabs[0].id);
    }
    
    // Cleanup editor
    if (editors[tabId]) {
      editors[tabId].dispose();
      const newEditors = { ...editors };
      delete newEditors[tabId];
      setEditors(newEditors);
    }
  };

  const renameTab = (tabId: string, newTitle: string) => {
    setTabs(tabs.map(t => t.id === tabId ? { ...t, title: newTitle } : t));
  };

  const executeQuery = () => {
    const activeTabData = tabs.find(t => t.id === activeTab);
    if (activeTabData && selectedConnection && editors[activeTab]) {
      executeCurrentQuery(editors[activeTab]);
    }
  };

  const handleBindVariablesSubmit = (bindVariables: Record<string, string>) => {
    if (pendingSQL) {
      // Replace bind variables in SQL with actual values
      let processedSQL = pendingSQL;
      Object.entries(bindVariables).forEach(([key, value]) => {
        const regex = new RegExp(`:${key}\\b`, 'g');
        processedSQL = processedSQL.replace(regex, `'${value}'`);
      });
      
      onQueryExecute(processedSQL, rowLimit, bindVariables);
      setPendingSQL('');
      setPendingBindVariables([]);
    }
  };

  const formatSQL = () => {
    const editor = editors[activeTab];
    if (editor) {
      // Use Monaco's built-in SQL formatting
      editor.getAction('editor.action.formatDocument').run();
      
      // Additional custom formatting for Oracle SQL
      const currentValue = editor.getValue();
      const formatted = currentValue
        .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
        .replace(/,\s*/g, ',\n    ')  // Put commas on new lines with indent
        .replace(/\bFROM\b/gi, '\nFROM')  // FROM on new line
        .replace(/\bWHERE\b/gi, '\nWHERE')  // WHERE on new line  
        .replace(/\bAND\b/gi, '\n  AND')  // AND with indent
        .replace(/\bOR\b/gi, '\n  OR')  // OR with indent
        .replace(/\bORDER BY\b/gi, '\nORDER BY')  // ORDER BY on new line
        .replace(/\bGROUP BY\b/gi, '\nGROUP BY')  // GROUP BY on new line
        .trim();
      
      editor.setValue(formatted);
    }
  };

  const copySQL = () => {
    const activeTabData = tabs.find(t => t.id === activeTab);
    if (activeTabData) {
      navigator.clipboard.writeText(activeTabData.content);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="bg-background dark:bg-background border-b border-border dark:border-border p-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {sidebarCollapsed && onToggleSidebar && (
            <Button
              onClick={onToggleSidebar}
              variant="ghost"
              size="sm"
              className="p-2"
              title="Show Sidebar"
            >
              <Menu className="w-4 h-4" />
            </Button>
          )}
          {!isExecuting ? (
            <Button
              onClick={executeQuery}
              disabled={!selectedConnection}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 flex items-center space-x-2"
              title="Run Query (Ctrl+Enter)"
              data-testid="run-button"
            >
              <Play className="w-4 h-4" />
              <span>Run</span>
            </Button>
          ) : (
            <Button
              onClick={() => onQueryCancel && onQueryCancel()}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 flex items-center space-x-2"
              title="Stop Query Execution"
              data-testid="stop-button"
            >
              <Square className="w-4 h-4" />
              <span>Stop</span>
            </Button>
          )}
          
          <div className="flex items-center space-x-2 px-3 py-1 bg-muted dark:bg-muted rounded border border-border dark:border-border">
            <Hash className="w-4 h-4 text-muted-foreground dark:text-muted-foreground" />
            <span className="text-sm text-muted-foreground dark:text-muted-foreground">Rows:</span>
            <Select value={rowLimit.toString()} onValueChange={(value) => setRowLimit(parseInt(value))}>
              <SelectTrigger className="w-20 h-7 bg-transparent border-none text-muted-foreground dark:text-muted-foreground text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background dark:bg-background border-border dark:border-border">
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200</SelectItem>
                <SelectItem value="500">500</SelectItem>
                <SelectItem value="1000">1000</SelectItem>
                <SelectItem value="5000">5000</SelectItem>
                <SelectItem value="10000">10000</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={formatSQL}
            className="text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-foreground"
            title="Format and beautify SQL (Auto-indents and organizes your query)"
          >
            Format SQL
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={saveCurrentTabToDesktop}
            className="text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-foreground"
            title="Save current SQL file to desktop"
          >
            <Download className="w-4 h-4 mr-1" />
            Save
          </Button>
          
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={saveWorkspaceToDesktop}
              className="text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-foreground"
              title="Save all tabs as workspace file (JSON backup of entire project)"
            >
              <HardDrive className="w-4 h-4 mr-1" />
              Save Workspace
            </Button>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleWorkspaceRestore}
              accept=".json"
              style={{ display: 'none' }}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-foreground"
              title="Restore workspace from JSON file"
            >
              <Upload className="w-4 h-4 mr-1" />
              Load Workspace
            </Button>
          </div>
          
          <div className="w-px h-6 bg-border dark:bg-border"></div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={copySQL}
            className="text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-foreground"
            title="Copy current tab's SQL to clipboard"
          >
            <Copy className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-xs text-muted-foreground dark:text-muted-foreground bg-muted dark:bg-muted px-2 py-1 rounded flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>Auto-saved {new Date(lastSaved).toLocaleTimeString()}</span>
          </div>
          <span className="text-sm text-muted-foreground dark:text-muted-foreground">Connected to:</span>
          <Select 
            value={selectedConnection?.name || ""} 
            onValueChange={(value) => {
              if (value === "add_new") {
                // Could trigger parent callback to open connection form
                alert("Use the sidebar to add new connections");
                return;
              }
              const connection = savedConnections.find(c => c.name === value);
              if (connection && onConnectionChange) {
                onConnectionChange(connection);
              }
            }}
          >
            <SelectTrigger className="w-48 bg-background dark:bg-background border-border dark:border-border text-foreground dark:text-foreground text-sm h-8">
              <div className="flex items-center space-x-2">
                <SelectValue placeholder="Choose Connection" />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-background dark:bg-background border-border dark:border-border !bg-background dark:!bg-background">
              {savedConnections
                .filter(connection => connection.isConnected) // Only show powered-on connections
                .map((connection) => (
                <SelectItem key={connection.name} value={connection.name} className="text-foreground dark:text-foreground bg-background dark:bg-background hover:bg-muted dark:hover:bg-muted">
                  <span>{connection.name}</span>
                </SelectItem>
              ))}
              {savedConnections.length > 0 && (
                <div className="border-t border-border dark:border-border mt-2 pt-2">
                  <SelectItem value="add_new" className="text-primary dark:text-primary bg-background dark:bg-background hover:bg-muted dark:hover:bg-muted">
                    + Add New Connection
                  </SelectItem>
                </div>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tab Editor */}
      <div className="flex-1 bg-background dark:bg-background">
        <div className="h-full flex flex-col">
          <div className="bg-muted dark:bg-background border-b border-border dark:border-border">
            <div className="flex items-center">
              <div className="bg-transparent h-auto p-0 flex">
                {tabs.map((tab) => (
                  <div 
                    key={tab.id} 
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-4 py-2 border-r border-border dark:border-border cursor-pointer min-w-0 ${
                      activeTab === tab.id 
                        ? 'bg-background dark:bg-background text-foreground dark:text-foreground' 
                        : 'bg-transparent text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-foreground hover:bg-muted dark:hover:bg-muted'
                    }`}
                  >
                    <FileText className="w-3 h-3 flex-shrink-0" />
                    <Input
                      value={tab.title}
                      onChange={(e) => renameTab(tab.id, e.target.value)}
                      className="bg-transparent border-none p-0 h-auto text-sm min-w-0 focus:ring-0"
                      onBlur={(e) => {
                        if (!e.target.value.trim()) {
                          renameTab(tab.id, `Untitled ${tab.id}`);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    {tab.isModified && <div className="w-2 h-2 bg-orange-400 rounded-full flex-shrink-0" />}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab.id);
                      }}
                      className="p-0 h-4 w-4 text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-foreground flex-shrink-0 cursor-pointer flex items-center justify-center hover:bg-red-500/20 rounded"
                    >
                      <X className="w-3 h-3" />
                    </div>
                  </div>
                ))}
              </div>
              <div
                onClick={addNewTab}
                className="p-2 text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-foreground ml-2 cursor-pointer flex items-center justify-center hover:bg-muted dark:hover:bg-muted rounded"
              >
                <Plus className="w-4 h-4" />
              </div>
            </div>
          </div>
          
          {tabs.map((tab) => (
            <div 
              key={tab.id} 
              className={`flex-1 ${activeTab === tab.id ? 'block' : 'hidden'}`}
            >
              <div
                ref={(el) => {
                  if (el) editorRefs.current[tab.id] = el;
                }}
                className="w-full h-full"
              />
            </div>
          ))}
        </div>
        
        <BindVariablesDialog
          isOpen={showBindVariablesDialog}
          onClose={() => setShowBindVariablesDialog(false)}
          onSubmit={handleBindVariablesSubmit}
          bindVariables={pendingBindVariables}
        />
      </div>
    </div>
  );
}