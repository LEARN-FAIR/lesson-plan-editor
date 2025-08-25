import { useQuery } from '@tanstack/react-query';
import lessonPlanService, { LessonPlan } from './lessonPlanService';

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
  return useQuery<LessonPlan[], Error>({
    queryKey: ['lessonPlans'],
    queryFn: () => lessonPlanService.getLessonPlans(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: true, // Always fetch when component mounts
  });
};
