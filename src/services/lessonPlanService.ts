/**
 * Lesson Plan service for handling lesson plan operations
 */

import githubRepoService, { Repository } from './githubRepoService';
import { Octokit } from '@octokit/rest';

// Session storage keys
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
    // Try to load selected lesson plan from session storage
    const lessonPlanJson = sessionStorage.getItem(SELECTED_LESSON_PLAN_KEY);
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
    if (!sessionStorage.getItem('github_oauth_token')) {
      throw new Error('Not authenticated with GitHub');
    }

    const selectedRepo = githubRepoService.getSelectedRepo();
    if (!selectedRepo) {
      throw new Error('No repository selected');
    }

    try {
      const octokit = new Octokit({
        auth: sessionStorage.getItem('github_oauth_token')
      });

      // Get the selected branch or fall back to default branch
      const selectedBranch = githubRepoService.getSelectedBranch() || selectedRepo.default_branch;
      
      // Get the contents of the _lesson-plans folder
      const response = await octokit.repos.getContent({
        owner: selectedRepo.owner.login,
        repo: selectedRepo.name,
        path: LESSON_PLANS_FOLDER,
        ref: selectedBranch
      });

      if (!Array.isArray(response.data)) {
        throw new Error('Expected a directory, got a file');
      }

      // This will store all our lesson plans
      const lessonPlans: LessonPlan[] = [];
      
      // Process each category folder
      for (const item of response.data) {
        if (item.type === 'dir') {
          // This is a category folder
          const categoryInfo = await this.getCategoryInfo(octokit, selectedRepo.owner.login, selectedRepo.name, item.path);
          
          // Get the contents of the topics folder within this category
          const topicsPath = `${item.path}/topics`;
          try {
            const topicsResponse = await octokit.repos.getContent({
              owner: selectedRepo.owner.login,
              repo: selectedRepo.name,
              path: topicsPath,
              ref: selectedBranch
            });
            
            if (Array.isArray(topicsResponse.data)) {
              // Process each lesson plan in the topics folder
              for (const topicFile of topicsResponse.data) {
                if (topicFile.type === 'file' && topicFile.name.endsWith('.md')) {
                  lessonPlans.push({
                    name: topicFile.name,
                    path: topicFile.path,
                    sha: topicFile.sha,
                    content: topicFile.content || null,
                    decoded_content: topicFile.content ? Buffer.from(topicFile.content, 'base64').toString('utf-8') : null,
                    html_url: topicFile.html_url || '',
                    category: categoryInfo
                  });
                }
              }
            }
          } catch (error) {
            console.warn(`Topics folder not found in ${item.path} or error accessing it:`, error);
            // Continue with other categories even if one fails
          }
        } else if (item.type === 'file' && item.name.endsWith('.md') && item.name !== 'index.md') {
          // Also include any markdown files directly in the _lesson-plans folder (except index.md)
          lessonPlans.push({
            name: item.name,
            path: item.path,
            sha: item.sha,
            content: item.content || null,
            decoded_content: item.content ? Buffer.from(item.content, 'base64').toString('utf-8') : null,
            html_url: item.html_url || ''
          });
        }
      }
      
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

  /**
   * Parse category information from index.md file
   */
  private async getCategoryInfo(
    octokit: Octokit,
    owner: string,
    repo: string,
    categoryPath: string
  ): Promise<{ title: string; number: number } | undefined> {
    try {
      // Try to get the index.md file in the category folder
      const indexResponse = await octokit.repos.getContent({
        owner,
        repo,
        path: `${categoryPath}/index.md`,
        ref: githubRepoService.getSelectedBranch() || githubRepoService.getSelectedRepo()?.default_branch
      });
      
      if ('content' in indexResponse.data && typeof indexResponse.data.content === 'string') {
        const content = Buffer.from(indexResponse.data.content, 'base64').toString('utf-8');
        
        // Parse the frontmatter
        const titleMatch = content.match(/title:\s*([^\n]+)/i);
        const numberMatch = content.match(/number:\s*(\d+)/i);
        
        if (titleMatch && numberMatch) {
          return {
            title: titleMatch[1].trim(),
            number: parseInt(numberMatch[1].trim(), 10)
          };
        }
      }
      
      return undefined;
    } catch (error) {
      console.warn(`No index.md found in ${categoryPath} or error parsing it:`, error);
      return undefined;
    }
  }
  
  /**
   * Get a specific lesson plan by path
   */
  async getLessonPlan(path: string): Promise<LessonPlan> {
    // Check if we have a GitHub token
    if (!sessionStorage.getItem('github_oauth_token')) {
      throw new Error('Not authenticated with GitHub');
    }

    const repo = githubRepoService.getSelectedRepo();
    if (!repo) {
      throw new Error('No repository selected');
    }

    try {
      const octokit = new Octokit({ auth: sessionStorage.getItem('github_oauth_token') });
      
      const response = await octokit.repos.getContent({
        owner: repo.owner.login,
        repo: repo.name,
        path,
        ref: githubRepoService.getSelectedBranch() || repo.default_branch
      });
      
      if (Array.isArray(response.data)) {
        throw new Error('Expected a file, got a directory');
      }
      
      const file = response.data;
      // Handle the content safely with type checking
      let fileContent: string | null = null;
      if ('content' in file && typeof file.content === 'string') {
        fileContent = file.content;
      }
      
      const decodedContent = fileContent ? Buffer.from(fileContent, 'base64').toString('utf-8') : null;
      
      const lessonPlan: LessonPlan = {
        name: file.name,
        path: file.path,
        sha: file.sha,
        content: fileContent,
        decoded_content: decodedContent,
        html_url: file.html_url || ''
      };
      
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
    sessionStorage.setItem(SELECTED_LESSON_PLAN_KEY, JSON.stringify(lessonPlan));
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
    sessionStorage.removeItem(SELECTED_LESSON_PLAN_KEY);
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
