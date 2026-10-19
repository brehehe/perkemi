<?php

namespace App\Http\Requests\Admin\Event;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class SaveEventAgeCategoryRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'min_age' => ['nullable', 'integer', 'min:1', 'max:100'],
            'max_age' => ['nullable', 'integer', 'min:1', 'max:100'],
            'fee' => ['required', 'numeric', 'min:0'],
            'description' => ['nullable', 'string', 'max:500'],
            'order' => ['nullable', 'integer'],
            'is_active' => ['boolean'],
        ];
    }

    /**
     * Configure the validator instance.
     *
     * @return array<int, \Closure(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($this->filled(['min_age', 'max_age']) && (int) $this->input('min_age') > (int) $this->input('max_age')) {
                    $validator->errors()->add('max_age', 'Batas usia maksimal harus lebih besar atau sama dengan usia minimal.');
                }
            },
        ];
    }
}
