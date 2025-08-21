import React, { useState, useEffect } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Paper,
  Container,
  StepContent,
  Alert,
  ButtonGroup,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Avatar,
  Chip,
  Tooltip,
  CircularProgress,
  TextField,
  InputAdornment,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ForkRightIcon from '@mui/icons-material/ForkRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
// No longer importing modal components
import githubRepoService, { Repository } from '../services/githubRepoService';
import lessonPlanService, { LessonPlan } from '../services/lessonPlanService';

const steps = [
  {
    label: 'Select Repository',
    description: 'Select a GitHub repository to work with.'
  },
  {
    label: 'Select Lesson Plan',
    description: 'Choose a lesson plan from the repository to edit.'
  }
];

interface SetupStepperProps {
  onComplete: (repo: Repository, lessonPlan: LessonPlan) => void;
}

const SetupStepper: React.FC<SetupStepperProps> = ({ onComplete }) => {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [selectedLessonPlan, setSelectedLessonPlan] = useState<LessonPlan | null>(null);

  // Repository step state
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loadingRepos, setLoadingRepos] = useState<boolean>(true);
  const [repoError, setRepoError] = useState<string | null>(null);

  // Lesson plan step state
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [loadingLessonPlans, setLoadingLessonPlans] = useState<boolean>(true);
  const [lessonPlanError, setLessonPlanError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if there's already a selected repository
    const repo = githubRepoService.getSelectedRepo();
    if (repo) {
      setSelectedRepo(repo);
    }

    // Load repositories regardless
    fetchRepositories();
  }, []);

  // Load lesson plans when a repository is selected
  useEffect(() => {
    if (selectedRepo) {
      fetchLessonPlans();
    }
  }, [selectedRepo]);

  const handleNext = () => {
    if (activeStep === 0) {
      // After repository selection, move to lesson plan selection
      if (selectedRepo) {
        setActiveStep(1);
      }
    } else if (activeStep === 1) {
      // After lesson plan selection, complete the setup
      if (selectedRepo && selectedLessonPlan) {
        setActiveStep(2);
        onComplete(selectedRepo, selectedLessonPlan);
      }
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
    setSelectedRepo(null);
    setSelectedLessonPlan(null);
    githubRepoService.clearSelectedRepo();
    lessonPlanService.clearSelectedLessonPlan();
  };

  const handleRepoSelected = (repo: Repository) => {
    setSelectedRepo(repo);
    githubRepoService.setSelectedRepo(repo);
  };

  const handleLessonPlanSelected = (lessonPlan: LessonPlan) => {
    setSelectedLessonPlan(lessonPlan);
    lessonPlanService.setSelectedLessonPlan(lessonPlan);
  };

  // Repository step functions
  const fetchRepositories = async () => {
    try {
      setLoadingRepos(true);
      setRepoError(null);
      const repos = await githubRepoService.getTargetRepoAndForks();
      setRepositories(repos);
    } catch (err) {
      console.error('Error fetching repositories:', err);
      setRepoError(err instanceof Error ? err.message : 'Failed to load repositories');
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleCreateFork = () => {
    // Open GitHub fork page in a new tab
    window.open('https://github.com/elixir-europe-training/ELIXIR-TrP-FAIR-Converge/fork', '_blank');

    // Show a message to the user about refreshing after forking
    setRepoError('After creating your fork on GitHub, please refresh this page to see your new fork.');
  };

  // Lesson plan step functions
  const fetchLessonPlans = async () => {
    try {
      setLoadingLessonPlans(true);
      setLessonPlanError(null);
      const plans = await lessonPlanService.getLessonPlans();
      setLessonPlans(plans);

      // If there are categories, expand the first one
      const categories = groupLessonPlansByCategory(plans);
      if (categories.length > 0) {
        setExpandedCategory(categories[0].category);
      }
    } catch (err) {
      console.error('Error fetching lesson plans:', err);
      setLessonPlanError(err instanceof Error ? err.message : 'Failed to load lesson plans');
    } finally {
      setLoadingLessonPlans(false);
    }
  };

  // Group lesson plans by category
  const groupLessonPlansByCategory = (plans: LessonPlan[]) => {
    const categorizedPlans: { category: string; plans: LessonPlan[] }[] = [];
    const uncategorizedPlans: LessonPlan[] = [];

    // Group plans by category
    plans.forEach(plan => {
      if (plan.category && typeof plan.category === 'object' && plan.category.title) {
        const categoryTitle = plan.category.title;
        const existingCategory = categorizedPlans.find(c => c.category === categoryTitle);
        if (existingCategory) {
          existingCategory.plans.push(plan);
        } else {
          categorizedPlans.push({
            category: plan.category.title,
            plans: [plan]
          });
        }
      } else {
        uncategorizedPlans.push(plan);
      }
    });

    // Sort categories by number if available
    categorizedPlans.sort((a, b) => {
      // Find plans with matching categories and get their category numbers
      const planA = plans.find(p => p.category && typeof p.category === 'object' && p.category.title === a.category);
      const planB = plans.find(p => p.category && typeof p.category === 'object' && p.category.title === b.category);
      const aNumber = planA?.category?.number || 0;
      const bNumber = planB?.category?.number || 0;
      return aNumber - bNumber;
    });

    // Add uncategorized plans at the end if any
    if (uncategorizedPlans.length > 0) {
      categorizedPlans.push({
        category: 'Uncategorized',
        plans: uncategorizedPlans
      });
    }

    return categorizedPlans;
  };

  // Filter lesson plans based on search query
  const filterLessonPlans = (plans: LessonPlan[]) => {
    if (!searchQuery) return plans;

    const query = searchQuery.toLowerCase();
    return plans.filter(plan => {
      const nameMatch = plan.name.toLowerCase().includes(query);
      const categoryMatch = plan.category && typeof plan.category === 'object' && plan.category.title ? 
        plan.category.title.toLowerCase().includes(query) : false;
      return nameMatch || categoryMatch;
    });
  };

  const handleToggleCategory = (category: string) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Setup Lesson Plan Editor
        </Typography>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel>
                <Typography variant="subtitle1">{step.label}</Typography>
              </StepLabel>
              <StepContent>
                <Typography>{step.description}</Typography>

                {/* Repository Selection Step */}
                {index === 0 && (
                  <Box sx={{ mt: 2 }}>
                    {repoError && (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        {repoError}
                      </Alert>
                    )}

                    {loadingRepos ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                        <CircularProgress />
                      </Box>
                    ) : repositories.length === 0 ? (
                      <Box sx={{ my: 2 }}>
                        <Typography variant="body1" gutterBottom>
                          You don't have access to the original repository or any forks.
                        </Typography>
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={handleCreateFork}
                          startIcon={<ForkRightIcon />}
                          sx={{ mt: 1 }}
                        >
                          Fork on GitHub
                        </Button>
                      </Box>
                    ) : (
                      <>
                        <List sx={{ width: '100%', bgcolor: 'background.paper', mb: 2 }}>
                          {repositories.map((repo) => (
                            <ListItem key={repo.id} disablePadding>
                              <ListItemButton
                                onClick={() => handleRepoSelected(repo)}
                                selected={selectedRepo?.id === repo.id}
                                sx={{
                                  border: selectedRepo?.id === repo.id ? '1px solid #1976d2' : 'none',
                                  borderRadius: 1,
                                  mb: 1
                                }}
                              >
                                <ListItemAvatar>
                                  <Avatar src={repo.owner.avatar_url} alt={repo.owner.login} />
                                </ListItemAvatar>
                                <ListItemText
                                  primary={
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      {repo.full_name}
                                      {repo.fork && (
                                        <Tooltip title="This is a fork">
                                          <ForkRightIcon fontSize="small" sx={{ ml: 1, color: 'text.secondary' }} />
                                        </Tooltip>
                                      )}
                                    </Box>
                                  }
                                  secondary={
                                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                                      {repo.permissions?.push ? (
                                        <Chip label="Write Access" size="small" color="success" variant="outlined" />
                                      ) : (
                                        <Chip label="Read Only" size="small" color="warning" variant="outlined" />
                                      )}
                                    </Box>
                                  }
                                />
                              </ListItemButton>
                            </ListItem>
                          ))}
                        </List>

                        <Button
                          variant="outlined"
                          color="primary"
                          onClick={handleCreateFork}
                          startIcon={<ForkRightIcon />}
                          sx={{ mb: 2 }}
                        >
                          Fork on GitHub
                        </Button>
                        <Typography variant="caption" display="block">
                          After creating your fork, refresh this page to see it in the list.
                        </Typography>
                      </>
                    )}
                  </Box>
                )}

                {/* Lesson Plan Selection Step */}
                {index === 1 && (
                  <Box sx={{ mt: 2 }}>
                    {lessonPlanError && (
                      <Alert severity="error" sx={{ mb: 2 }}>
                        {lessonPlanError}
                      </Alert>
                    )}

                    {loadingLessonPlans ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                        <CircularProgress />
                      </Box>
                    ) : (
                      <>
                        <TextField
                          fullWidth
                          variant="outlined"
                          placeholder="Search lesson plans..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          sx={{ mb: 2 }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <SearchIcon />
                              </InputAdornment>
                            ),
                            endAdornment: searchQuery ? (
                              <InputAdornment position="end">
                                <IconButton onClick={() => setSearchQuery('')} size="small">
                                  ×
                                </IconButton>
                              </InputAdornment>
                            ) : null
                          }}
                        />

                        {groupLessonPlansByCategory(filterLessonPlans(lessonPlans)).map((categoryGroup) => (
                          <Accordion
                            key={categoryGroup.category}
                            expanded={expandedCategory === categoryGroup.category}
                            onChange={() => handleToggleCategory(categoryGroup.category)}
                            sx={{ mb: 1 }}
                          >
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                              <Typography variant="subtitle1">
                                {categoryGroup.category} ({categoryGroup.plans.length})
                              </Typography>
                            </AccordionSummary>
                            <AccordionDetails sx={{ p: 0 }}>
                              <List dense>
                                {categoryGroup.plans.map((plan) => (
                                  <ListItem key={plan.path} disablePadding>
                                    <ListItemButton
                                      onClick={() => handleLessonPlanSelected(plan)}
                                      selected={selectedLessonPlan?.path === plan.path}
                                      sx={{
                                        border: selectedLessonPlan?.path === plan.path ? '1px solid #1976d2' : 'none',
                                        borderRadius: 1,
                                        mx: 1,
                                        mb: 0.5
                                      }}
                                    >
                                      <ListItemText
                                        primary={plan.name.replace(/\.md$/, '').replace(/-/g, ' ')}
                                        secondary={plan.path.split('/').slice(0, -1).join('/')}
                                      />
                                    </ListItemButton>
                                  </ListItem>
                                ))}
                              </List>
                            </AccordionDetails>
                          </Accordion>
                        ))}

                        {filterLessonPlans(lessonPlans).length === 0 && (
                          <Alert severity="info" sx={{ mt: 2 }}>
                            No lesson plans found matching your search.
                          </Alert>
                        )}
                      </>
                    )}
                  </Box>
                )}

                <Box sx={{ mb: 2, mt: 2 }}>
                  <div>
                    <Button
                      variant="contained"
                      onClick={handleNext}
                      sx={{ mt: 1, mr: 1 }}
                      disabled={index === 0 && !selectedRepo || index === 1 && !selectedLessonPlan}
                    >
                      {index === steps.length - 1 ? 'Finish' : 'Continue'}
                    </Button>
                    <Button
                      disabled={index === 0}
                      onClick={handleBack}
                      sx={{ mt: 1, mr: 1 }}
                    >
                      Back
                    </Button>
                  </div>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>

        {activeStep === steps.length && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Setup Complete
            </Typography>
            <Typography variant="body1" paragraph>
              You've selected repository <strong>{selectedRepo?.full_name}</strong> and lesson plan{' '}
              <strong>{selectedLessonPlan?.name.replace(/\.md$/, '').replace(/-/g, ' ')}</strong>.
            </Typography>
            <Typography variant="body1" paragraph>
              You can now proceed to the editor or change your selections.
            </Typography>
            <ButtonGroup variant="outlined" sx={{ mt: 2 }}>
              <Button onClick={() => setActiveStep(0)} sx={{ mr: 1 }}>
                Change Repository
              </Button>
              <Button onClick={() => setActiveStep(1)} sx={{ mr: 1 }}>
                Change Lesson Plan
              </Button>
              <Button onClick={handleReset} color="secondary">
                Reset All
              </Button>
            </ButtonGroup>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default SetupStepper;
