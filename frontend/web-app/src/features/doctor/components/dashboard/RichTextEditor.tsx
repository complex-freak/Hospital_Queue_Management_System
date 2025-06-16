import React, { useEffect, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  initialValue: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autosave?: boolean;
  autosaveInterval?: number; // in milliseconds
  onAutosave?: (content: string) => Promise<void>;
}

const modules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['link'],
    ['clean']
  ]
};

const formats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'list', 'bullet',
  'link'
];

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  initialValue,
  onChange,
  placeholder = 'Write something...',
  className = '',
  autosave = false,
  autosaveInterval = 10000, // default to 10 seconds
  onAutosave
}) => {
  const [value, setValue] = useState(initialValue);
  const [lastSavedValue, setLastSavedValue] = useState(initialValue);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  useEffect(() => {
    setValue(initialValue);
    setLastSavedValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    let autosaveTimer: ReturnType<typeof setTimeout>;
    
    if (autosave && onAutosave && value !== lastSavedValue) {
      autosaveTimer = setTimeout(async () => {
        setIsSaving(true);
        try {
          await onAutosave(value);
          setLastSavedValue(value);
          setLastSaved(new Date().toLocaleTimeString());
        } catch (error) {
          console.error('Autosave failed:', error);
        } finally {
          setIsSaving(false);
        }
      }, autosaveInterval);
    }
    
    return () => {
      if (autosaveTimer) {
        clearTimeout(autosaveTimer);
      }
    };
  }, [value, lastSavedValue, autosave, autosaveInterval, onAutosave]);

  const handleChange = (content: string) => {
    setValue(content);
    onChange(content);
  };

  return (
    <div className="rich-text-editor-container">
      <ReactQuill 
        theme="snow" 
        value={value} 
        onChange={handleChange} 
        modules={modules} 
        formats={formats}
        placeholder={placeholder}
        className={cn('min-h-[200px]', className)}
      />
      {autosave && (
        <div className="mt-2 text-xs text-gray-500 flex items-center justify-end">
          {isSaving ? (
            <span>Saving...</span>
          ) : lastSaved ? (
            <span>Last saved at {lastSaved}</span>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default RichTextEditor; 