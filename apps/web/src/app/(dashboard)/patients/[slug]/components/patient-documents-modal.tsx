"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Upload, Plus, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { clinicApi, type ClinicDocument } from "@/lib/clinic-api";

interface PatientDocumentsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  p360?: any;
  coupleId?: string;
  patientId?: string;
}

export function PatientDocumentsModal({
  isOpen,
  onOpenChange,
  p360,
  coupleId,
  patientId,
}: PatientDocumentsModalProps) {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (p360?.documents && p360.documents.length > 0) {
        setDocs(p360.documents);
      } else {
        setLoading(true);
        clinicApi
          .documents()
          .then((data) => {
            const filtered = (data || []).filter(
              (d) => d.coupleId === coupleId || (patientId && d.coupleId === patientId)
            );
            setDocs(filtered);
          })
          .catch(console.error)
          .finally(() => setLoading(false));
      }
    }
  }, [isOpen, p360, coupleId, patientId]);

  const handleSimulateUpload = async () => {
    setUploading(true);
    try {
      const newDoc = {
        name: `Clinical_Consent_${new Date().toISOString().split("T")[0]}.pdf`,
        category: "Consent Form",
        coupleId: coupleId || "couple",
        uploaded: new Date().toISOString(),
        uploadedBy: "Doctor / Staff",
        status: "Reviewed" as const,
        mimeType: "application/pdf",
        size: 1024 * 320,
      };
      await clinicApi.createDocument(newDoc);
      toast.success("Document uploaded and attached to patient record");
      setDocs((prev) => [newDoc, ...prev]);
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = (docName: string) => {
    toast.info(`Opening ${docName}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-gray-100 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#866BE3]/10 text-[#866BE3] flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900">
                Patient Documents & Clinical Records
              </DialogTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                Consents, diagnostic reports, and medical certificates
              </p>
            </div>
          </div>

          <Button
            size="sm"
            disabled={uploading}
            onClick={handleSimulateUpload}
            className="bg-[#866BE3] hover:bg-[#7254d1] text-white text-xs h-8 gap-1.5"
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Upload Doc
          </Button>
        </DialogHeader>

        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="py-12 text-center text-xs text-gray-400">Loading documents...</div>
          ) : docs.length > 0 ? (
            docs.map((doc, idx) => (
              <div
                key={doc.id || idx}
                className="p-3.5 rounded-xl border border-gray-100 hover:border-gray-200 bg-white flex items-center justify-between gap-4 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                    <FileText className="w-4 h-4 text-[#866BE3]" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-xs text-gray-800 truncate">{doc.name || "Medical Record.pdf"}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {doc.category || "Clinical Record"} • {doc.uploaded ? new Date(doc.uploaded).toLocaleDateString("en-IN") : "Recent"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Badge
                    variant="secondary"
                    className="text-[10px] font-medium bg-emerald-50 text-emerald-700 border-emerald-200"
                  >
                    {doc.status || "Verified"}
                  </Badge>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDownload(doc.name)}
                    className="h-8 w-8 text-gray-400 hover:text-gray-700"
                    title="Download document"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center border border-dashed rounded-xl border-gray-200">
              <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs font-medium text-gray-600">No documents uploaded yet</p>
              <p className="text-[11px] text-gray-400 mt-1">
                Upload signed consents, ultrasound reports, or blood panels above.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 bg-gray-50 border-t border-gray-100">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs w-full">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
