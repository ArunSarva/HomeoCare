// Slash command handler for rich text editor
export interface SlashCommand {
  trigger: string;
  heading: string;
  content: string;
}

// Case note headings (for /case command)
export const CASE_HEADING: SlashCommand = {
  trigger: '/case',
  heading: 'Chief Complaint',
  content: `Chief Complaint:

Mental Symptoms:

Physical Symptoms:

Thermal State:

Appetite:

Thirst:

Sleep:

Dreams:

Family History:

Prescription:`
};

// Follow-up note headings (for /followup command)
export const FOLLOWUP_HEADING: SlashCommand = {
  trigger: '/followup',
  heading: 'Current Condition',
  content: `Current Condition:

Improvement %:

New Symptoms:

Energy Level:

Prescription Changes:

Next Review:`
};

// Check if text contains a slash command
export function parseSlashCommand(text: string): SlashCommand | null {
  const lines = text.split('\n');
  const lastLine = lines[lines.length - 1] || '';
  
  if (lastLine.trim() === CASE_HEADING.trigger) {
    return CASE_HEADING;
  }
  
  if (lastLine.trim() === FOLLOWUP_HEADING.trigger) {
    return FOLLOWUP_HEADING;
  }
  
  return null;
}

// Insert heading at cursor position in editor
export function insertSlashCommand(editorRef: React.RefObject<any>, command: SlashCommand): void {
  if (!editorRef.current) return;
  
  try {
    const { heading, content } = command;
    
    // The rich editor API should have a method to insert content at cursor
    // This is a placeholder - actual implementation depends on editor API
    console.log(`Inserting slash command: ${heading}`);
    console.log(`Content: ${content}`);
    
    // Example implementation (adjust based on actual editor API):
    // editorRef.current.insertContent(content);
  } catch (error) {
    console.error('Error inserting slash command:', error);
  }
}
