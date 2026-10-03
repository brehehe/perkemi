<?php

namespace App\Http\Requests\Admin\Event;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEventFeesRequest extends FormRequest
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
            'is_paid' => ['required', 'boolean'],
            'fee_per_contingent' => [Rule::requiredIf(fn (): bool => $this->boolean('is_paid')), 'nullable', 'numeric', 'min:0'],
            'fee_per_athlete' => [Rule::requiredIf(fn (): bool => $this->boolean('is_paid')), 'nullable', 'numeric', 'min:0'],
            'payment_method_ids' => ['nullable', 'array'],
            'payment_method_ids.*' => ['uuid', 'distinct', 'exists:payment_methods,id'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if (! $this->has('is_paid')) {
            $this->merge(['is_paid' => $this->route('event')?->is_paid ?? true]);
        }
    }
}
