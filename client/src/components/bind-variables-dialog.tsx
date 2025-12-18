import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BindVariablesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (variables: Record<string, string>) => void;
  bindVariables: string[];
}

export function BindVariablesDialog({ 
  isOpen, 
  onClose, 
  onSubmit, 
  bindVariables 
}: BindVariablesDialogProps) {
  const [variables, setVariables] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    bindVariables.forEach(variable => {
      initial[variable] = '';
    });
    return initial;
  });

  const handleSubmit = () => {
    onSubmit(variables);
    onClose();
  };

  const handleVariableChange = (variable: string, value: string) => {
    setVariables(prev => ({
      ...prev,
      [variable]: value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-white dark:bg-fusion-dark border-gray-200 dark:border-gray-700" aria-describedby="bind-variables-description">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-white">
            Enter Bind Variable Values
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p id="bind-variables-description" className="text-sm text-gray-600 dark:text-gray-400">
            Your SQL query contains bind variables (parameters starting with :). 
            Please provide values for each variable:
          </p>
          
          {bindVariables.map(variable => (
            <div key={variable} className="space-y-2">
              <Label htmlFor={variable} className="text-sm font-medium text-gray-700 dark:text-gray-300">
                :{variable}
              </Label>
              <Input
                id={variable}
                value={variables[variable] || ''}
                onChange={(e) => handleVariableChange(variable, e.target.value)}
                placeholder={`Enter value for :${variable}`}
                className="bg-white dark:bg-fusion-gray border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
              />
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={bindVariables.some(variable => !variables[variable])}
            className="bg-fusion-blue hover:bg-blue-600 text-white"
          >
            Execute Query
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}