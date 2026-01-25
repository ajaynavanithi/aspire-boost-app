import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ResumeUploaderProps {
  onUpload: (file: File) => Promise<void>;
  isUploading?: boolean;
}

export const ResumeUploader: React.FC<ResumeUploaderProps> = ({
  onUpload,
  isUploading = false,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const validTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/plain',
      ];
      
      if (!validTypes.includes(file.type)) {
        toast.error('Please upload a PDF, Word document, or TXT file');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }

      setSelectedFile(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
    disabled: isUploading,
  });

  const handleUpload = async () => {
    if (!selectedFile) return;
    await onUpload(selectedFile);
  };

  const removeFile = () => {
    setSelectedFile(null);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        {...getRootProps()}
        className={cn(
          'relative border-2 border-dashed rounded-2xl p-12 transition-all duration-300 cursor-pointer',
          isDragActive
            ? 'border-primary bg-primary/5 scale-[1.02]'
            : 'border-border hover:border-primary/50 hover:bg-muted/50',
          isUploading && 'pointer-events-none opacity-60'
        )}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center gap-4 text-center">
          <div
            className={cn(
              'w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300',
              isDragActive
                ? 'bg-primary text-primary-foreground scale-110'
                : 'bg-muted text-muted-foreground'
            )}
          >
            <Upload className="w-10 h-10" />
          </div>
          
          <div>
            <h3 className="text-xl font-display font-semibold mb-2">
              {isDragActive ? 'Drop your resume here' : 'Upload Your Resume'}
            </h3>
            <p className="text-muted-foreground">
              Drag and drop your resume here, or click to browse
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Supports PDF, DOC, DOCX, TXT (Max 10MB)
            </p>
          </div>
        </div>
      </div>

      {selectedFile && (
        <div className="mt-6 animate-slide-up">
          <div className="bg-card rounded-xl p-4 border border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={removeFile}
                disabled={isUploading}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Button
            variant="hero"
            size="xl"
            className="w-full mt-4"
            onClick={handleUpload}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyzing Resume...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Analyze My Resume
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};
