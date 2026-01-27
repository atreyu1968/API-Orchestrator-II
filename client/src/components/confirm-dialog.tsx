import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "default",
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={variant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface UseConfirmDialogOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
}

export function useConfirmDialog() {
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    options: UseConfirmDialogOptions;
    onConfirm: () => void;
  }>({
    open: false,
    options: { title: "", description: "" },
    onConfirm: () => {},
  });

  const confirm = (options: UseConfirmDialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialogState({
        open: true,
        options,
        onConfirm: () => {
          resolve(true);
          setDialogState(prev => ({ ...prev, open: false }));
        },
      });
    });
  };

  const handleOpenChange = (open: boolean) => {
    setDialogState(prev => ({ ...prev, open }));
  };

  const ConfirmDialogComponent = () => (
    <ConfirmDialog
      open={dialogState.open}
      onOpenChange={handleOpenChange}
      title={dialogState.options.title}
      description={dialogState.options.description}
      confirmText={dialogState.options.confirmText}
      cancelText={dialogState.options.cancelText}
      variant={dialogState.options.variant}
      onConfirm={dialogState.onConfirm}
    />
  );

  return { confirm, ConfirmDialogComponent };
}

interface ResumeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onContinue: () => void;
  onRestart: () => void;
  continueText?: string;
  restartText?: string;
  cancelText?: string;
}

export function ResumeDialog({
  open,
  onOpenChange,
  title,
  description,
  onContinue,
  onRestart,
  continueText = "Continuar",
  restartText = "Reiniciar desde cero",
  cancelText = "Cancelar",
}: ResumeDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onRestart}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid="button-restart-from-scratch"
          >
            {restartText}
          </AlertDialogAction>
          <AlertDialogAction
            onClick={onContinue}
            data-testid="button-continue-generation"
          >
            {continueText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
