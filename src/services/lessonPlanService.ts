/**
 * Lesson Plan service for handling lesson plan operations
 */

import githubRepoService, { Repository } from './githubRepoService';

// Local storage keys
const SELECTED_LESSON_PLAN_KEY = 'selected_lesson_plan';

// Lesson plan folder path
const LESSON_PLANS_FOLDER = '_lesson-plans';

export interface LessonPlan {
  name: string;
  path: string;
  sha: string;
  content: string | null;
  decoded_content: string | null;
  html_url: string;
  category?: {
    title: string;
    number: number;
  };
}

class LessonPlanService {
  private selectedLessonPlan: LessonPlan | null = null;

  constructor() {
    // Try to load selected lesson plan from local storage
    const lessonPlanJson = localStorage.getItem(SELECTED_LESSON_PLAN_KEY);
    if (lessonPlanJson) {
      try {
        this.selectedLessonPlan = JSON.parse(lessonPlanJson);
      } catch (e) {
        console.error('Failed to parse stored lesson plan:', e);
      }
    }
  }

  /**
   * Get all lesson plans from the repository by recursively searching through the directory structure
   */
  async getLessonPlans(): Promise<LessonPlan[]> {
    // Check if we have a GitHub token
    if (!localStorage.getItem('github_oauth_token')) {
      throw new Error('Not authenticated with GitHub');
    }

    const selectedRepo = githubRepoService.getSelectedRepo();
    if (!selectedRepo) {
      console.error('No repository selected when trying to get lesson plans');
      throw new Error('No repository selected. Please ensure you are logged in and have selected a repository.');
    }

    try {
      // Get the selected branch or fall back to default branch
      const selectedBranch = githubRepoService.getSelectedBranch() || selectedRepo.default_branch;
      
      // Get lesson plans from the backend API
      const response = await fetch(`http://localhost:4000/api/lesson-plans?owner=${encodeURIComponent(selectedRepo.owner.login)}&repo=${encodeURIComponent(selectedRepo.name)}&branch=${encodeURIComponent(selectedBranch)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('github_oauth_token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch lesson plans');
      }
      
      const lessonPlans = await response.json();
      return lessonPlans;
    } catch (error) {
      console.error('Error fetching lesson plans:', error);
      
      // If the folder doesn't exist, return an empty array
      if ((error as any).status === 404) {
        return [];
      }
      
      throw error;
    }
  }

  // Category info is now handled by the backend
  
  /**
   * Get a specific lesson plan by path
   */
  async getLessonPlan(path: string): Promise<LessonPlan> {
    // Check if we have a GitHub token
    if (!localStorage.getItem('github_oauth_token')) {
      throw new Error('Not authenticated with GitHub');
    }

    const repo = githubRepoService.getSelectedRepo();
    if (!repo) {
      console.error('No repository selected when trying to get lesson plan:', path);
      throw new Error('No repository selected. Please ensure you are logged in and have selected a repository.');
    }

    try {
      const branch = githubRepoService.getSelectedBranch() || repo.default_branch;
      
      // Get lesson plan from the backend API using the new /file endpoint
      // We're using a query parameter approach to avoid path encoding issues
      const response = await fetch(`http://localhost:4000/api/lesson-plans/file?path=${encodeURIComponent(path)}&owner=${encodeURIComponent(repo.owner.login)}&repo=${encodeURIComponent(repo.name)}&branch=${encodeURIComponent(branch)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('github_oauth_token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch lesson plan');
      }
      
      const lessonPlan = await response.json();
      return lessonPlan;
    } catch (error) {
      console.error('Error fetching lesson plan:', error);
      throw error;
    }
  }

  /**
   * Set the selected lesson plan
   */
  setSelectedLessonPlan(lessonPlan: LessonPlan): void {
    this.selectedLessonPlan = lessonPlan;
    localStorage.setItem(SELECTED_LESSON_PLAN_KEY, JSON.stringify(lessonPlan));
  }

  /**
   * Get the selected lesson plan
   */
  getSelectedLessonPlan(): LessonPlan | null {
    return this.selectedLessonPlan;
  }

  /**
   * Clear the selected lesson plan
   */
  clearSelectedLessonPlan(): void {
    this.selectedLessonPlan = null;
    localStorage.removeItem(SELECTED_LESSON_PLAN_KEY);
  }

  /**
   * Check if a lesson plan is selected
   */
  hasSelectedLessonPlan(): boolean {
    return this.selectedLessonPlan !== null;
  }
}

// Create singleton instance
const lessonPlanService = new LessonPlanService();
export default lessonPlanService;
