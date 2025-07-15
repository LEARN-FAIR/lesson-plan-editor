import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import Editor from '@monaco-editor/react';

interface RawEditorProps {
  markdown: string;
  onChange: (updatedMarkdown: string) => void;
}

const RawEditor: React.FC<RawEditorProps> = ({ markdown, onChange }) => {
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      onChange(value);
    }
  };

  return (
    <Box>
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Raw Markdown Editor
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          This editor allows you to directly edit the entire markdown file, including frontmatter. 
          Be careful when making changes as incorrect formatting could make the document invalid.
        </Typography>
        
        <Box sx={{ height: '600px', border: '1px solid #ddd' }}>
          <Editor
            height="100%"
            defaultLanguage="markdown"
            value={markdown}
            onChange={handleEditorChange}
            options={{
              minimap: { enabled: false },
              wordWrap: 'on',
              lineNumbers: 'on',
              automaticLayout: true,
            }}
          />
        </Box>
      </Paper>
    </Box>
  );
};

export default RawEditor;
