<?php

namespace App\Http\Requests\Admin\Event;

use App\Enums\EventStatus;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEventRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'edition' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'venue' => ['required', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:255'],
            'province' => ['nullable', 'string', 'max:255'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'registration_start' => ['nullable', 'date'],
            'registration_end' => ['nullable', 'date'],
            'is_paid' => ['required', 'boolean'],
            'fee_per_athlete' => [Rule::requiredIf(fn (): bool => $this->boolean('is_paid')), 'nullable', 'numeric', 'min:0'],
            'fee_per_contingent' => ['nullable', 'numeric', 'min:0'],
            'status' => ['required', Rule::enum(EventStatus::class)],
            'is_active' => ['boolean'],
            'organizer' => ['nullable', 'string', 'max:255'],
            'contact_person' => ['nullable', 'string', 'max:255'],
            'contact_phone' => ['nullable', 'string', 'max:50'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if (! $this->has('is_paid')) {
            $this->merge(['is_paid' => true]);
        }
    }
}
