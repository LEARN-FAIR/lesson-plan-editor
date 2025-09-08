import {useQuery} from '@tanstack/react-query';
import lessonPlanService, {LessonPlan} from './lessonPlanService';
import githubRepoService from './githubRepoService';
import githubService from './githubService';
import fileContentCache from './fileContentCache';

/**
 * React Query hook to fetch lesson plan content
 * @param filePath Path to the markdown file
 * @returns Query result with lesson plan content
 */
export const useLessonPlanContent = (filePath: string) => {
    // Get the selected repository and branch
    const repo = githubRepoService.getSelectedRepo();
    const branch = githubRepoService.getSelectedBranch() || (repo?.default_branch || '');
    
    return useQuery<LessonPlan, Error>({
        queryKey: ['lessonPlanContent', filePath],
        queryFn: async () => {
            // Check if we already have this content in the cache
            if (repo && filePath && branch) {
                try {
                    // Try to get the content from the cache first
                    // This will prevent duplicate API calls
                    await fileContentCache.getFileContent(
                        repo.owner.login,
                        repo.name,
                        filePath,
                        branch
                    );
                } catch (error) {
                    console.warn('Error pre-fetching file content for lesson plan:', error);
                    // Continue with normal flow if pre-fetch fails
                }
            }
            
            // Get the lesson plan through the normal service
            return lessonPlanService.getLessonPlan(filePath);
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        enabled: !!filePath, // Only fetch when filePath is provided
    });
};

/**
 * React Query hook to fetch all lesson plans
 * @returns Query result with all lesson plans
 */
export const useLessonPlans = () => {
    // Check if a repository is selected
    const hasRepo = githubRepoService.hasSelectedRepo();
    const selectedRepo = githubRepoService.getSelectedRepo();
    const selectedBranch = githubRepoService.getSelectedBranch();

    return useQuery<LessonPlan[], Error>({
        queryKey: ['lessonPlans', selectedRepo?.full_name, selectedBranch],
        queryFn: () => {
            if (!hasRepo) {
                // Return empty array instead of throwing an error
                return Promise.resolve([]);
            }
            return lessonPlanService.getLessonPlans();
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        enabled: githubService.isAuthenticated(), // Only run if authenticated
    });
};
