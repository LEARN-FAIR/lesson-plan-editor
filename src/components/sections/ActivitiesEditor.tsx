import React, { useState } from 'react';
import { 
  Box, Typography, Paper, Button, IconButton, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  FormControl, InputLabel, Select, MenuItem, TextField
} from '@mui/material';
import { Grid } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { FairMarkdownDocument, Activity } from '../../types';
import MdxEditorComponent from '../common/MdxEditorComponent';
import ActivityEditorModal from '../common/ActivityEditorModal';
import ReactMarkdown from 'react-markdown';
import RestoreIcon from '@mui/icons-material/Restore';
import UpdateIcon from '@mui/icons-material/Update';
import SortableActivityRow from './SortableActivityRow';
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
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ActivitiesEditorProps {
  document: FairMarkdownDocument;
  onChange: (updatedDocument: Partial<FairMarkdownDocument>) => void;
}

interface ActivitySectionProps {
  title: string;
  icon: React.ReactNode;
  section: 'before' | 'during' | 'after';
  activities: Activity[];
  onAddActivity: (section: 'before' | 'during' | 'after') => void;
  onEditActivity: (activity: Activity, index: number, section: 'before' | 'during' | 'after') => void;
  onRemoveActivity: (section: 'before' | 'during' | 'after', index: number) => void;
  onReorderActivities: (section: 'before' | 'during' | 'after', activities: Activity[]) => void;
}

function ActivitySection(props: ActivitySectionProps) {
  const { title, icon, section, activities, onAddActivity, onEditActivity, onRemoveActivity, onReorderActivities } = props;
  
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
      const oldIndex = parseInt(active.id.toString().split('-')[1]);
      const newIndex = parseInt(over.id.toString().split('-')[1]);
      
      // Create a new array with the reordered items
      // This allows the animation to complete properly
      const reorderedActivities = arrayMove([...activities], oldIndex, newIndex);
      onReorderActivities(section, reorderedActivities);
    }
  };
  
  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          backgroundColor: '#e9ecef',
          px: 1,
          py: 0.5,
          borderRadius: 2
          }}>
          { icon }
          <Typography sx={{ ml: 0.5 }} variant="h6">{title}</Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => onAddActivity(section)}
        >
          Add activity
        </Button>
      </Box>

      {activities.length === 0 ? (
        <Typography variant="body2" sx={{ fontStyle: 'italic', my: 2 }}>
          No activities defined for this section.
        </Typography>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <TableContainer component={Box}>
            <Table sx={{ minWidth: 650 }} aria-label="activities table">
              <TableHead>
                <TableRow>
                  <TableCell padding="none" width="40px"></TableCell>
                  <TableCell>LO</TableCell>
                  <TableCell>Activity</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Level</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <SortableContext
                  items={activities.map((_, index) => `${section}-${index}`)}
                  strategy={verticalListSortingStrategy}
                >
                  {activities.map((activity, index) => (
                    <SortableActivityRow
                      key={`${section}-${index}`}
                      id={`${section}-${index}`}
                      activity={activity}
                      index={index}
                      onEdit={(activity, index) => onEditActivity(activity, index, section)}
                      onRemove={(index) => onRemoveActivity(section, index)}
                    />
                  ))}
                </SortableContext>
              </TableBody>
            </Table>
          </TableContainer>
        </DndContext>
      )}
    </Box>
  );
}

const ActivitiesEditor: React.FC<ActivitiesEditorProps> = ({ document, onChange }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState<'add' | 'edit'>('add');
  const [currentActivity, setCurrentActivity] = useState<Activity | undefined>(undefined);
  const [currentActivityIndex, setCurrentActivityIndex] = useState<number>(-1);
  const [currentSection, setCurrentSection] = useState<'before' | 'during' | 'after'>('before');
  
  // Handle reordering of activities
  const handleReorderActivities = (section: 'before' | 'during' | 'after', reorderedActivities: Activity[]) => {
    const updatedActivities = { ...document.activities };
    updatedActivities[section] = reorderedActivities;
    onChange({ activities: updatedActivities });
  };

  const handleOpenAddModal = (section: 'before' | 'during' | 'after') => {
    setEditMode('add');
    setCurrentActivity(undefined);
    setCurrentActivityIndex(-1);
    setCurrentSection(section);
    setModalOpen(true);
  };

  const handleOpenEditModal = (activity: Activity, index: number, section: 'before' | 'during' | 'after') => {
    setEditMode('edit');
    setCurrentActivity(activity);
    setCurrentActivityIndex(index);
    setCurrentSection(section);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const handleSaveActivity = (activityData: Activity) => {
    if (editMode === 'add') {
      // Add new activity
      const updatedActivities = {
        ...document.activities,
        [currentSection]: [...(document.activities?.[currentSection] || []), activityData]
      };
      
      onChange({ activities: updatedActivities });
    } else {
      // Edit existing activity
      const updatedSectionActivities = [...(document.activities?.[currentSection] || [])];
      updatedSectionActivities[currentActivityIndex] = activityData;
      
      const updatedActivities = {
        ...document.activities,
        [currentSection]: updatedSectionActivities
      };
      
      onChange({ activities: updatedActivities });
    }
    
    setModalOpen(false);
  };

  const handleRemoveActivity = (section: 'before' | 'during' | 'after', index: number) => {
    const updatedSectionActivities = [...(document.activities?.[section] || [])];
    updatedSectionActivities.splice(index, 1);
    
    const updatedActivities = {
      ...document.activities,
      [section]: updatedSectionActivities
    };
    
    onChange({ activities: updatedActivities });
  };

  return (
    <Box>
      <ActivitySection 
        title="Before the lesson"
        icon={<RestoreIcon color="primary" />}
        section="before"
        activities={document.activities?.before || []}
        onAddActivity={handleOpenAddModal}
        onEditActivity={handleOpenEditModal}
        onRemoveActivity={handleRemoveActivity}
        onReorderActivities={handleReorderActivities}
      />
      
      <ActivitySection 
        title="During the lesson"
        icon={<UpdateIcon  color="primary" />}
        section="during"
        activities={document.activities?.during || []}
        onAddActivity={handleOpenAddModal}
        onEditActivity={handleOpenEditModal}
        onRemoveActivity={handleRemoveActivity}
        onReorderActivities={handleReorderActivities}
      />
      
      <ActivitySection 
        title="After the lesson"
        icon={<UpdateIcon color="primary"/>}
        section="after"
        activities={document.activities?.after || []}
        onAddActivity={handleOpenAddModal}
        onEditActivity={handleOpenEditModal}
        onRemoveActivity={handleRemoveActivity}
        onReorderActivities={handleReorderActivities}
      />
      
      <ActivityEditorModal
        open={modalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveActivity}
        activity={currentActivity}
        learningOutcomes={document.learning_outcomes || {}}
        mode={editMode}
      />
    </Box>
  );
};

export default ActivitiesEditor;
