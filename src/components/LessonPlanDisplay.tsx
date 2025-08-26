import React, {useEffect, useState} from 'react';
import {Box, Button, Paper, Typography} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import GitHubIcon from '@mui/icons-material/GitHub';
import lessonPlanService, {LessonPlan} from '../services/lessonPlanService';

interface LessonPlanDisplayProps {
    onSelectLessonPlan: () => void;
}

const LessonPlanDisplay: React.FC<LessonPlanDisplayProps> = ({onSelectLessonPlan}) => {
    const [selectedLessonPlan, setSelectedLessonPlan] = useState<LessonPlan | null>(null);

    useEffect(() => {
        // Load the selected lesson plan from the service
        const lessonPlan = lessonPlanService.getSelectedLessonPlan();
        setSelectedLessonPlan(lessonPlan);
    }, []);

    if (!selectedLessonPlan) {
        return (
            <Paper
                elevation={1}
                sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 3
                }}
            >
                <Box sx={{display: 'flex', alignItems: 'center'}}>
                    <DescriptionIcon sx={{mr: 1, color: 'text.secondary'}}/>
                    <Typography variant="body1">
                        No lesson plan selected
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    onClick={onSelectLessonPlan}
                >
                    Select Lesson Plan
                </Button>
            </Paper>
        );
    }

    return (
        <Paper
            elevation={1}
            sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 3
            }}
        >
            <Box sx={{display: 'flex', alignItems: 'center'}}>
                <DescriptionIcon sx={{mr: 2, color: 'primary.main'}}/>
                <Box>
                    <Typography variant="body1" sx={{fontWeight: 'medium'}}>
                        {selectedLessonPlan.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {selectedLessonPlan.path}
                    </Typography>
                </Box>
            </Box>
            <Box>
                <Button
                    variant="outlined"
                    color="primary"
                    size="small"
                    onClick={onSelectLessonPlan}
                    sx={{mr: 1}}
                >
                    Change
                </Button>
                <Button
                    variant="outlined"
                    size="small"
                    href={selectedLessonPlan.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    startIcon={<GitHubIcon/>}
                >
                    View on GitHub
                </Button>
            </Box>
        </Paper>
    );
};

export default LessonPlanDisplay;
