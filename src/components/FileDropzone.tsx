import React, { useRef, useState } from 'react';
import { FileText, Upload } from 'lucide-react';

interface FileDropzoneProps {
  accept?: string;
  multiple?: boolean;
  label: string;
  helperText: string;
  onFilesSelected: (files: File[]) => void;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  accept = '.txt,.md,.csv,.json,.log',
  multiple = false,
  label,
  helperText,
  onFilesSelected,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files || []);
    if (dropped.length > 0) {
      onFilesSelected(multiple ? dropped : [dropped[0]]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 0) {
      onFilesSelected(multiple ? selected : [selected[0]]);
    }
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={label}
      className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-dashed transition-all cursor-pointer ${
        isDragging
          ? 'border-[#FF6B1A] bg-[#FF6B1A]/10'
          : 'border-white/15 bg-[#060606] hover:border-[#FF9A35]/50 hover:bg-[#0D0D10]'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
      />
      <div className="flex items-center gap-3.5">
        <div className="p-2.5 rounded-xl bg-[#121215] border border-white/10 text-[#FF9A35] shrink-0">
          <Upload className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xs font-semibold text-[#F5F5F5]">
            {label}
          </p>
          <p className="mt-0.5 text-[11px] text-[#71717A]">
            {helperText}
          </p>
        </div>
      </div>

      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-full bg-[#121215] border border-white/12 text-[#F5F5F5] group-hover:border-[#FF9A35]/40 transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto">
        <FileText className="w-3.5 h-3.5 text-[#FF9A35]" />
        <span>Browse Local Files</span>
      </span>
    </div>
  );
};
