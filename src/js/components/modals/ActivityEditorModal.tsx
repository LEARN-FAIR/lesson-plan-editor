import React, {useEffect, useState} from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Typography
} from '@mui/material';
import {Activity} from '../../types';
import MdxEditorComponent from '../common/MdxEditorComponent';

interface ActivityEditorModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (activity: Activity) => void;
    activity?: Activity;
    learningOutcomes: Record<string, { outcome: string }>;
    mode: 'add' | 'edit';
}

const ActivityEditorModal: React.FC<ActivityEditorModalProps> = ({
                                                                     open,
                                                                     onClose,
                                                                     onSave,
                                                                     activity,
                                                                     learningOutcomes,
                                                                     mode
                                                                 }) => {
    const [formData, setFormData] = useState<{
        learning_outcome: string;
        activities: string;
        time: string;
        type: string;
        level: 'beginner' | 'intermediate' | 'expert';
    }>({
        learning_outcome: '',
        activities: '',
        time: '',
        type: '',
        level: 'beginner'
    });

    // Initialize form data when editing an existing activity
    useEffect(() => {
        if (activity && mode === 'edit') {
            setFormData({
                learning_outcome: activity.learning_outcome.toString(),
                activities: typeof activity.activities === 'string'
                    ? activity.activities
                    : activity.activities.join("\n"),
                time: activity.time,
                type: activity.type,
                level: activity.level
            });
        } else {
            // Reset form when adding a new activity
            setFormData({
                learning_outcome: '',
                activities: '',
                time: '',
                type: '',
                level: 'beginner'
            });
        }
    }, [activity, mode]);

    const handleFormChange = (field: keyof typeof formData) => (
        event: React.ChangeEvent<HTMLInputElement | { value: unknown }>
    ) => {
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

    const handleSave = () => {
        // Validate required fields
        if (!formData.learning_outcome || !formData.activities || !formData.time || !formData.type) {
            return;
        }

        const activityData: Activity = {
            learning_outcome: parseInt(formData.learning_outcome),
            activities: formData.activities,
            time: formData.time,
            type: formData.type,
            level: formData.level
        };

        onSave(activityData);
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="md"
        >
            <DialogTitle>
                {mode === 'add' ? 'Add activity' : 'Edit activity'}
            </DialogTitle>

            <DialogContent>
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: {xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr'},
                    gap: 2,
                    mt: 2
                }}>
                    <Box>
                        <FormControl fullWidth size="small">
                            <InputLabel>Learning outcome</InputLabel>
                            <Select
                                value={formData.learning_outcome}
                                label="Learning outcome"
                                onChange={handleFormChange('learning_outcome') as any}
                            >
                                {Object.entries(learningOutcomes || {})
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

                    <Box sx={{gridColumn: '1/-1', mt: 1}}>
                        <Typography variant="subtitle2" gutterBottom>
                            Activities Description
                        </Typography>
                        <Box sx={{border: '1px solid #ccc', borderRadius: '4px'}}>
                            <MdxEditorComponent
                                markdown={formData.activities || ''}
                                onChange={handleActivitiesChange}
                                minHeight="200px"
                                maxHeight="400px"
                                placeholder="Describe the activities here..."
                                showToolbar={true}
                                showDiffToggle={false}
                            />
                        </Box>
                    </Box>
                </Box>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={!formData.learning_outcome || !formData.activities || !formData.time || !formData.type}
                >
                    {mode === 'add' ? 'Add' : 'Save'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ActivityEditorModal;
