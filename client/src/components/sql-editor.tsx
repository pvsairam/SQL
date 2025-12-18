import { useEffect, useRef, useState } from "react";
import { Code, History, Wand2, Play } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  rowLimit: number;
  onRowLimitChange: (limit: number) => void;
  onExecute: () => void;
  isExecuting: boolean;
}

export default function SqlEditor({ value, onChange, rowLimit, onRowLimitChange, onExecute, isExecuting }: SqlEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [editor, setEditor] = useState<any>(null);

  useEffect(() => {
    // Load Monaco Editor
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/monaco-editor@latest/min/vs/loader.js';
    script.onload = () => {
      (window as any).require.config({ 
        paths: { 'vs': 'https://unpkg.com/monaco-editor@latest/min/vs' }
      });
      
      (window as any).require(['vs/editor/editor.main'], () => {
        if (editorRef.current && !editor) {
          const monacoEditor = (window as any).monaco.editor.create(editorRef.current, {
            value: value,
            language: 'sql',
            theme: 'vs-dark',
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

          monacoEditor.onDidChangeModelContent(() => {
            onChange(monacoEditor.getValue());
          });

          setEditor(monacoEditor);
        }
      });
    };
    document.head.appendChild(script);

    return () => {
      if (editor) {
        editor.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (editor && editor.getValue() !== value) {
      editor.setValue(value);
    }
  }, [value, editor]);

  const formatSQL = () => {
    if (editor) {
      editor.getAction('editor.action.formatDocument').run();
    }
  };

  const showHistory = () => {
    // This would open a history modal/panel
    console.log('Show history');
  };

  return (
    <Card className="bg-fusion-dark border-fusion-gray">
      <CardHeader className="border-b border-fusion-gray">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-white flex items-center">
            <Code className="w-5 h-5 text-fusion-blue mr-2" />
            SQL Query
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={showHistory}
              className="p-2 text-fusion-light-gray hover:text-white"
            >
              <History className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={formatSQL}
              className="p-2 text-fusion-light-gray hover:text-white"
            >
              <Wand2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div
          ref={editorRef}
          className="w-full h-64 border border-gray-600 rounded-lg overflow-hidden bg-fusion-darker"
        />
        
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Label htmlFor="rowLimit" className="text-sm text-fusion-light-gray">
              Row Limit
            </Label>
            <Input
              id="rowLimit"
              type="number"
              min="1"
              max="100000"
              value={rowLimit}
              onChange={(e) => onRowLimitChange(parseInt(e.target.value) || 5000)}
              className="w-32 bg-fusion-gray border-gray-600 text-white placeholder-gray-400 focus:ring-fusion-blue focus:border-transparent"
            />
          </div>
          
          <Button
            onClick={onExecute}
            disabled={isExecuting}
            className="px-6 py-3 bg-fusion-blue hover:bg-blue-600 text-white font-medium flex items-center space-x-2 shadow-lg"
          >
            {isExecuting ? (
              <div className="w-4 h-4 loading-spinner" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            <span>Run Query</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
