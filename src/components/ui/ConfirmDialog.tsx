"use client";

import { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Input } from "./Input";

type DialogVariant = "default" | "destructive";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: DialogVariant;
  requireConfirmText?: string;
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  requireConfirmText,
  isLoading = false,
}: ConfirmDialogProps) {
  const [confirmInput, setConfirmInput] = useState("");

  // Reset confirm input when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setConfirmInput("");
    }
  }, [isOpen]);

  const canConfirm = requireConfirmText
    ? confirmInput === requireConfirmText
    : true;

  const handleConfirm = () => {
    if (canConfirm && !isLoading) {
      onConfirm();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-muted">{message}</p>

        {requireConfirmText && (
          <div>
            <p className="text-sm text-foreground mb-2">
              Type <span className="font-semibold">{requireConfirmText}</span> to confirm:
            </p>
            <Input
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={requireConfirmText}
              disabled={isLoading}
            />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "destructive" ? "primary" : "primary"}
            onClick={handleConfirm}
            disabled={!canConfirm || isLoading}
            className={variant === "destructive" ? "bg-error hover:bg-error/90" : ""}
          >
            {isLoading ? "Processing..." : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
