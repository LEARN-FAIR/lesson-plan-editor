import React, {useState} from 'react';
import {Box, Button, IconButton, List, ListItemSecondaryAction, ListItemText, Typography} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import ChecklistIcon from '@mui/icons-material/Checklist';
import SectionHeader from '../common/SectionHeader';
import PrerequisiteEditorModal from '../modals/PrerequisiteEditorModal';
import {FairMarkdownDocument} from '../../types';
import {
    closestCenter,
    DndContext,
    DragEndEvent,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors
} from '@dnd-kit/core';
import {arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy} from '@dnd-kit/sortable';
import SortableListItem from '../common/SortableListItem';

interface PrerequisitesEditorProps {
    document: FairMarkdownDocument;
    onChange: (updatedDocument: Partial<FairMarkdownDocument>) => void;
}

const PrerequisitesEditor: React.FC<PrerequisitesEditorProps> = ({document, onChange}) => {
    const [modalOpen, setModalOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [isEditing, setIsEditing] = useState(false);

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

    // Handle drag end event
    const handleDragEnd = (event: DragEndEvent) => {
        const {active, over} = event;

        if (over && active.id !== over.id) {
            const oldIndex = parseInt(active.id.toString(), 10);
            const newIndex = parseInt(over.id.toString(), 10);

            // Create a new array with the reordered items
            // This allows the animation to complete properly
            const updatedPrerequisites = arrayMove(
                [...(document.prerequisites || [])],
                oldIndex,
                newIndex
            );

            onChange({prerequisites: updatedPrerequisites});
        }
    };

    const handleOpenAddModal = () => {
        setIsEditing(false);
        setEditingIndex(null);
        setModalOpen(true);
    };

    const handleOpenEditModal = (index: number) => {
        setIsEditing(true);
        setEditingIndex(index);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setEditingIndex(null);
    };

    const handleSavePrerequisite = (prerequisite: string) => {
        if (!prerequisite.trim()) return;

        const updatedPrerequisites = [...(document.prerequisites || [])];

        if (isEditing && editingIndex !== null) {
            // Update existing prerequisite
            updatedPrerequisites[editingIndex] = prerequisite;
        } else {
            // Add new prerequisite
            updatedPrerequisites.push(prerequisite);
        }

        onChange({prerequisites: updatedPrerequisites});
    };

    const handleRemovePrerequisite = (index: number) => {
        const updatedPrerequisites = [...document.prerequisites];
        updatedPrerequisites.splice(index, 1);
        onChange({prerequisites: updatedPrerequisites});
    };


    return (
        <Box>
            <SectionHeader
                icon={<ChecklistIcon color="primary"/>}
                title="Prerequisites"
                actions={<Button
                    variant="contained"
                    startIcon={<AddIcon/>}
                    onClick={handleOpenAddModal}
                >
                    Add prerequisite
                </Button>}
            />

            <PrerequisiteEditorModal
                open={modalOpen}
                onClose={handleCloseModal}
                onSave={handleSavePrerequisite}
                initialValue={isEditing && editingIndex !== null ? document.prerequisites[editingIndex] : ''}
                isEditing={isEditing}
            />

            {document.prerequisites && document.prerequisites.length > 0 ? (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <List sx={{bgcolor: 'background.paper', border: '1px solid #e0e0e0', borderRadius: 1}}>
                        <SortableContext
                            items={document.prerequisites.map((_, index) => index.toString())}
                            strategy={verticalListSortingStrategy}
                        >
                            {document.prerequisites.map((prerequisite, index) => (
                                <SortableListItem key={index} id={index.toString()}>
                                    <ListItemText
                                        primary={prerequisite}
                                    />
                                    <ListItemSecondaryAction>
                                        <IconButton edge="end" aria-label="edit"
                                                    onClick={() => handleOpenEditModal(index)} sx={{mr: 1}}>
                                            <EditIcon/>
                                        </IconButton>
                                        <IconButton edge="end" aria-label="delete"
                                                    onClick={() => handleRemovePrerequisite(index)}>
                                            <DeleteIcon/>
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                </SortableListItem>
                            ))}
                        </SortableContext>
                    </List>
                </DndContext>
            ) : (
                <Typography variant="body2" color="text.secondary" sx={{mt: 1, fontStyle: 'italic'}}>
                    No prerequisites added yet.
                </Typography>
            )}
        </Box>
    );
};

export default PrerequisitesEditor;
