import {QueryClient} from '@tanstack/react-query';

// Create a client
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes (garbage collection time)
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});

export default queryClient;
