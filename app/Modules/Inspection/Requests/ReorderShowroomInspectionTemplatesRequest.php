<?php

declare(strict_types=1);

namespace App\Modules\Inspection\Requests;

use App\Core\Validation\FormRequest;

class ReorderShowroomInspectionTemplatesRequest extends FormRequest
{
    protected function rules(): array
    {
        return [
            'sections' => 'required|array',
        ];
    }

    protected function data(): array
    {
        return [
            'sections' => $this->request->input('sections'),
        ];
    }

    protected function after(array $data, array &$errors): void
    {
        $sections = $data['sections'] ?? null;
        if (! is_array($sections) || $sections === []) {
            $errors['sections'] = 'Daftar urutan section wajib diisi.';
            return;
        }

        $seenCategories = [];
        $seenTemplateIds = [];
        foreach ($sections as $sectionIndex => $section) {
            if (! is_array($section)) {
                $errors['sections.' . $sectionIndex] = 'Setiap urutan section harus berupa object.';
                continue;
            }

            $categoryName = $section['category_name'] ?? null;
            if (! is_string($categoryName) || trim($categoryName) === '' || strlen($categoryName) > 100) {
                $errors['sections.' . $sectionIndex . '.category_name'] = 'Nama section wajib berupa teks maksimal 100 karakter.';
            } elseif (isset($seenCategories[$categoryName])) {
                $errors['sections.' . $sectionIndex . '.category_name'] = 'Nama section tidak boleh berulang.';
            } else {
                $seenCategories[$categoryName] = true;
            }

            $templateIds = $section['template_ids'] ?? null;
            if (! is_array($templateIds) || $templateIds === []) {
                $errors['sections.' . $sectionIndex . '.template_ids'] = 'Setiap section wajib memiliki daftar item.';
                continue;
            }

            foreach ($templateIds as $templateIndex => $templateId) {
                $validatedId = filter_var($templateId, FILTER_VALIDATE_INT);
                if ($validatedId === false || $validatedId < 1) {
                    $errors['sections.' . $sectionIndex . '.template_ids.' . $templateIndex] = 'ID item inspeksi harus berupa bilangan bulat positif.';
                    continue;
                }

                if (isset($seenTemplateIds[$validatedId])) {
                    $errors['sections.' . $sectionIndex . '.template_ids.' . $templateIndex] = 'Setiap item inspeksi hanya boleh muncul sekali.';
                    continue;
                }

                $seenTemplateIds[$validatedId] = true;
            }
        }
    }
}
