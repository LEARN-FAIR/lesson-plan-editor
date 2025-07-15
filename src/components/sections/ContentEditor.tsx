import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { FairMarkdownDocument } from '../../types';
import MdxEditorComponent from '../common/MdxEditorComponent';

interface ContentEditorProps {
  document: FairMarkdownDocument;
  onChange: (updatedDocument: Partial<FairMarkdownDocument>) => void;
}

const ContentEditor: React.FC<ContentEditorProps> = ({ document, onChange }) => {
  const handleContentChange = (value: string | undefined) => {
    if (value !== undefined) {
      onChange({ content: value });
    }
  };

  return (
    <Box>
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Markdown Content
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Edit the main content of the document. This is the content that appears after the frontmatter.
        </Typography>
        
        <Box sx={{ minHeight: '500px' }}>
          <MdxEditorComponent
            markdown={document.content || ''}
            onChange={handleContentChange}
            minHeight="500px"
            maxHeight="800px"
            showToolbar={true}
            showDiffToggle={true}
            placeholder="Write your markdown content here..."
          />
        </Box>
      </Paper>
    </Box>
  );
};

export default ContentEditor;
