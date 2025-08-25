import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  FormControl,
  FormControlLabel,
  Checkbox,
  Divider,
  Typography,
  Chip
} from '@mui/material';
import { LearningOutcome, LearningVerbLevel } from '../../types';

// Define a type for the level strings
type LevelString = 'beginner' | 'intermediate' | 'expert';

interface LevelSelections {
  beginner: boolean;
  intermediate: boolean;
  expert: boolean;
}

interface LevelVerbs {
  beginner: string;
  intermediate: string;
  expert: string;
}

interface LearningOutcomeEditorModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (outcome: LearningOutcome, outcomeKey: string) => void;
  outcome?: LearningOutcome;
  outcomeKey?: string;
  mode: 'add' | 'edit';
}

const LearningOutcomeEditorModal: React.FC<LearningOutcomeEditorModalProps> = ({
  open,
  onClose,
  onSave,
  outcome,
  outcomeKey,
  mode
}) => {
  const [outcomeText, setOutcomeText] = useState('');
  const [levelSelections, setLevelSelections] = useState<LevelSelections>({
    beginner: false,
    intermediate: false,
    expert: false
  });
  const [levelVerbs, setLevelVerbs] = useState<LevelVerbs>({
    beginner: '',
    intermediate: '',
    expert: ''
  });

  // Initialize form when outcome changes
  useEffect(() => {
    if (outcome) {
      setOutcomeText(outcome.outcome || '');
      
      // Initialize level selections based on existing verbs
      const selectedLevels: LevelSelections = {
        beginner: false,
        intermediate: false,
        expert: false
      };
      
      // Initialize verb inputs based on existing verbs
      const verbInputs: LevelVerbs = {
        beginner: '',
        intermediate: '',
        expert: ''
      };
      
      outcome.verbs.forEach((verbObj: LearningVerbLevel) => {
        if (verbObj.level === 'beginner' || verbObj.level === 'intermediate' || verbObj.level === 'expert') {
          selectedLevels[verbObj.level] = true;
          verbInputs[verbObj.level] = verbObj.verb || '';
        }
      });
      
      setLevelSelections(selectedLevels);
      setLevelVerbs(verbInputs);
    } else {
      // Reset form for new outcome
      setOutcomeText('');
      setLevelSelections({
        beginner: false,
        intermediate: false,
        expert: false
      });
      setLevelVerbs({
        beginner: '',
        intermediate: '',
        expert: ''
      });
    }
  }, [outcome, open]);

  // Handle level checkbox changes
  const handleLevelChange = (level: LevelString, checked: boolean) => {
    setLevelSelections(prev => ({
      ...prev,
      [level]: checked
    }));
  };
  
  // Handle verb input changes
  const handleVerbChange = (level: LevelString, verb: string) => {
    setLevelVerbs(prev => ({
      ...prev,
      [level]: verb
    }));
  };

  const handleSave = () => {
    if (!outcomeText.trim()) return;
    
    // Create verbs array based on selections
    const verbs = Object.entries(levelSelections)
      .filter(([level, isSelected]) => isSelected)
      .map(([level, _]) => {
        const typedLevel = level as LevelString;
        return {
          verb: levelVerbs[typedLevel] || '',
          level: typedLevel
        };
      });
    
    const updatedOutcome: LearningOutcome = {
      outcome: outcomeText,
      verbs: verbs
    };
    
    onSave(updatedOutcome, outcomeKey || '');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {mode === 'add' ? 'Add New Learning Outcome' : 'Edit Learning Outcome'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="Outcome Description"
            value={outcomeText}
            onChange={(e) => setOutcomeText(e.target.value)}
            placeholder="Enter learning outcome description"
            multiline
            rows={2}
          />
        </Box>
        
        <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
          Bloom's Taxonomy Verbs
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
          {(['beginner', 'intermediate', 'expert'] as const).map(level => (
            <Box key={level} sx={{ border: 1, borderColor: 'divider', p: 2, borderRadius: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={levelSelections[level]}
                    onChange={(e) => handleLevelChange(level, e.target.checked)}
                  />
                }
                label={level.charAt(0).toUpperCase() + level.slice(1)}
              />
              
              {levelSelections[level] && (
                <TextField
                  fullWidth
                  size="small"
                  label={`${level.charAt(0).toUpperCase() + level.slice(1)} verb`}
                  value={levelVerbs[level]}
                  onChange={(e) => handleVerbChange(level, e.target.value)}
                  placeholder="Enter verb"
                  margin="dense"
                />
              )}
            </Box>
          ))}
        </Box>
        
        {/* Display selected verbs as chips */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 3 }}>
          <Typography variant="subtitle2" sx={{ mr: 1 }}>Selected verbs:</Typography>
          {Object.entries(levelSelections)
            .filter(([_, isSelected]) => isSelected)
            .map(([level, _]) => {
              const typedLevel = level as LevelString;
              const verb = levelVerbs[typedLevel];
              return verb ? (
                <Chip
                  key={level}
                  label={`${verb} (${level})`}
                  size="small"
                  color={
                    level === 'beginner' ? 'primary' : 
                    level === 'intermediate' ? 'secondary' : 'error'
                  }
                />
              ) : null;
            })
            .filter(Boolean)
          }
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          disabled={!outcomeText.trim()}
        >
          {mode === 'add' ? 'Add' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LearningOutcomeEditorModal;
