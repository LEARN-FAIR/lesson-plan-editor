/**
 * Markdown file service for handling file operations
 */

// Export filename as a constant for reuse
export const DEFAULT_FILENAME = '1-why-fair.md';

/**
 * Loads the markdown content from the specified path
 * @returns Promise with the markdown content
 */
export const loadMarkdownFile = async (): Promise<string> => {
  try {
    const response = await fetch('/1-why-fair.md');
    
    if (!response.ok) {
      throw new Error(`Failed to load markdown: ${response.status} ${response.statusText}`);
    }
    
    return response.text();
  } catch (error) {
    console.error('Error loading markdown:', error);
    throw error;
  }
};

/**
 * Exports the markdown content as a file download
 * @param content The markdown content to export
 * @param filename The filename to use for the download
 */
export const exportMarkdownFile = (content: string, filename: string = DEFAULT_FILENAME): void => {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  
  // Clean up
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Gets the current filename for the markdown file
 * @returns The current filename 
 */
export const getCurrentFilename = (): string => {
  return DEFAULT_FILENAME;
};
