import React, { useState, useEffect } from 'react';
import { 
  Box, TextField, Button, List, ListItem, IconButton, Typography, Paper,
  Autocomplete, CircularProgress
} from '@mui/material';
import { FairMarkdownDocument } from '../../types';
import DeleteIcon from '@mui/icons-material/Delete';
import { fetchContributors, Contributor, getContributorDisplayName } from '../../services/contributorService';

interface AuthorsEditorProps {
  document: FairMarkdownDocument;
  onChange: (updatedDocument: Partial<FairMarkdownDocument>) => void;
}

const AuthorsEditor: React.FC<AuthorsEditorProps> = ({ document, onChange }) => {
  const [newAuthor, setNewAuthor] = useState('');
  const [newReviewer, setNewReviewer] = useState('');
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAuthor, setSelectedAuthor] = useState<Contributor | null>(null);
  const [selectedReviewer, setSelectedReviewer] = useState<Contributor | null>(null);
  
  useEffect(() => {
    const loadContributors = async () => {
      setLoading(true);
      try {
        const data = await fetchContributors();
        setContributors(data);
      } catch (error) {
        console.error('Failed to load contributors:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadContributors();
  }, []);

  const handleAddAuthor = () => {
    if (selectedAuthor) {
      // If an author was selected from the dropdown
      const authorId = selectedAuthor.id;
      if (!document.authors?.includes(authorId)) {
        const updatedAuthors = [...(document.authors || []), authorId];
        onChange({ authors: updatedAuthors });
      }
      setSelectedAuthor(null);
    } else if (newAuthor.trim()) {
      // If manual text was entered
      const updatedAuthors = [...(document.authors || []), newAuthor.trim()];
      onChange({ authors: updatedAuthors });
      setNewAuthor('');
    }
  };

  const handleRemoveAuthor = (index: number) => {
    const updatedAuthors = [...document.authors];
    updatedAuthors.splice(index, 1);
    onChange({ authors: updatedAuthors });
  };

  const handleAddReviewer = () => {
    if (selectedReviewer) {
      // If a reviewer was selected from the dropdown
      const reviewerId = selectedReviewer.id;
      if (!document.reviewers?.includes(reviewerId)) {
        const updatedReviewers = [...(document.reviewers || []), reviewerId];
        onChange({ reviewers: updatedReviewers });
      }
      setSelectedReviewer(null);
    } else if (newReviewer.trim()) {
      // If manual text was entered
      const updatedReviewers = [...(document.reviewers || []), newReviewer.trim()];
      onChange({ reviewers: updatedReviewers });
      setNewReviewer('');
    }
  };

  const handleRemoveReviewer = (index: number) => {
    const updatedReviewers = [...document.reviewers];
    updatedReviewers.splice(index, 1);
    onChange({ reviewers: updatedReviewers });
  };

  return (
    <Box>
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Authors</Typography>
        <Typography variant="body2" gutterBottom>
          Enter author ORCID IDs (e.g., "0000-0001-6675-4639") or names.
        </Typography>
        
        <Box sx={{ display: 'flex', mb: 2 }}>
          <Autocomplete
            fullWidth
            freeSolo
            options={contributors}
            getOptionLabel={(option) => {
              if (typeof option === 'string') return option;
              return getContributorDisplayName(option);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="New Author"
                placeholder="Search by name or ORCID"
                size="small"
                value={newAuthor}
                onChange={(e) => setNewAuthor(e.target.value)}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <React.Fragment>
                      {loading ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </React.Fragment>
                  ),
                }}
              />
            )}
            value={selectedAuthor}
            onChange={(_, newValue) => {
              if (typeof newValue === 'string') {
                setNewAuthor(newValue);
                setSelectedAuthor(null);
              } else {
                setSelectedAuthor(newValue);
                setNewAuthor('');
              }
            }}
            sx={{ mr: 1 }}
          />
          <Button 
            variant="contained" 
            onClick={handleAddAuthor}
          >
            Add
          </Button>
        </Box>
        
        <List dense>
          {document.authors?.map((authorId, index) => {
            // Try to find the contributor by ID
            const contributor = contributors.find(c => c.id === authorId);
            const displayName = contributor 
              ? getContributorDisplayName(contributor)
              : authorId;
              
            return (
              <ListItem 
                key={index}
                secondaryAction={
                  <IconButton edge="end" onClick={() => handleRemoveAuthor(index)}>
                    <DeleteIcon />
                  </IconButton>
                }
                sx={{ bgcolor: 'background.paper', mb: 0.5, borderRadius: 1 }}
              >
                {displayName}
              </ListItem>
            );
          })}
        </List>
      </Paper>

      <Paper elevation={2} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Reviewers</Typography>
        <Typography variant="body2" gutterBottom>
          Enter reviewer ORCID IDs (e.g., "0000-0002-7702-4495") or names.
        </Typography>
        
        <Box sx={{ display: 'flex', mb: 2 }}>
          <Autocomplete
            fullWidth
            freeSolo
            options={contributors}
            getOptionLabel={(option) => {
              if (typeof option === 'string') return option;
              return getContributorDisplayName(option);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="New Reviewer"
                placeholder="Search by name or ORCID"
                size="small"
                value={newReviewer}
                onChange={(e) => setNewReviewer(e.target.value)}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <React.Fragment>
                      {loading ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </React.Fragment>
                  ),
                }}
              />
            )}
            value={selectedReviewer}
            onChange={(_, newValue) => {
              if (typeof newValue === 'string') {
                setNewReviewer(newValue);
                setSelectedReviewer(null);
              } else {
                setSelectedReviewer(newValue);
                setNewReviewer('');
              }
            }}
            sx={{ mr: 1 }}
          />
          <Button 
            variant="contained" 
            onClick={handleAddReviewer}
          >
            Add
          </Button>
        </Box>
        
        <List dense>
          {document.reviewers?.map((reviewerId, index) => {
            // Try to find the contributor by ID
            const contributor = contributors.find(c => c.id === reviewerId);
            const displayName = contributor 
              ? getContributorDisplayName(contributor)
              : reviewerId;
              
            return (
              <ListItem 
                key={index}
                secondaryAction={
                  <IconButton edge="end" onClick={() => handleRemoveReviewer(index)}>
                    <DeleteIcon />
                  </IconButton>
                }
                sx={{ bgcolor: 'background.paper', mb: 0.5, borderRadius: 1 }}
              >
                {displayName}
              </ListItem>
            );
          })}
        </List>
      </Paper>
    </Box>
  );
};

export default AuthorsEditor;
