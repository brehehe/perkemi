<?php

namespace App\Http\Requests\Admin\Event;

use App\Enums\EventStatus;
use App\Models\Event;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEventGeneralRequest extends FormRequest
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
        /** @var Event|null $event */
        $event = $this->route('event');

        return [
            'name' => ['required', 'string', 'max:255'],
            'slug' => [
                'nullable',
                'string',
                'max:100',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('events', 'slug')->ignore($event),
            ],
            'edition' => ['nullable', 'string', 'max:100'],
            'organizer' => ['nullable', 'string', 'max:255'],
            'venue' => ['required', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:100'],
            'province' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'contact_person' => ['nullable', 'string', 'max:100'],
            'contact_phone' => ['nullable', 'string', 'max:50'],
            'tenant_subdomain' => [
                'nullable',
                'string',
                'max:63',
                'regex:/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/',
                Rule::unique('events', 'tenant_subdomain')->ignore($event),
            ],
            'max_match_categories_per_athlete' => ['sometimes', 'integer', 'min:1', 'max:20'],
            'allow_cross_age_group_embu' => ['sometimes', 'boolean'],
            'status' => ['required', Rule::enum(EventStatus::class)],
            'is_active' => ['boolean'],
        ];
    }
}
