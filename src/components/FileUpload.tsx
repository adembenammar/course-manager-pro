import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, FileText, Loader2 } from 'lucide-react';

interface FileUploadProps {
  bucket: string;
  folder: string;
  onUploadComplete: (url: string, fileName: string) => void;
  accept?: string;
  maxSize?: number; // in MB
  existingFile?: string;
}

const FileUpload = ({
  bucket,
  folder,
  onUploadComplete,
  accept = '*',
  maxSize = 10,
  existingFile,
}: FileUploadProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(existingFile || null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Fichier trop volumineux',
        description: `La taille maximale est de ${maxSize}MB`,
      });
      return;
    }

    setUploading(true);
    setProgress(0);

    const fileExt = file.name.split('.').pop();
    const filePath = `${folder}/${Date.now()}.${fileExt}`;

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 10, 90));
    }, 100);

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, { upsert: true });

    clearInterval(progressInterval);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur d\'upload',
        description: error.message,
      });
      setUploading(false);
      setProgress(0);
      return;
    }

    setProgress(100);

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    setFileName(file.name);
    onUploadComplete(publicUrl, file.name);
    setUploading(false);

    toast({
      title: 'Fichier uploadé',
      description: 'Le fichier a été téléversé avec succès.',
    });
  };

  const handleRemove = () => {
    setFileName(null);
    onUploadComplete('', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />

      {fileName ? (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
          <FileText className="w-5 h-5 text-primary flex-shrink-0" />
          <span className="flex-1 text-sm truncate">{fileName}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={handleRemove}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full h-24 border-dashed"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-sm">Téléversement...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-6 h-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Cliquez pour sélectionner un fichier
              </span>
            </div>
          )}
        </Button>
      )}

      {uploading && (
        <Progress value={progress} className="h-2" />
      )}
    </div>
  );
};

export default FileUpload;