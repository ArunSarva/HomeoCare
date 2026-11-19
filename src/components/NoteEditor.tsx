import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import RichEditor, { type ToolbarItemKey, type ToolbarConfig } from 'react_typescript_editor';
import 'react_typescript_editor/style.css';

// Default toolbar with enabled features (no video, emoji, HTML, code blocks, templates)
const DEFAULT_TOOLBAR: ToolbarItemKey[][] = [
  ['undo', 'redo'],
  ['bold', 'italic', 'underline'],
  ['orderedList', 'bulletList'],
  ['table'],
];

// Slash command templates
export const SLASH_COMMANDS = {
  case: {
    trigger: '/case',
    template: `### Chief Complaint

### Mental Symptoms

### Physical Symptoms

### Thermal State

### Appetite

### Thirst

### Sleep

### Dreams

### Family History

### Prescription`,
  },
  followup: {
    trigger: '/followup',
    template: `### Current Condition

### Improvement %

### New Symptoms

### Energy Level

### Prescription Changes

### Next Review`,
  },
};

export interface NoteEditorRef {
  insertContent: (content: string) => void;
  getValue: () => string;
  setValue: (content: string) => void;
  insertSlashCommand: (command: 'case' | 'followup') => void;
}

// Available toolbar items (for documentation)
export const AVAILABLE_TOOLBAR_ITEMS: ToolbarItemKey[] = [
  'undo',
  'redo',
  'fontFamily',
  'fontSize',
  'bold',
  'italic',
  'underline',
  'strikethrough',
  'subscript',
  'superscript',
  'textColor',
  'backgroundColor',
  'align-left',
  'align-center',
  'align-right',
  'align-justify',
  'orderedList',
  'bulletList',
  'outdent',
  'indent',
  'blockquote',
  'codeBlock',
  'link',
  'image',
  'file',
  'video',
  'table',
  'formula',
  'molecule',
  'specialChars',
  'hr',
  'clearFormat',
  'find',
  'export',
  'fullscreen',
];

interface NoteEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  height?: string;
  toolbar?: ToolbarConfig;
}

const NoteEditor = forwardRef<NoteEditorRef, NoteEditorProps>(
  function NoteEditor({ 
    value = '', 
    onChange, 
    placeholder = 'Start typing...', 
    height = '500px', 
    toolbar = DEFAULT_TOOLBAR 
  }, ref) {
    const [content, setContent] = useState(value);

    const insertSlashCommand = (command: 'case' | 'followup') => {
      const template = SLASH_COMMANDS[command].template;
      // RichEditor's API doesn't expose direct content insertion
      // In a real app, we would use the editor's API to insert at cursor
      // For now, we log the command for documentation
      console.log(`Inserting ${command} template:`, template);
    };

    // Expose methods to parent components
    useImperativeHandle(ref, () => ({
      insertContent: (_insertContent) => {
        console.log('insertContent not implemented in RichEditor API');
      },
      getValue: () => content,
      setValue: (newContent) => {
        setContent(newContent);
      },
      insertSlashCommand,
    }));

    useEffect(() => {
      if (value !== content) {
        setContent(value);
      }
    }, [value, content]);

    return (
      <div className="note-editor-wrapper">
        <RichEditor
          value={content}
          onChange={(html) => {
            setContent(html);
            onChange?.(html);
          }}
          height={height}
          placeholder={placeholder}
          toolbar={toolbar}
          theme="light"
          showWordCount={true}
        />
      </div>
    );
  }
);

// Export the component for use in other modules
export default NoteEditor;

// Export type for consumers
export type { ToolbarConfig, ToolbarItemKey };
