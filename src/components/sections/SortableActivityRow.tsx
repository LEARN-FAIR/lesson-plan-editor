import React from 'react';
import { TableRow, TableCell, IconButton, Box } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Activity } from '../../types';
import ReactMarkdown from 'react-markdown';

interface SortableActivityRowProps {
  activity: Activity;
  id: string;
  index: number;
  onEdit: (activity: Activity, index: number) => void;
  onRemove: (index: number) => void;
}

const SortableActivityRow: React.FC<SortableActivityRowProps> = ({ 
  activity, 
  id, 
  index, 
  onEdit, 
  onRemove 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'default',
    backgroundColor: isDragging ? '#f5f5f5' : 'transparent'
  };

  return (
    <TableRow 
      ref={setNodeRef} 
      style={style}
      hover
    >
      <TableCell padding="none" width="40px">
        <IconButton 
          size="small" 
          {...attributes} 
          {...listeners}
          sx={{ cursor: 'grab' }}
        >
          <DragIndicatorIcon fontSize="small" />
        </IconButton>
      </TableCell>
      <TableCell>{activity.learning_outcome || ''}</TableCell>
      <TableCell sx={{ p: 1 }}>
        <Box sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
          <ReactMarkdown>
            {typeof activity.activities === 'string' 
              ? activity.activities 
              : activity.activities.join("\n")}
          </ReactMarkdown>
        </Box>
      </TableCell>
      <TableCell>{activity.time}</TableCell>
      <TableCell>{activity.type}</TableCell>
      <TableCell>{activity.level}</TableCell>
      <TableCell align="right">
        <IconButton 
          size="small" 
          color="primary"
          onClick={() => onEdit(activity, index)}
          sx={{ mr: 1 }}
        >
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton 
          size="small" 
          color="error"
          onClick={() => onRemove(index)}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </TableCell>
    </TableRow>
  );
};

export default SortableActivityRow;
