import React, { useState } from 'react';
import { Box, TextField, Button, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, Typography, Paper } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { FairMarkdownDocument } from '../../types';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import SortableListItem from '../common/SortableListItem';

interface PrerequisitesEditorProps {
  document: FairMarkdownDocument;
  onChange: (updatedDocument: Partial<FairMarkdownDocument>) => void;
}

const PrerequisitesEditor: React.FC<PrerequisitesEditorProps> = ({ document, onChange }) => {
  const [newPrerequisite, setNewPrerequisite] = useState('');
  
  // Set up sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum distance before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Handle drag end event
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = parseInt(active.id.toString(), 10);
      const newIndex = parseInt(over.id.toString(), 10);
      
      // Create a new array with the reordered items
      // This allows the animation to complete properly
      const updatedPrerequisites = arrayMove(
        [...(document.prerequisites || [])], 
        oldIndex, 
        newIndex
      );
      
      onChange({ prerequisites: updatedPrerequisites });
    }
  };

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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <List sx={{ bgcolor: 'background.paper', border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <SortableContext
                items={document.prerequisites.map((_, index) => index.toString())}
                strategy={verticalListSortingStrategy}
              >
                {document.prerequisites.map((prerequisite, index) => (
                  <SortableListItem key={index} id={index.toString()}>
                    <ListItemText 
                      primary={prerequisite}
                    />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" aria-label="delete" onClick={() => handleRemovePrerequisite(index)}>
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </SortableListItem>
                ))}
              </SortableContext>
            </List>
          </DndContext>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
            No prerequisites added yet.
          </Typography>
        )}
    </Box>
  );
};

export default PrerequisitesEditor;
