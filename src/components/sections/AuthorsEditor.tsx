import React, { useState, useEffect } from 'react';
import { 
  Box, TextField, Button, IconButton, Typography, Paper,
  Autocomplete, CircularProgress, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip
} from '@mui/material';
import { FairMarkdownDocument } from '../../types';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { fetchContributors, Contributor, getContributorDisplayName } from '../../services/contributorService';
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
import SortableTableRow from '../common/SortableTableRow';
import DragHandle from '../common/DragHandle';

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
  
  // Handle drag end event for authors
  const handleAuthorsDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = parseInt(active.id.toString(), 10);
      const newIndex = parseInt(over.id.toString(), 10);
      
      const updatedAuthors = arrayMove(
        document.authors || [], 
        oldIndex, 
        newIndex
      );
      
      onChange({ authors: updatedAuthors });
    }
  };
  
  // Handle drag end event for reviewers
  const handleReviewersDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = parseInt(active.id.toString(), 10);
      const newIndex = parseInt(over.id.toString(), 10);
      
      const updatedReviewers = arrayMove(
        document.reviewers || [], 
        oldIndex, 
        newIndex
      );
      
      onChange({ reviewers: updatedReviewers });
    }
  };
  
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
      <Box sx={{ mb: 3 }}>
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
        
        {document.authors && document.authors.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleAuthorsDragEnd}
          >
            <TableContainer component={Paper} sx={{ width: '100%', mb: 2 }}>
              <Table sx={{ width: '100%' }} aria-label="authors table" size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="none" width="40px"></TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>ORCID</TableCell>
                    <TableCell align="right" sx={{ minWidth: '100px' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <SortableContext
                    items={document.authors.map((_, index) => index.toString())}
                    strategy={verticalListSortingStrategy}
                  >
                    {document.authors.map((authorId, index) => {
                      // Try to find the contributor by ID
                      const contributor = contributors.find(c => c.id === authorId);
                      
                      // Extract name and ORCID
                      let name = authorId;
                      let orcid = '';
                      
                      if (contributor) {
                        name = `${contributor.firstName} ${contributor.lastName}`;
                        orcid = contributor.id || '';
                      } else if (authorId.startsWith('0000-')) {
                        // If it's an ORCID format but not found in contributors
                        orcid = authorId;
                      }
                      
                      return (
                        <SortableTableRow key={index} id={index.toString()}>
                          <DragHandle />
                          <TableCell>{name}</TableCell>
                          <TableCell>
                            {orcid && (
                              <Tooltip title={`ORCID: ${orcid}`} placement="top">
                                <Box component="span">{orcid}</Box>
                              </Tooltip>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleRemoveAuthor(index)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </SortableTableRow>
                      );
                    })}
                  </SortableContext>
                </TableBody>
              </Table>
            </TableContainer>
          </DndContext>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2, fontStyle: 'italic' }}>
            No authors added yet.
          </Typography>
        )}
      </Box>

      <Divider sx={{ mb: 3 }} />

      <Box>
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
        
        {document.reviewers && document.reviewers.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleReviewersDragEnd}
          >
            <TableContainer component={Paper} sx={{ width: '100%', mb: 2 }}>
              <Table sx={{ width: '100%' }} aria-label="reviewers table" size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="none" width="40px"></TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>ORCID</TableCell>
                    <TableCell align="right" sx={{ minWidth: '100px' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <SortableContext
                    items={document.reviewers.map((_, index) => index.toString())}
                    strategy={verticalListSortingStrategy}
                  >
                    {document.reviewers.map((reviewerId, index) => {
                      // Try to find the contributor by ID
                      const contributor = contributors.find(c => c.id === reviewerId);
                      
                      // Extract name and ORCID
                      let name = reviewerId;
                      let orcid = '';
                      
                      if (contributor) {
                        name = `${contributor.firstName} ${contributor.lastName}`;
                        orcid = contributor.id || '';
                      } else if (reviewerId.startsWith('0000-')) {
                        // If it's an ORCID format but not found in contributors
                        orcid = reviewerId;
                      }
                      
                      return (
                        <SortableTableRow key={index} id={index.toString()}>
                          <DragHandle />
                          <TableCell>{name}</TableCell>
                          <TableCell>
                            {orcid && (
                              <Tooltip title={`ORCID: ${orcid}`} placement="top">
                                <Box component="span">{orcid}</Box>
                              </Tooltip>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleRemoveReviewer(index)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </SortableTableRow>
                      );
                    })}
                  </SortableContext>
                </TableBody>
              </Table>
            </TableContainer>
          </DndContext>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2, fontStyle: 'italic' }}>
            No reviewers added yet.
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default AuthorsEditor;
