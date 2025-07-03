import React from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export interface NoteVersion {
  id: string;
  content: string;
  timestamp: string;
  doctorName: string;
}

interface NoteHistoryProps {
  versions: NoteVersion[];
  onRestoreVersion: (version: NoteVersion) => void;
  currentVersionId?: string;
}

const NoteHistory: React.FC<NoteHistoryProps> = ({
  versions,
  onRestoreVersion,
  currentVersionId
}) => {
  if (!versions.length) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="text-gray-400">No previous note versions available</div>
      </div>
    );
  }

  return (
    <div className="note-history">
      <h3 className="mb-4 font-medium text-gray-700">Note History</h3>
      
      <Accordion type="single" collapsible className="w-full">
        {versions.map((version) => (
          <AccordionItem 
            key={version.id} 
            value={version.id}
            className={currentVersionId === version.id ? "bg-blue-50 border-l-4 border-blue-500" : ""}
          >
            <AccordionTrigger className="hover:no-underline">
              <div className="flex w-full justify-between px-1 text-left">
                <div>
                  <span className="font-medium">
                    {format(new Date(version.timestamp), "MMM d, yyyy")}
                  </span>
                  <span className="ml-2 text-sm text-gray-500">
                    {format(new Date(version.timestamp), "h:mm a")}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  {version.doctorName}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <div className="rounded-md border bg-white p-3">
                  <div className="prose max-w-none prose-sm" 
                    dangerouslySetInnerHTML={{ __html: version.content }} 
                  />
                </div>
                
                {currentVersionId !== version.id && (
                  <div className="flex justify-end">
                    <Button
                      variant="outline" 
                      size="sm"
                      onClick={() => onRestoreVersion(version)}
                    >
                      Restore This Version
                    </Button>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

export default NoteHistory; 