import { Button, Modal } from 'react-typescript-ui';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  /** Destructive actions get the danger button (style guide section 9.1). */
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Centered confirmation modal, the only place modals are used (section 9.5). */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  destructive,
  busy,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onCancel}
      title={title}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" color="neutral" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button color={destructive ? 'danger' : 'primary'} onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-muted">{message}</p>
    </Modal>
  );
}

export default ConfirmDialog;
