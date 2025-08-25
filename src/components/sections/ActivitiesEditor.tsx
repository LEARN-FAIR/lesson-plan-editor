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
import ReactMarkdown from 'react-markdown';
import RestoreIcon from '@mui/icons-material/Restore';
import UpdateIcon from '@mui/icons-material/Update';

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
}

function ActivitySection(props: ActivitySectionProps) {
  const { title, icon, section, activities, onAddActivity, onEditActivity, onRemoveActivity } = props;
  
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
                  <TableCell sx={{ p: 1 }}>
                    <Box sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      <ReactMarkdown>
                        {typeof activity.activities === 'string' 
                          ? activity.activities 
                          : activity.activities.join("\n")}
                      </ReactMarkdown>
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
          icon={<RestoreIcon color="primary" />}
          section="before"
          activities={document.activities?.before || []}
          onAddActivity={handleOpenAddModal}
          onEditActivity={handleOpenEditModal}
          onRemoveActivity={handleRemoveActivity}
        />
        
        <ActivitySection 
          title="During the lesson"
          icon={<UpdateIcon  color="primary" />}
          section="during"
          activities={document.activities?.during || []}
          onAddActivity={handleOpenAddModal}
          onEditActivity={handleOpenEditModal}
          onRemoveActivity={handleRemoveActivity}
        />
        
        <ActivitySection 
          title="After the lesson"
        icon={<UpdateIcon color="primary"/>}
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
