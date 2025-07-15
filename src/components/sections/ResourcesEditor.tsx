import React, { useState } from 'react';
import { 
  Box, Typography, Paper, TextField, Button, IconButton, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogActions, DialogContent, DialogTitle
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { FairMarkdownDocument, Resource } from '../../types';

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
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Additional Resources
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => handleOpenDialog()}
          >
            Add Resource
          </Button>
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Author</TableCell>
                <TableCell>URL/DOI</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {document.additionalResources?.map((resource, index) => (
                <TableRow key={index}>
                  <TableCell>{resource.title}</TableCell>
                  <TableCell>{resource.author || '-'}</TableCell>
                  <TableCell>
                    {resource.url}
                    {resource.doi && <Box>DOI: {resource.doi}</Box>}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton 
                      size="small" 
                      onClick={() => handleOpenDialog(index)}
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
              {(!document.additionalResources || document.additionalResources.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography variant="body2" sx={{ fontStyle: 'italic', py: 1 }}>
                      No resources have been added yet.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

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
