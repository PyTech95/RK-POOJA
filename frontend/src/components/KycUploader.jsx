import { useState, useRef } from "react";
import { api } from "../lib/api";
import { Upload, CheckCircle2, Loader2, FileImage } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";

const LABELS = {
  aadhaar: "Aadhaar card",
  dl: "Driving Licence",
  rc: "RC (Vehicle Registration)",
  pan: "PAN card",
  insurance: "Insurance certificate",
  vehicle_photo: "Vehicle photo",
};

export function KycUploader({ docType, existing, onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Max file size 8 MB");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post(`/driver/kyc/upload?doc_type=${docType}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(`${LABELS[docType]} uploaded`);
      onUploaded?.(data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const fileId = existing?.file_id;
  const token = typeof window !== "undefined" ? localStorage.getItem("rk_token") : null;
  const previewUrl = fileId && token ? `${process.env.REACT_APP_BACKEND_URL}/api/files/${fileId}?auth=${token}` : null;

  return (
    <div className="rounded-xl border border-rk-border bg-slate-50 p-4" data-testid={`kyc-upload-${docType}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileImage size={18} className="text-rk-orange" />
          <div>
            <div className="font-semibold text-rk-ink text-sm">{LABELS[docType]}</div>
            <div className="text-xs text-rk-muted">
              {existing ? "Uploaded ✓ — replace if needed" : "JPEG/PNG/PDF · max 8 MB"}
            </div>
          </div>
        </div>
        {existing && <CheckCircle2 size={18} className="text-green-600" />}
      </div>

      {previewUrl && (
        <div className="mt-3 max-h-32 overflow-hidden rounded-lg bg-white border border-rk-border">
          <img src={previewUrl} alt={LABELS[docType]} className="w-full h-32 object-cover" />
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={onPick}
        className="hidden"
        data-testid={`kyc-file-input-${docType}`}
      />
      <Button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        variant="outline"
        size="sm"
        className="mt-3 w-full rounded-full"
        data-testid={`kyc-upload-btn-${docType}`}
      >
        {uploading ? <><Loader2 size={14} className="animate-spin mr-1" /> Uploading…</>
                   : <><Upload size={14} className="mr-1" /> {existing ? "Replace" : "Upload"}</>}
      </Button>
    </div>
  );
}
