import React, { ReactNode } from 'react';
import { TableRow } from '@mui/material';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableTableRowProps {
  id: string;
  children: ReactNode;
}

const SortableTableRow: React.FC<SortableTableRowProps> = ({ 
  id, 
  children 
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
      {...attributes}
      {...listeners}
    >
      {children}
    </TableRow>
  );
};

export default SortableTableRow;
