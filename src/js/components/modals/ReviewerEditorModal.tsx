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

interface ReviewerEditorModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (reviewer: AuthorData) => void;
    contributors: Contributor[];
}

const ReviewerEditorModal: React.FC<ReviewerEditorModalProps> = ({
                                                                     open,
                                                                     onClose,
                                                                     onSave,
                                                                     contributors
                                                                 }) => {
    const [reviewer, setReviewer] = useState<AuthorData>({
        name: '',
        orcid: ''
    });
    const [selectedContributor, setSelectedContributor] = useState<Contributor | null>(null);

    useEffect(() => {
        if (!open) {
            // Reset form when modal closes
            setReviewer({
                name: '',
                orcid: ''
            });
            setSelectedContributor(null);
        }
    }, [open]);

    const handleContributorSelect = (contributor: Contributor | null) => {
        setSelectedContributor(contributor);
        if (contributor) {
            setReviewer({
                name: `${contributor.firstName} ${contributor.lastName}`,
                orcid: contributor.orcid || ''
            });
        }
    };

    const handleSave = () => {
        if (selectedContributor) {
            onSave({
                ...reviewer,
                name: reviewer.name.trim(),
                orcid: reviewer.orcid.trim()
            });
            onClose();
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
        >
            <DialogTitle>
                Add Reviewer
                <IconButton
                    aria-label="close"
                    onClick={onClose}
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
                <Autocomplete
                    fullWidth
                    options={contributors}
                    getOptionLabel={(option) => `${option.firstName} ${option.lastName}` || ''}
                    value={selectedContributor}
                    onChange={(_, newValue) => handleContributorSelect(newValue)}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            margin="dense"
                            label="Search Contributor"
                            variant="outlined"
                            autoFocus
                        />
                    )}
                    sx={{mb: 2}}
                />

                <Box sx={{mb: 2}}>
                    <TextField
                        fullWidth
                        margin="dense"
                        label="Name"
                        value={reviewer.name}
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
                        value={reviewer.orcid}
                        disabled
                        variant="outlined"
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    onClick={handleSave}
                    variant="contained"
                    color="primary"
                    disabled={!selectedContributor}
                >
                    Add
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ReviewerEditorModal;
