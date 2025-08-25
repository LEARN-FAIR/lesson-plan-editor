import React, { useState } from 'react';
import { 
  Box, Typography, Paper, TextField, Button, IconButton, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogActions, DialogContent, DialogTitle, Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { FairMarkdownDocument, Resource } from '../../types';
import AddIcon from '@mui/icons-material/Add';

interface ResourcesEditorProps {
  document: FairMarkdownDocument;
  onChange: (updatedDocument: Partial<FairMarkdownDocument>) => void;
}

interface ResourceFormData {
  title: string;
  author?: string;
  url: string;
  doi?: string;
  additionalInformation?: string;
}

const ResourcesEditor: React.FC<ResourcesEditorProps> = ({ document, onChange }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<ResourceFormData>({
    title: '',
    author: '',
    url: '',
    doi: '',
    additionalInformation: ''
  });
  
  // Function to shorten URLs and DOIs for display
  const shortenText = (text: string, maxLength: number = 40): string => {
    if (!text || text.length <= maxLength) return text;
    
    // For URLs, try to show the domain and part of the path
    try {
      const url = new URL(text);
      const domain = url.hostname;
      const path = url.pathname;
      
      if (domain.length + 10 >= maxLength) {
        // If domain itself is too long
        return domain.substring(0, maxLength - 3) + '...';
      } else {
        // Show domain and part of the path
        const remainingChars = maxLength - domain.length - 5;
        const shortenedPath = path.length > remainingChars 
          ? path.substring(0, remainingChars) + '...' 
          : path;
        return `${domain}${shortenedPath}`;
      }
    } catch (e) {
      // Not a valid URL, just truncate
      return text.substring(0, maxLength - 3) + '...';
    }
  };

  const handleOpenDialog = (index?: number) => {
    if (index !== undefined) {
      // Editing existing resource
      setEditingIndex(index);
      const resource = document.additionalResources[index];
      setFormData({
        title: resource.title || '',
        author: resource.author || '',
        url: resource.url || '',
        doi: resource.doi || '',
        additionalInformation: resource.additionalInformation || ''
      });
    } else {
      // Adding new resource
      setEditingIndex(null);
      setFormData({
        title: '',
        author: '',
        url: '',
        doi: '',
        additionalInformation: ''
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleFormChange = (field: keyof ResourceFormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [field]: event.target.value
    });
  };

  const handleSaveResource = () => {
    // Validate required fields
    if (!formData.title || !formData.url) {
      return;
    }

    const newResource: Resource = {
      title: formData.title,
      url: formData.url,
      ...(formData.author && { author: formData.author }),
      ...(formData.doi && { doi: formData.doi }),
      ...(formData.additionalInformation && { additionalInformation: formData.additionalInformation })
    };

    let updatedResources = [...(document.additionalResources || [])];
    
    if (editingIndex !== null) {
      // Update existing
      updatedResources[editingIndex] = newResource;
    } else {
      // Add new
      updatedResources.push(newResource);
    }

    onChange({ additionalResources: updatedResources });
    handleCloseDialog();
  };

  const handleRemoveResource = (index: number) => {
    const updatedResources = [...document.additionalResources];
    updatedResources.splice(index, 1);
    onChange({ additionalResources: updatedResources });
  };

  return (
    <Box>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Additional resources
          </Typography>
          <Button 
            startIcon={<AddIcon />}
            variant="contained" 
            onClick={() => handleOpenDialog()}
          >
            Add resource
          </Button>
        </Box>

        {(!document.additionalResources || document.additionalResources.length === 0) ? (
          <Typography variant="body2" sx={{ fontStyle: 'italic', my: 2 }}>
            No resources have been added yet.
          </Typography>
        ) : (
          <TableContainer component={Paper} sx={{ width: '100%' }}>
            <Table sx={{ width: '100%' }} aria-label="resources table">
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Author</TableCell>
                <TableCell>URL/DOI</TableCell>
                <TableCell align="right" sx={{ minWidth: '100px' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {document.additionalResources?.map((resource, index) => (
                <TableRow key={index}>
                  <TableCell>{resource.title}</TableCell>
                  <TableCell>{resource.author || '-'}</TableCell>
                  <TableCell sx={{ maxWidth: '250px', overflow: 'hidden' }}>
                    <Tooltip title={resource.url} placement="top">
                      <Box component="span" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {shortenText(resource.url, 40)}
                      </Box>
                    </Tooltip>
                    {resource.doi && (
                      <Tooltip title={`DOI: ${resource.doi}`} placement="top">
                        <Box component="span" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          DOI: {shortenText(resource.doi, 30)}
                        </Box>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton 
                      size="small" 
                      color="primary"
                      onClick={() => handleOpenDialog(index)}
                      sx={{ mr: 1 }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={() => handleRemoveResource(index)}
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

      {/* Resource Form Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingIndex !== null ? 'Edit Resource' : 'Add New Resource'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="normal"
            label="Title"
            required
            value={formData.title}
            onChange={handleFormChange('title')}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Author (optional)"
            value={formData.author || ''}
            onChange={handleFormChange('author')}
          />
          <TextField
            fullWidth
            margin="normal"
            label="URL"
            required
            value={formData.url}
            onChange={handleFormChange('url')}
          />
          <TextField
            fullWidth
            margin="normal"
            label="DOI (optional)"
            value={formData.doi || ''}
            onChange={handleFormChange('doi')}
          />
          <TextField
            fullWidth
            margin="normal"
            multiline
            rows={2}
            label="Additional Information (optional)"
            value={formData.additionalInformation || ''}
            onChange={handleFormChange('additionalInformation')}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveResource} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ResourcesEditor;
