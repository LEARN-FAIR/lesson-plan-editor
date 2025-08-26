import {useQuery} from '@tanstack/react-query';
import lessonPlanService, {LessonPlan} from './lessonPlanService';
import githubRepoService from './githubRepoService';

/**
 * React Query hook to fetch lesson plan content
 * @param filePath Path to the markdown file
 * @returns Query result with lesson plan content
 */
export const useLessonPlanContent = (filePath: string) => {
    return useQuery<LessonPlan, Error>({
        queryKey: ['lessonPlanContent', filePath],
        queryFn: () => lessonPlanService.getLessonPlan(filePath),
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
        enabled: !!localStorage.getItem('github_oauth_token'), // Only run if authenticated
    });
};
