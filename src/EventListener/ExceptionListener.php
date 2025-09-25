<?php

namespace App\EventListener;

use Psr\Log\LoggerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

class ExceptionListener
{
    private LoggerInterface $logger;
    private bool $debug;

    public function __construct(LoggerInterface $logger, bool $debug = false)
    {
        $this->logger = $logger;
        $this->debug = $debug;
    }

    public function onKernelException(ExceptionEvent $event): void
    {
        $exception = $event->getThrowable();
        $request = $event->getRequest();
        
        // Only handle JSON requests
        if ($request->getContentType() !== 'json' && !$request->isXmlHttpRequest() && 
            !str_starts_with($request->getPathInfo(), '/api/')) {
            return;
        }

        // Log the exception
        $this->logger->error('Exception occurred: ' . $exception->getMessage(), [
            'exception' => $exception,
            'path' => $request->getPathInfo(),
            'method' => $request->getMethod(),
        ]);

        // Determine status code
        $statusCode = Response::HTTP_INTERNAL_SERVER_ERROR;
        if ($exception instanceof HttpExceptionInterface) {
            $statusCode = $exception->getStatusCode();
        } elseif ($exception instanceof AccessDeniedException) {
            $statusCode = Response::HTTP_FORBIDDEN;
        }

        // Create response data
        $responseData = [
            'error' => true,
            'message' => $this->getExceptionMessage($exception, $statusCode),
        ];

        // Add debug information if in debug mode
        if ($this->debug) {
            $responseData['exception'] = [
                'class' => get_class($exception),
                'message' => $exception->getMessage(),
                'code' => $exception->getCode(),
                'file' => $exception->getFile(),
                'line' => $exception->getLine(),
                'trace' => $exception->getTraceAsString(),
            ];
        }

        // Create and set the response
        $response = new JsonResponse($responseData, $statusCode);
        $event->setResponse($response);
    }

    private function getExceptionMessage(\Throwable $exception, int $statusCode): string
    {
        if ($exception instanceof HttpExceptionInterface || $exception instanceof AccessDeniedException) {
            return $exception->getMessage();
        }

        // For security reasons, don't expose internal error messages in production
        if (!$this->debug && $statusCode >= 500) {
            return 'An unexpected error occurred. Please try again later.';
        }

        return $exception->getMessage();
    }
}
