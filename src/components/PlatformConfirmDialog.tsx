type PlatformConfirmDialogProps = {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function PlatformConfirmDialog({ message, onConfirm, onCancel }: PlatformConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="confirmation-title" className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 id="confirmation-title" className="text-lg font-semibold text-slate-900">Please confirm</h2>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700">Cancel</button>
          <button type="button" onClick={onConfirm} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white">Confirm</button>
        </div>
      </div>
    </div>
  );
}
