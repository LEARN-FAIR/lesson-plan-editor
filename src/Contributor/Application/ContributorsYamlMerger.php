<?php

namespace App\Contributor\Application;

use Symfony\Component\Yaml\Yaml;

/**
 * Merges custom (client-provided) contributors into the repository's
 * _data/contributors.yaml content. Extracted verbatim from the previous
 * LessonPlanController so the save-with-contributors behaviour is unchanged.
 */
final class ContributorsYamlMerger
{
    /**
     * @param array<int, array<string, mixed>> $customContributors
     */
    public function merge(array $customContributors, string $existingYaml): string
    {
        $existingData = [];
        if (!empty($existingYaml)) {
            try {
                $existingData = Yaml::parse($existingYaml) ?? [];
            } catch (\Exception $e) {
                $existingData = [];
            }
        }

        if (!is_array($existingData)) {
            $existingData = [];
        }

        // Convert an associative (id-keyed) map to a sequential list.
        if (!empty($existingData) && array_keys($existingData) !== range(0, count($existingData) - 1)) {
            $sequential = [];
            foreach ($existingData as $id => $data) {
                $data['id'] = $id;
                $sequential[] = $data;
            }
            $existingData = $sequential;
        }

        $existingMap = [];
        foreach ($existingData as $index => $contributor) {
            if (isset($contributor['id'])) {
                $existingMap[$contributor['id']] = $index;
            }
        }

        foreach ($customContributors as $contributor) {
            $id = $contributor['id'] ?? '';
            if (!empty($id)) {
                $contributorData = [
                    'id' => $id,
                    'orcid' => $contributor['orcid'] ?? null,
                    'firstName' => $contributor['firstName'] ?? '',
                    'lastName' => $contributor['lastName'] ?? '',
                    'git' => $contributor['git'] ?? null,
                ];

                if (isset($existingMap[$id])) {
                    $existingData[$existingMap[$id]] = $contributorData;
                } else {
                    $existingData[] = $contributorData;
                }
            }
        }

        return Yaml::dump($existingData, 3, 2);
    }
}
