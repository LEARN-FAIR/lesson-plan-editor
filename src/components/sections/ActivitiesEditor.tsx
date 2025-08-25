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
import { FairMarkdownDocument, Activity } from '../../types';
import MdxEditorComponent from '../common/MdxEditorComponent';
import ActivityEditorModal from '../common/ActivityEditorModal';

interface ActivitiesEditorProps {
  document: FairMarkdownDocument;
  onChange: (updatedDocument: Partial<FairMarkdownDocument>) => void;
}

interface ActivitySectionProps {
  title: string;
  section: 'before' | 'during' | 'after';
  activities: Activity[];
  onAddActivity: (section: 'before' | 'during' | 'after') => void;
  onEditActivity: (activity: Activity, index: number, section: 'before' | 'during' | 'after') => void;
  onRemoveActivity: (section: 'before' | 'during' | 'after', index: number) => void;
}

function ActivitySection(props: ActivitySectionProps) {
  const { title, section, activities, onAddActivity, onEditActivity, onRemoveActivity } = props;
  
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h5" gutterBottom>{title}</Typography>
      
      {activities.length === 0 ? (
        <Typography variant="body2" sx={{ fontStyle: 'italic', my: 2 }}>
          No activities defined for this section.
        </Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="activities table">
            <TableHead>
              <TableRow>
                <TableCell>LO</TableCell>
                <TableCell>Activity</TableCell>
                <TableCell>Time</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Level</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {activities.map((activity, index) => (
                <TableRow key={index}>
                  <TableCell>{activity.learning_outcome}</TableCell>
                  <TableCell>
                    <Box sx={{ maxWidth: 400, maxHeight: 100, overflow: 'auto' }}>
                      <MdxEditorComponent
                        markdown={typeof activity.activities === 'string' 
                          ? activity.activities 
                          : activity.activities.join("\n")}
                        onChange={() => {}} // Read-only in the list view
                        minHeight="60px"
                        maxHeight="100px"
                        readOnly={true}
                        showToolbar={false}
                        showDiffToggle={false}
                      />
                    </Box>
                  </TableCell>
                  <TableCell>{activity.time}</TableCell>
                  <TableCell>{activity.type}</TableCell>
                  <TableCell>{activity.level}</TableCell>
                  <TableCell align="right">
                    <IconButton 
                      size="small" 
                      color="primary"
                      onClick={() => onEditActivity(activity, index, section)}
                      sx={{ mr: 1 }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={() => onRemoveActivity(section, index)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      
      <Box sx={{ mt: 2 }}>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => onAddActivity(section)}
        >
          Add New Activity
        </Button>
      </Box>
      
    </Box>
  );
}

const ActivitiesEditor: React.FC<ActivitiesEditorProps> = ({ document, onChange }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState<'add' | 'edit'>('add');
  const [currentActivity, setCurrentActivity] = useState<Activity | undefined>(undefined);
  const [currentActivityIndex, setCurrentActivityIndex] = useState<number>(-1);
  const [currentSection, setCurrentSection] = useState<'before' | 'during' | 'after'>('before');

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
          section="before"
          activities={document.activities?.before || []}
          onAddActivity={handleOpenAddModal}
          onEditActivity={handleOpenEditModal}
          onRemoveActivity={handleRemoveActivity}
        />
        
        <Divider sx={{ my: 4 }} />
        
        <ActivitySection 
          title="During the lesson"
          section="during"
          activities={document.activities?.during || []}
          onAddActivity={handleOpenAddModal}
          onEditActivity={handleOpenEditModal}
          onRemoveActivity={handleRemoveActivity}
        />
        
        <Divider sx={{ my: 4 }} />
        
        <ActivitySection 
          title="After the lesson"
          section="after"
          activities={document.activities?.after || []}
          onAddActivity={handleOpenAddModal}
          onEditActivity={handleOpenEditModal}
          onRemoveActivity={handleRemoveActivity}
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
