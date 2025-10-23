import React, {useEffect, useState} from 'react';
import {
    Autocomplete,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    TextField
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type {Contributor} from '../../services/contributorService';
import type {AuthorData} from '../../types/authorTypes';

interface AuthorEditorModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (author: AuthorData) => void;
    contributors: Contributor[];
}

const AuthorEditorModal: React.FC<AuthorEditorModalProps> = ({
                                                                 open,
                                                                 onClose,
                                                                 onSave,
                                                                 contributors
                                                             }) => {
    const [author, setAuthor] = useState<AuthorData>({
        name: '',
        orcid: ''
    });

    const [selectedContributor, setSelectedContributor] = useState<Contributor | null>(null);

    useEffect(() => {
        if (!open) {
            // Reset form when modal closes
            setAuthor({
                name: '',
                orcid: ''
            });
            setSelectedContributor(null);
        }
    }, [open]);

    const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setAuthor({
            ...author,
            [field]: event.target.value
        });
    };

    const handleContributorSelect = (contributor: Contributor | null) => {
        setSelectedContributor(contributor);
        if (contributor) {
            setAuthor({
                ...author,
                name: `${contributor.firstName} ${contributor.lastName}`,
                orcid: contributor.orcid || ''
            });
        }
    };

    const handleSave = () => {
        if (selectedContributor) {
            onSave({
                ...author,
                name: author.name.trim(),
                orcid: author.orcid.trim()
            });
            onClose();
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                Add Author
                <IconButton
                    onClick={onClose}
                    aria-label="close"
                    sx={{
                        position: 'absolute',
                        right: 8,
                        top: 8,
                    }}
                >
                    <CloseIcon/>
                </IconButton>
            </DialogTitle>
            <DialogContent>
                <Box sx={{mb: 2}}>
                    <Autocomplete
                        options={contributors}
                        getOptionLabel={(option) => `${option.firstName} ${option.lastName}` || ''}
                        value={selectedContributor}
                        onChange={(_, value) => handleContributorSelect(value)}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Search for contributor"
                                variant="outlined"
                                fullWidth
                                autoFocus
                            />
                        )}
                    />
                </Box>

                <Box sx={{mb: 2}}>
                    <TextField
                        fullWidth
                        margin="dense"
                        label="Name"
                        value={author.name}
                        disabled
                        required
                        variant="outlined"
                    />
                </Box>

                <Box sx={{mb: 2}}>
                    <TextField
                        fullWidth
                        margin="dense"
                        label="ORCID"
                        value={author.orcid}
                        disabled
                        variant="outlined"
                    />
                </Box>

            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSave} variant="contained" color="primary" disabled={!selectedContributor}>
                    Add
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AuthorEditorModal;
