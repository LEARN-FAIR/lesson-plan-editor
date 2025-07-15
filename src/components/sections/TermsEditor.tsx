import React from 'react';
import { Box, Typography, Paper, Alert, AlertTitle } from '@mui/material';
import { FairMarkdownDocument } from '../../types';

interface TermsEditorProps {
  document: FairMarkdownDocument;
  onChange: (updatedDocument: Partial<FairMarkdownDocument>) => void;
}

const TermsEditor: React.FC<TermsEditorProps> = ({ document, onChange }) => {
  // This component is simplified since terms4FAIRskills section can be skipped
  // as confirmed by the user
  
  return (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        <AlertTitle>Terms for FAIR Skills Section</AlertTitle>
        The terms4FAIRskills section has been omitted from the editor as confirmed.
        Any existing terms will be preserved in the document.
      </Alert>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Terms for FAIR Skills
        </Typography>
        
        <Typography variant="body1">
          {document.terms4FAIRskills && document.terms4FAIRskills.length > 0 ? (
            <span>
              This document contains {document.terms4FAIRskills.length} term(s) structured as subject-predicate-object triples.
              These will be preserved when saving.
            </span>
          ) : (
            <span>No terms have been defined in this document.</span>
          )}
        </Typography>
      </Paper>
    </Box>
  );
};

export default TermsEditor;
