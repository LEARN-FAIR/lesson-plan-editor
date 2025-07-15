import React, { useState } from 'react';
import { 
  Box, Typography, Paper, TextField, Select, MenuItem, 
  FormControl, InputLabel, Button, IconButton, Tabs, Tab,
  List, ListItem, ListItemText, ListItemSecondaryAction
} from '@mui/material';
import { Grid } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { FairMarkdownDocument, Activity } from '../../types';
import MdxEditorComponent from '../common/MdxEditorComponent';

interface ActivitiesEditorProps {
  document: FairMarkdownDocument;
  onChange: (updatedDocument: Partial<FairMarkdownDocument>) => void;
}

interface ActivityFormData {
  learning_outcome: string;
  activities: string;
  time: string;
  type: string;
  level: 'beginner' | 'intermediate' | 'expert';
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`activities-tabpanel-${index}`}
      aria-labelledby={`activities-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const ActivitiesEditor: React.FC<ActivitiesEditorProps> = ({ document, onChange }) => {
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState<ActivityFormData>({
    learning_outcome: '',
    activities: '',
    time: '',
    type: '',
    level: 'beginner'
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getActivitiesSection = () => {
    switch(tabValue) {
      case 0: return 'before';
      case 1: return 'during';
      case 2: return 'after';
      default: return 'before';
    }
  };

  const handleFormChange = (field: keyof ActivityFormData) => (event: React.ChangeEvent<HTMLInputElement | { value: unknown }>) => {
    setFormData({
      ...formData,
      [field]: event.target.value
    });
  };

  const handleActivitiesChange = (value: string) => {
    setFormData({
      ...formData,
      activities: value
    });
  };

  const handleAddActivity = () => {
    const section = getActivitiesSection();
    
    // Validate required fields
    if (!formData.learning_outcome || !formData.activities || !formData.time || !formData.type) {
      return;
    }
    
    const newActivity: Activity = {
      learning_outcome: parseInt(formData.learning_outcome),
      activities: formData.activities,
      time: formData.time,
      type: formData.type,
      level: formData.level
    };
    
    const updatedActivities = {
      ...document.activities,
      [section]: [...(document.activities[section] || []), newActivity]
    };
    
    onChange({ activities: updatedActivities });
    
    // Reset form
    setFormData({
      learning_outcome: '',
      activities: '',
      time: '',
      type: '',
      level: 'beginner'
    });
  };

  const handleRemoveActivity = (section: 'before' | 'during' | 'after', index: number) => {
    const updatedSectionActivities = [...document.activities[section]];
    updatedSectionActivities.splice(index, 1);
    
    const updatedActivities = {
      ...document.activities,
      [section]: updatedSectionActivities
    };
    
    onChange({ activities: updatedActivities });
  };

  const renderActivityForm = () => {
    return (
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Add New Activity
        </Typography>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2 }}>
          <Box>
            <FormControl fullWidth size="small">
              <InputLabel>Learning Outcome</InputLabel>
              <Select
                value={formData.learning_outcome}
                label="Learning Outcome"
                onChange={handleFormChange('learning_outcome') as any}
              >
                {Object.entries(document.learning_outcomes || {})
                  // Sort by numeric ID to ensure consistent display order
                  .sort(([keyA], [keyB]) => {
                    const numA = parseInt(keyA, 10);
                    const numB = parseInt(keyB, 10);
                    return numA - numB;
                  })
                  .map(([key, outcome]) => (
                    <MenuItem key={key} value={key}>
                      {key}: {outcome.outcome.substring(0, 50)}{outcome.outcome.length > 50 ? '...' : ''}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Box>
          
          <Box>
            <TextField
              fullWidth
              label="Time"
              placeholder="e.g., 30 min"
              value={formData.time}
              onChange={handleFormChange('time')}
              size="small"
            />
          </Box>
          
          <Box>
            <TextField
              fullWidth
              label="Type"
              placeholder="e.g., lecture, workshop"
              value={formData.type}
              onChange={handleFormChange('type')}
              size="small"
            />
          </Box>
          
          <Box>
            <FormControl fullWidth size="small">
              <InputLabel>Level</InputLabel>
              <Select
                value={formData.level}
                label="Level"
                onChange={handleFormChange('level') as any}
              >
                <MenuItem value="beginner">Beginner</MenuItem>
                <MenuItem value="intermediate">Intermediate</MenuItem>
                <MenuItem value="expert">Expert</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <Box sx={{ gridColumn: '1/-1' }}>
            <Typography variant="subtitle2" gutterBottom>
              Activities Description
            </Typography>
            <Box sx={{ border: '1px solid #ccc', borderRadius: '4px' }}>
              <MdxEditorComponent
                markdown={formData.activities || ''}
                onChange={handleActivitiesChange}
                minHeight="150px"
                maxHeight="300px"
                placeholder="Describe the activities here..."
                showToolbar={true}
                showDiffToggle={false}
              />
            </Box>
          </Box>
          
          <Box sx={{ gridColumn: '1/-1' }}>
            <Button 
              variant="contained" 
              onClick={handleAddActivity}
            >
              Add Activity
            </Button>
          </Box>
        </Box>
      </Paper>
    );
  };

  const renderActivitiesList = (section: 'before' | 'during' | 'after') => {
    const activities = document.activities?.[section] || [];
    
    if (activities.length === 0) {
      return (
        <Typography variant="body2" sx={{ fontStyle: 'italic', my: 2 }}>
          No activities defined for this section.
        </Typography>
      );
    }
    
    return activities.map((activity, index) => (
      <Paper key={index} elevation={1} sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle2">
            Learning Outcome: {activity.learning_outcome}
          </Typography>
          <Box>
            <Typography variant="caption" sx={{ mr: 2 }}>
              {activity.time} | {activity.type} | {activity.level}
            </Typography>
            <IconButton 
              size="small" 
              color="error"
              onClick={() => handleRemoveActivity(section, index)}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
        
        <Box sx={{ mt: 1, border: '1px solid #eee', borderRadius: '4px', p: 1 }}>
          <MdxEditorComponent
            markdown={typeof activity.activities === 'string' 
              ? activity.activities 
              : activity.activities.join("\n")}
            onChange={() => {}} // Read-only in the list view
            minHeight="100px"
            maxHeight="200px"
            readOnly={true}
            showToolbar={false}
            showDiffToggle={false}
          />
        </Box>
      </Paper>
    ));
  };

  return (
    <Box>
      <Paper sx={{ width: '100%', mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="activities tabs"
          variant="fullWidth"
        >
          <Tab label="Before" />
          <Tab label="During" />
          <Tab label="After" />
        </Tabs>
        
        <TabPanel value={tabValue} index={0}>
          {renderActivityForm()}
          <Typography variant="h6">Before Activities</Typography>
          {renderActivitiesList('before')}
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          {renderActivityForm()}
          <Typography variant="h6">During Activities</Typography>
          {renderActivitiesList('during')}
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          {renderActivityForm()}
          <Typography variant="h6">After Activities</Typography>
          {renderActivitiesList('after')}
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default ActivitiesEditor;
