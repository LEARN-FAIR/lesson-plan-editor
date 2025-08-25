import React, { useState } from 'react';
import { Box, TextField, Button, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, Typography, Paper } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { FairMarkdownDocument } from '../../types';

interface PrerequisitesEditorProps {
  document: FairMarkdownDocument;
  onChange: (updatedDocument: Partial<FairMarkdownDocument>) => void;
}

const PrerequisitesEditor: React.FC<PrerequisitesEditorProps> = ({ document, onChange }) => {
  const [newPrerequisite, setNewPrerequisite] = useState('');

  const handleAddPrerequisite = () => {
    if (!newPrerequisite.trim()) return;
    
    const updatedPrerequisites = [...(document.prerequisites || []), newPrerequisite.trim()];
    onChange({ prerequisites: updatedPrerequisites });
    setNewPrerequisite('');
  };

  const handleRemovePrerequisite = (index: number) => {
    const updatedPrerequisites = [...document.prerequisites];
    updatedPrerequisites.splice(index, 1);
    onChange({ prerequisites: updatedPrerequisites });
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleAddPrerequisite();
    }
  };

  return (
    <Box>
        <Typography variant="h6" gutterBottom>Prerequisites</Typography>
        <Typography variant="body2" gutterBottom>
          Add topics or knowledge required before attending this lesson.
        </Typography>
        
        <Box sx={{ display: 'flex', mb: 2 }}>
          <TextField
            fullWidth
            label="New Prerequisite"
            value={newPrerequisite}
            onChange={(e) => setNewPrerequisite(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="e.g., Basic knowledge of research data management"
            size="small"
            sx={{ mr: 1 }}
          />
          <Button 
            variant="contained" 
            onClick={handleAddPrerequisite}
          >
            Add
          </Button>
        </Box>
        
        {document.prerequisites && document.prerequisites.length > 0 ? (
          <List sx={{ bgcolor: 'background.paper', border: '1px solid #e0e0e0', borderRadius: 1 }}>
            {document.prerequisites.map((prerequisite, index) => (
              <ListItem key={index} divider={index < document.prerequisites.length - 1}>
                <ListItemText 
                  primary={prerequisite}
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" aria-label="delete" onClick={() => handleRemovePrerequisite(index)}>
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
            No prerequisites added yet.
          </Typography>
        )}
    </Box>
  );
};

export default PrerequisitesEditor;
