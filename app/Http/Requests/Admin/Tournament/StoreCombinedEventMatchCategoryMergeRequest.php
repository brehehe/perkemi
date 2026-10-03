<?php

namespace App\Http\Requests\Admin\Tournament;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreCombinedEventMatchCategoryMergeRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'combined_name' => ['required', 'string', 'max:255'],
            'source_category_ids' => ['required', 'array', 'min:2'],
            'source_category_ids.*' => ['required', 'uuid', 'distinct'],
        ];
    }
}
