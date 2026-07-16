<?php

namespace App\LessonPlan\Infrastructure\ApiPlatform\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Auth\Infrastructure\GithubSession;
use App\Contributor\Application\ContributorsYamlMerger;
use App\LessonPlan\Infrastructure\ApiPlatform\Resource\LessonPlanSaveOutput;
use App\LessonPlan\Infrastructure\ApiPlatform\Resource\SaveLessonPlanInput;
use App\Service\GitHubService;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

/**
 * Commits a lesson plan (POST /api/lesson-plans/file), optionally committing an
 * updated _data/contributors.yaml in the same commit when custom contributors
 * are supplied.
 *
 * @implements ProcessorInterface<SaveLessonPlanInput, LessonPlanSaveOutput>
 */
final class LessonPlanSaveProcessor implements ProcessorInterface
{
    private const CONTRIBUTORS_PATH = '_data/contributors.yaml';

    public function __construct(
        private readonly GitHubService $githubService,
        private readonly GithubSession $session,
        private readonly ContributorsYamlMerger $merger,
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): LessonPlanSaveOutput
    {
        \assert($data instanceof SaveLessonPlanInput);

        if (!$data->owner || !$data->repo || !$data->path || !$data->content) {
            throw new BadRequestHttpException('Owner, repo, path, and content are required');
        }

        $token = $this->session->requireToken();

        if (!empty($data->customContributors)) {
            $existingYaml = $this->fetchExistingContributors($token, $data->owner, $data->repo, $data->branch);
            $yamlContent = $this->merger->merge($data->customContributors, $existingYaml);

            $result = $this->githubService->commitMultipleFiles(
                $token,
                $data->owner,
                $data->repo,
                [
                    ['path' => $data->path, 'content' => $data->content],
                    ['path' => self::CONTRIBUTORS_PATH, 'content' => $yamlContent],
                ],
                $data->commitMessage,
                $data->branch,
            );
        } else {
            $result = $this->githubService->commitFile(
                $token,
                $data->owner,
                $data->repo,
                $data->path,
                $data->content,
                $data->commitMessage,
                $data->sha,
                $data->branch,
            );
        }

        $output = new LessonPlanSaveOutput();
        $output->content = $result['content'] ?? null;
        $output->commit = $result['commit'] ?? [];

        return $output;
    }

    private function fetchExistingContributors(string $token, string $owner, string $repo, ?string $branch): string
    {
        try {
            $response = $this->githubService->getFileContent($token, $owner, $repo, self::CONTRIBUTORS_PATH, $branch);

            return $response['content'] ?? '';
        } catch (\Exception $e) {
            return '';
        }
    }
}
