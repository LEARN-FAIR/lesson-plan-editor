import React, { FC, useState, useEffect } from 'react';
import { 
  Box, TextField, Button, Typography, Paper, IconButton, Chip, MenuItem, 
  Select, FormControl, InputLabel, Checkbox, FormControlLabel, Grid, Divider
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { FairMarkdownDocument, LearningOutcome, LearningVerbLevel } from '../../types';

interface LearningOutcomesEditorProps {
  document: FairMarkdownDocument;
  onChange: (updatedDocument: Partial<FairMarkdownDocument>) => void;
}

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

const LearningOutcomesEditor: FC<LearningOutcomesEditorProps> = ({ document, onChange }) => {
  const [newOutcomeText, setNewOutcomeText] = useState('');
  const [selectedOutcomeKey, setSelectedOutcomeKey] = useState<string | null>(null);
  const [newVerb, setNewVerb] = useState('');
  const [newVerbLevel, setNewVerbLevel] = useState<LevelString>('beginner');
  
  // Level selections for each outcome
  const [levelSelections, setLevelSelections] = useState<Record<string, LevelSelections>>({});
  
  // Verb inputs for each level
  const [levelVerbs, setLevelVerbs] = useState<Record<string, LevelVerbs>>({});
  
  // State initialization is simplified - no longer need includeVerbs state

  // Initialize level selections for a new outcome
  const initializeLevelSelections = (key: string) => {
    setLevelSelections(prev => ({
      ...prev,
      [key]: {
        beginner: false,
        intermediate: false,
        expert: false
      }
    }));
    
    setLevelVerbs(prev => ({
      ...prev,
      [key]: {
        beginner: '',
        intermediate: '',
        expert: ''
      }
    }));
  };

  const handleAddOutcome = () => {
    if (!newOutcomeText.trim()) return;
    
    // Auto-generate the next outcome ID number
    const currentIds = Object.keys(document.learning_outcomes || {});
    let nextId = 1;
    
    if (currentIds.length > 0) {
      // Find the highest numeric ID and increment by 1
      const numericIds = currentIds
        .map(id => parseInt(id, 10))
        .filter(id => !isNaN(id));
      
      if (numericIds.length > 0) {
        nextId = Math.max(...numericIds) + 1;
      }
    }
    
    const newKey = nextId.toString();
    
    const updatedOutcomes: Record<string, LearningOutcome> = {
      ...document.learning_outcomes,
      [newKey]: {
        outcome: newOutcomeText,
        verbs: []
      }
    };
    
    onChange({ learning_outcomes: updatedOutcomes });
    setNewOutcomeText('');
    
    // Initialize level selections for the new outcome
    initializeLevelSelections(newKey);
  };

  const handleRemoveOutcome = (key: string) => {
    const { [key]: _, ...updatedOutcomes } = document.learning_outcomes;
    onChange({ learning_outcomes: updatedOutcomes });
    
    if (selectedOutcomeKey === key) {
      setSelectedOutcomeKey(null);
    }
    
    // Clean up state for the removed outcome
    setLevelSelections(prev => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
    
    setLevelVerbs(prev => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleUpdateOutcomeText = (key: string, text: string) => {
    if (!text.trim()) return;
    
    const updatedOutcomes: Record<string, LearningOutcome> = {
      ...document.learning_outcomes,
      [key]: {
        ...document.learning_outcomes[key],
        outcome: text
      }
    };
    
    onChange({ learning_outcomes: updatedOutcomes });
  };

  // Handle level checkbox changes
  const handleLevelChange = (outcomeKey: string, level: LevelString, checked: boolean) => {
    setLevelSelections(prev => ({
      ...prev,
      [outcomeKey]: {
        ...prev[outcomeKey],
        [level]: checked
      }
    }));
    
    // Update the verbs in the document based on selections and verb inputs
    updateOutcomeVerbs(outcomeKey);
  };
  
  // Handle verb input changes
  const handleVerbChange = (outcomeKey: string, level: LevelString, verb: string) => {
    setLevelVerbs(prev => ({
      ...prev,
      [outcomeKey]: {
        ...prev[outcomeKey],
        [level]: verb
      }
    }));
  };
  
  // Update the outcome verbs in the document
  const updateOutcomeVerbs = (outcomeKey: string) => {
    const currentOutcome = document.learning_outcomes?.[outcomeKey];
    if (!currentOutcome) return;
    
    const selections = levelSelections[outcomeKey] || { beginner: false, intermediate: false, expert: false };
    const verbs = levelVerbs[outcomeKey] || { beginner: '', intermediate: '', expert: '' };
    
    // Create new verbs array based on selections
    const updatedVerbs = Object.entries(selections)
      .filter(([level, isSelected]) => isSelected)
      .map(([level, _]) => {
        const typedLevel = level as LevelString;
        return {
          verb: verbs[typedLevel] || '',
          level: typedLevel
        };
      });
    
    const updatedOutcomes: Record<string, LearningOutcome> = {
      ...document.learning_outcomes,
      [outcomeKey]: {
        ...currentOutcome,
        verbs: updatedVerbs
      }
    };
    
    onChange({ learning_outcomes: updatedOutcomes });
  };

  const handleAddVerb = () => {
    if (!selectedOutcomeKey || !newVerb.trim()) return;
    
    const currentOutcome = document.learning_outcomes[selectedOutcomeKey];
    const updatedVerbs = [
      ...currentOutcome.verbs,
      { verb: newVerb, level: newVerbLevel }
    ];
    
    const updatedOutcomes = {
      ...document.learning_outcomes,
      [selectedOutcomeKey]: {
        ...currentOutcome,
        verbs: updatedVerbs
      }
    };
    
    onChange({ learning_outcomes: updatedOutcomes });
    setNewVerb('');
    setNewVerbLevel('beginner');
  };

  const handleRemoveVerb = (outcomeKey: string, verbIndex: number) => {
    const currentOutcome = document.learning_outcomes?.[outcomeKey];
    if (!currentOutcome) return;
    
    const updatedVerbs = [...currentOutcome.verbs];
    updatedVerbs.splice(verbIndex, 1);
    
    const updatedOutcomes = {
      ...document.learning_outcomes,
      [outcomeKey]: {
        ...currentOutcome,
        verbs: updatedVerbs
      }
    };
    
    onChange({ learning_outcomes: updatedOutcomes });
  };

  // Initialize level selections and verbs when learning outcomes change
  useEffect(() => {
    if (!document.learning_outcomes) return;
    
    Object.entries(document.learning_outcomes).forEach(([key, outcome]) => {
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
      
      if (!levelSelections.hasOwnProperty(key)) {
        setLevelSelections(prev => ({
          ...prev,
          [key]: selectedLevels
        }));
      }
      
      if (!levelVerbs.hasOwnProperty(key)) {
        setLevelVerbs(prev => ({
          ...prev,
          [key]: verbInputs
        }));
      }
    });
  }, [document.learning_outcomes]);

  // Render level checkboxes and verb inputs for an outcome
  const renderLevelOptions = (outcomeKey: string) => {
    const outcome = document.learning_outcomes?.[outcomeKey];
    if (!outcome) return null;
    
    const selections = levelSelections[outcomeKey] || { beginner: false, intermediate: false, expert: false };
    const verbs = levelVerbs[outcomeKey] || { beginner: '', intermediate: '', expert: '' };
    
    return (
      <Box sx={{ mt: 2 }}>
        <Divider sx={{ my: 1 }} />
        
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2, mt: 1 }}>
          {(['beginner', 'intermediate', 'expert'] as const).map(level => (
            <Box key={level}>
              <Box sx={{ border: 1, borderColor: 'divider', p: 1, borderRadius: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selections[level]}
                      onChange={(e) => handleLevelChange(outcomeKey, level, e.target.checked)}
                    />
                  }
                  label={level.charAt(0).toUpperCase() + level.slice(1)}
                />
                
                {selections[level] && (
                  <TextField
                    fullWidth
                    size="small"
                    label={`${level.charAt(0).toUpperCase() + level.slice(1)} verb`}
                    value={verbs[level]}
                    onChange={(e) => handleVerbChange(outcomeKey, level, e.target.value)}
                    placeholder="Enter verb"
                    margin="dense"
                  />
                )}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  return (
    <Box>
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Add New Learning Outcome
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
          <TextField
            fullWidth
            label="Outcome Description"
            value={newOutcomeText}
            onChange={(e) => setNewOutcomeText(e.target.value)}
            size="small"
            placeholder="Learning outcome will be automatically numbered"
          />
          
          <Button 
            variant="contained" 
            onClick={handleAddOutcome}
          >
            Add
          </Button>
        </Box>
      </Paper>
      
      <Typography variant="h6" gutterBottom>
        Learning Outcomes
      </Typography>
      
      {Object.entries(document.learning_outcomes || {})
        // Sort by numeric ID to ensure consistent display order
        .sort(([keyA], [keyB]) => {
          const numA = parseInt(keyA, 10);
          const numB = parseInt(keyB, 10);
          return numA - numB;
        })
        .map(([key, outcome]) => (
        <Paper 
          key={key} 
          elevation={2} 
          sx={{ 
            p: 2, 
            mb: 2,
            bgcolor: selectedOutcomeKey === key ? 'action.selected' : 'background.paper'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle1" sx={{ mr: 2 }}>
              Outcome {key}:
            </Typography>
            <TextField
              fullWidth
              value={outcome.outcome}
              onChange={(e) => handleUpdateOutcomeText(key, e.target.value)}
              size="small"
              sx={{ flexGrow: 1 }}
            />
            <IconButton 
              color="error"
              onClick={() => handleRemoveOutcome(key)}
            >
              <DeleteIcon />
            </IconButton>
          </Box>
          
          {/* Level checkboxes and verb inputs */}
          {renderLevelOptions(key)}
          
          {/* Display existing verbs as chips */}
          {outcome.verbs.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mr: 1 }}>Current verbs:</Typography>
              {outcome.verbs.map((verb, index) => (
                <Chip
                  key={index}
                  label={verb.verb ? `${verb.verb} (${verb.level})` : verb.level}
                  size="small"
                  color={
                    verb.level === 'beginner' ? 'primary' : 
                    verb.level === 'intermediate' ? 'secondary' : 'error'
                  }
                />
              ))}
            </Box>
          )}
        </Paper>
      ))}
    </Box>
  );
};

export default LearningOutcomesEditor;
