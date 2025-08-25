import React, { useState, useEffect } from 'react';
import { Box, Container, Paper, Tab, Tabs, Typography, Button, Stack } from '@mui/material';
import { styled } from '@mui/material/styles';
import { FairMarkdownDocument } from '../types';
import { parseMarkdown, serializeMarkdown } from '../utils/markdownUtils';
import GeneralInfoEditor from './sections/GeneralInfoEditor';
import AuthorsEditor from './sections/AuthorsEditor';
import LearningOutcomesEditor from './sections/LearningOutcomesEditor';
import ActivitiesEditor from './sections/ActivitiesEditor';
import PrerequisitesEditor from './sections/PrerequisitesEditor';
import TermsEditor from './sections/TermsEditor';
import ResourcesEditor from './sections/ResourcesEditor';
import ContentEditor from './sections/ContentEditor';
import InfoOutlineIcon from '@mui/icons-material/InfoOutline';
import AttributionIcon from '@mui/icons-material/Attribution';
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined';
import ChecklistIcon from '@mui/icons-material/Checklist';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import AttachmentIcon from '@mui/icons-material/Attachment';
import SubjectIcon from '@mui/icons-material/Subject';

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
      id={`editor-tabpanel-${index}`}
      aria-labelledby={`editor-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `editor-tab-${index}`,
    'aria-controls': `editor-tabpanel-${index}`,
  };
}

interface EditorProps {
  initialMarkdown: string;
  onSave: (markdown: string) => void;
}

interface StyledTabProps {
  label: string;
  icon?: React.ReactElement;
  iconPosition?: 'start' | 'end' | 'top' | 'bottom';
}

const StyledTab = styled((props: StyledTabProps) => <Tab disableRipple {...props} />)(
  ({ theme }) => ({
    minHeight: '48px',
    textTransform: 'none',
  }),
);


const Editor: React.FC<EditorProps> = ({ initialMarkdown, onSave }) => {
  const [document, setDocument] = useState<FairMarkdownDocument | null>(null);
  const [tabValue, setTabValue] = useState(0);

  // Parse markdown on initial load
  useEffect(() => {
    try {
      const parsedDocument = parseMarkdown(initialMarkdown);
      setDocument(parsedDocument);
    } catch (error) {
      console.error('Error parsing markdown:', error);
      // Handle error state
    }
  }, [initialMarkdown]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleDocumentChange = (updatedDocument: Partial<FairMarkdownDocument>) => {
    if (document) {
      const newDocument = { ...document, ...updatedDocument };
      setDocument(newDocument);
      
      // Serialize and save
      try {
        const markdown = serializeMarkdown(newDocument);
        onSave(markdown);
      } catch (error) {
        console.error('Error serializing markdown:', error);
        // Handle error state
      }
    }
  };

  if (!document) {
    return <Typography>Loading editor...</Typography>;
  }

  return (
      <Paper elevation={3} sx={{ mb: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="editor tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <StyledTab label="General info" icon={<InfoOutlineIcon />} iconPosition="start"  {...a11yProps(0)} />
            <StyledTab label="Authors" icon={<AttributionIcon />} iconPosition="start" {...a11yProps(1)} />
            <StyledTab label="Learning outcomes" icon={<TrackChangesIcon />} iconPosition="start" {...a11yProps(2)} />
            <StyledTab label="Activities" icon={<EventNoteOutlinedIcon />} iconPosition="start" {...a11yProps(3)} />
            <StyledTab label="Prerequisites" icon={<ChecklistIcon />} iconPosition="start" {...a11yProps(4)} />
            {/* <StyledTab label="Terms" {...a11yProps(5)} /> */}
            <StyledTab label="Resources" icon={<AttachmentIcon />} iconPosition="start" {...a11yProps(5)} />
            <StyledTab label="Content" icon={<SubjectIcon />} iconPosition="start" {...a11yProps(6)} />

          </Tabs>
        </Box>
        
        <TabPanel value={tabValue} index={0}>
          <GeneralInfoEditor 
            document={document} 
            onChange={handleDocumentChange} 
          />
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <AuthorsEditor 
            document={document} 
            onChange={handleDocumentChange} 
          />
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          <LearningOutcomesEditor 
            document={document} 
            onChange={handleDocumentChange} 
          />
        </TabPanel>
        
        <TabPanel value={tabValue} index={3}>
          <ActivitiesEditor 
            document={document} 
            onChange={handleDocumentChange} 
          />
        </TabPanel>
        
        <TabPanel value={tabValue} index={4}>
          <PrerequisitesEditor 
            document={document} 
            onChange={handleDocumentChange} 
          />
        </TabPanel>
        
        {/* <TabPanel value={tabValue} index={5}>
          <TermsEditor 
            document={document} 
            onChange={handleDocumentChange} 
          />
        </TabPanel> */}
        
        <TabPanel value={tabValue} index={5}>
          <ResourcesEditor 
            document={document} 
            onChange={handleDocumentChange} 
          />
        </TabPanel>
        
        <TabPanel value={tabValue} index={6}>
          <ContentEditor 
            document={document} 
            onChange={handleDocumentChange} 
          />
        </TabPanel>
        

      </Paper>
  );
};

export default Editor;
